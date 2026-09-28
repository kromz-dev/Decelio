import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest";
import { getMonitoredSites, addMonitoredSite, addMonitoredSitesBulk, deleteMonitoredSite } from "./sites";

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(db)),
    user: {
      findUnique: vi.fn(),
    },
    $executeRaw: vi.fn(async () => 0),
    monitoredSite: {
      findMany: vi.fn(),
      create: vi.fn(),
      createManyAndReturn: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/scanner/crawler', () => ({
  assertSafeUrl: vi.fn(async (url: string) => url),
}));

vi.mock('@/lib/posthog-server', () => ({
  captureServerEvent: vi.fn(async () => undefined),
}));

vi.mock('@/inngest/client', () => ({
  inngest: {
    send: vi.fn(),
  },
}));

import { auth } from '@/auth';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { assertSafeUrl } from '@/lib/scanner/crawler';
import { captureServerEvent } from '@/lib/posthog-server';
import { inngest } from '@/inngest/client';
import type { Session } from 'next-auth';

// `auth` is exported by NextAuth v5 as an intersection of several call
// signatures (middleware, route handler, plain session getter, ...). This
// codebase only ever calls it with zero arguments to get the current
// session, so we narrow the mock to that specific overload rather than
// relying on `vi.mocked` picking a (mismatched) overload automatically.
type SessionGetter = () => Promise<Session | null>;
const mockedAuth = vi.mocked(auth as unknown as SessionGetter);

function fakeSession(userId: string): Session {
  return {
    user: { id: userId },
    expires: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  };
}

type MonitoredSites = Awaited<ReturnType<typeof db.monitoredSite.findMany>>;
type MaybeUser = Awaited<ReturnType<typeof db.user.findUnique>>;
type CreatedSite = Awaited<ReturnType<typeof db.monitoredSite.create>>;
type DeleteManyResult = Awaited<ReturnType<typeof db.monitoredSite.deleteMany>>;

describe('sites actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(assertSafeUrl).mockImplementation(async (url: string) => url);
  });

  afterEach(() => {
    vi.mocked(inngest.send).mockReset();
  });

  describe('getMonitoredSites', () => {
    it('returns error if no session', async () => {
      mockedAuth.mockResolvedValueOnce(null);
      const res = await getMonitoredSites();
      expect(res).toEqual({ error: 'Unauthorized' });
    });

    it('returns sites for logged in user', async () => {
      mockedAuth.mockResolvedValueOnce(fakeSession('user-1'));
      vi.mocked(db.monitoredSite.findMany).mockResolvedValueOnce([{ id: 'site-1' }] as unknown as MonitoredSites);

      const res = await getMonitoredSites();
      expect(res).toEqual({ data: [{ id: 'site-1' }] });
      expect(db.monitoredSite.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('addMonitoredSite', () => {
    it('returns error if no session', async () => {
      mockedAuth.mockResolvedValueOnce(null);
      const res = await addMonitoredSite({ name: 'Test', url: 'http://test.com' });
      expect(res).toEqual({ error: 'Unauthorized' });
    });

    it('returns error if user has no active subscription', async () => {
      mockedAuth.mockResolvedValueOnce(fakeSession('user-1'));
      vi.mocked(db.user.findUnique).mockResolvedValueOnce({ plan: 'FREE', stripeCurrentPeriodEnd: null } as unknown as MaybeUser);
      
      const res = await addMonitoredSite({ name: 'Test', url: 'http://test.com' });
      expect(res).toEqual({ error: 'Abonnement requis' });
      expect(db.monitoredSite.create).not.toHaveBeenCalled();
    });

    it('returns error if user subscription is expired', async () => {
      mockedAuth.mockResolvedValueOnce(fakeSession('user-1'));
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      vi.mocked(db.user.findUnique).mockResolvedValueOnce({ plan: 'PRO', stripeCurrentPeriodEnd: pastDate } as unknown as MaybeUser);
      
      const res = await addMonitoredSite({ name: 'Test', url: 'http://test.com' });
      expect(res).toEqual({ error: 'Abonnement requis' });
      expect(db.monitoredSite.create).not.toHaveBeenCalled();
    });

    it('returns error if user plan is FREE despite future period end date', async () => {
      mockedAuth.mockResolvedValueOnce(fakeSession('user-1'));
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      vi.mocked(db.user.findUnique).mockResolvedValueOnce({ plan: 'FREE', stripeCurrentPeriodEnd: futureDate } as unknown as MaybeUser);
      
      const res = await addMonitoredSite({ name: 'Test', url: 'http://test.com' });
      expect(res).toEqual({ error: 'Abonnement requis' });
      expect(db.monitoredSite.create).not.toHaveBeenCalled();
    });

    it('creates a site and revalidates path if subscription is active and plan is not FREE', async () => {
      mockedAuth.mockResolvedValueOnce(fakeSession('user-1'));
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      vi.mocked(db.user.findUnique).mockResolvedValueOnce({ plan: 'PRO', stripeCurrentPeriodEnd: futureDate } as unknown as MaybeUser);
      vi.mocked(db.monitoredSite.count).mockResolvedValueOnce(0);
      vi.mocked(db.monitoredSite.create).mockResolvedValueOnce({ id: 'site-1', name: 'Test' } as unknown as CreatedSite);

      const res = await addMonitoredSite({ name: 'Test', url: 'http://test.com' });

      expect(res).toEqual({ data: { id: 'site-1', name: 'Test' }, scanTriggered: true });
      // Le scan est asynchrone (Inngest, 2-3 s) : tant qu'il n'a pas tourné,
      // le site n'a jamais été vérifié. "ACTIVE" est traduit en verdict "Lu"
      // (lib/sites/site-status.ts), ce qui affichait un site lisible avant
      // toute preuve — faux positif interdit par la constitution (article I).
      // "À VÉRIFIER" retombe sur le verdict "Inconnu" par défaut.
      expect(db.monitoredSite.create).toHaveBeenCalledWith({
        data: {
          name: 'Test',
          url: 'http://test.com',
          userId: 'user-1',
          status: 'À VÉRIFIER',
        },
      });
      expect(revalidatePath).toHaveBeenCalledWith('/dashboard');
      expect(captureServerEvent).toHaveBeenCalledWith('user-1', 'site_added', {
        count: 1,
        total_sites: 1,
        is_first_site: true,
      });
    });

    it("envoie app/scan.site avec l'identifiant déterministe scan-site-<id> (T091)", async () => {
      mockedAuth.mockResolvedValueOnce(fakeSession('user-1'));
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      vi.mocked(db.user.findUnique).mockResolvedValueOnce({ plan: 'PRO', stripeCurrentPeriodEnd: futureDate } as unknown as MaybeUser);
      vi.mocked(db.monitoredSite.count).mockResolvedValueOnce(0);
      vi.mocked(db.monitoredSite.create).mockResolvedValueOnce({ id: 'site-1', name: 'Test' } as unknown as CreatedSite);
      vi.mocked(inngest.send).mockResolvedValueOnce(undefined as never);

      const res = await addMonitoredSite({ name: 'Test', url: 'http://test.com' });

      expect(inngest.send).toHaveBeenCalledTimes(1);
      expect(inngest.send).toHaveBeenCalledWith([
        { name: 'app/scan.site', id: 'scan-site-site-1', data: { siteId: 'site-1' } },
      ]);
      expect(res).toMatchObject({ scanTriggered: true });
    });

    it("crée le site meme si l'envoi Inngest rejette, et le dit honnêtement (scanTriggered: false)", async () => {
      mockedAuth.mockResolvedValueOnce(fakeSession('user-1'));
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      vi.mocked(db.user.findUnique).mockResolvedValueOnce({ plan: 'PRO', stripeCurrentPeriodEnd: futureDate } as unknown as MaybeUser);
      vi.mocked(db.monitoredSite.count).mockResolvedValueOnce(0);
      vi.mocked(db.monitoredSite.create).mockResolvedValueOnce({ id: 'site-1', name: 'Test' } as unknown as CreatedSite);
      vi.mocked(inngest.send).mockRejectedValueOnce(new Error('INNGEST_SIGNING_KEY absente'));

      const res = await addMonitoredSite({ name: 'Test', url: 'http://test.com' });

      expect(res).toEqual({ data: { id: 'site-1', name: 'Test' }, scanTriggered: false });
      expect(db.monitoredSite.create).toHaveBeenCalledTimes(1);
    });

    it("n'émet pas site_added quand le quota est atteint", async () => {
      mockedAuth.mockResolvedValueOnce(fakeSession('user-1'));
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      vi.mocked(db.user.findUnique).mockResolvedValueOnce({ plan: 'SOLO', stripeCurrentPeriodEnd: futureDate } as unknown as MaybeUser);
      vi.mocked(db.monitoredSite.count).mockResolvedValueOnce(10);

      await addMonitoredSite({ name: 'Onzième', url: 'https://test.com' });

      expect(captureServerEvent).not.toHaveBeenCalled();
    });

    it('refuse un 11e site Freelance et nomme le palier Agence', async () => {
      mockedAuth.mockResolvedValueOnce(fakeSession('user-1'));
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      vi.mocked(db.user.findUnique).mockResolvedValueOnce({ plan: 'SOLO', stripeCurrentPeriodEnd: futureDate } as unknown as MaybeUser);
      vi.mocked(db.monitoredSite.count).mockResolvedValueOnce(10);

      const res = await addMonitoredSite({ name: 'Onzième', url: 'https://test.com' });

      expect(res).toEqual({
        error: 'Vous surveillez déjà 10 sites, le maximum du palier Freelance. Passez au palier Agence (30 sites) pour en ajouter.',
      });
      expect(db.monitoredSite.create).not.toHaveBeenCalled();
    });

    it('refuse un 31e site Agence et nomme le palier Studio', async () => {
      mockedAuth.mockResolvedValueOnce(fakeSession('user-1'));
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      vi.mocked(db.user.findUnique).mockResolvedValueOnce({ plan: 'PRO', stripeCurrentPeriodEnd: futureDate } as unknown as MaybeUser);
      vi.mocked(db.monitoredSite.count).mockResolvedValueOnce(30);

      const res = await addMonitoredSite({ name: 'Trente-et-unième', url: 'https://test.com' });

      expect(res).toEqual({
        error: 'Vous surveillez déjà 30 sites, le maximum du palier Agence. Passez au palier Studio (100 sites) pour en ajouter.',
      });
      expect(db.monitoredSite.create).not.toHaveBeenCalled();
    });

    it('refuse un 101e site Studio et indique le tarif au-delà', async () => {
      mockedAuth.mockResolvedValueOnce(fakeSession('user-1'));
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      vi.mocked(db.user.findUnique).mockResolvedValueOnce({ plan: 'SCALE', stripeCurrentPeriodEnd: futureDate } as unknown as MaybeUser);
      vi.mocked(db.monitoredSite.count).mockResolvedValueOnce(100);

      const res = await addMonitoredSite({ name: 'Cent-unième', url: 'https://test.com' });

      expect(res).toEqual({
        error: 'Vous surveillez déjà 100 sites, le maximum du palier Studio. Au-delà, chaque site coûte 2 € par mois : contactez-nous pour l\'activer.',
      });
      expect(db.monitoredSite.create).not.toHaveBeenCalled();
    });

    it('refuse une URL qui résout vers une IP privée et ne crée aucune ligne', async () => {
      mockedAuth.mockResolvedValueOnce(fakeSession('user-1'));
      vi.mocked(assertSafeUrl).mockRejectedValueOnce(new Error('Forbidden IP resolved: 10.0.0.1'));

      const res = await addMonitoredSite({ name: 'Interne', url: 'http://secret.internal' });

      expect(res).toEqual({ error: 'Forbidden IP resolved: 10.0.0.1' });
      expect(db.monitoredSite.create).not.toHaveBeenCalled();
      expect(db.user.findUnique).not.toHaveBeenCalled();
    });

    it('verrouille la ligne User avant de compter les sites', async () => {
      const order: string[] = [];
      mockedAuth.mockResolvedValueOnce(fakeSession('user-1'));
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      vi.mocked(db.user.findUnique).mockResolvedValueOnce({ plan: 'SOLO', stripeCurrentPeriodEnd: futureDate } as unknown as MaybeUser);
      const executeRaw = db.$executeRaw as unknown as Mock;
      executeRaw.mockImplementation(async () => {
        order.push('lock');
        return 0;
      });
      const count = db.monitoredSite.count as unknown as Mock;
      count.mockImplementationOnce(async () => {
        order.push('count');
        return 0;
      });
      vi.mocked(db.monitoredSite.create).mockResolvedValueOnce({ id: 'site-1' } as unknown as CreatedSite);

      await addMonitoredSite({ name: 'Test', url: 'https://test.com' });

      expect(order).toEqual(['lock', 'count']);
      const [strings, id] = executeRaw.mock.calls[0] as [string[], string];
      expect(strings.join('')).toContain('FOR UPDATE');
      expect(strings.join('')).toContain('"User"');
      expect(id).toBe('user-1');
    });
  });

  describe('deleteMonitoredSite', () => {
    it('returns error if no session', async () => {
      mockedAuth.mockResolvedValueOnce(null);
      const res = await deleteMonitoredSite('site-1');
      expect(res).toEqual({ error: 'Unauthorized' });
    });

    it('returns error if site not found or forbidden', async () => {
      mockedAuth.mockResolvedValueOnce(fakeSession('user-1'));
      vi.mocked(db.monitoredSite.deleteMany).mockResolvedValueOnce({ count: 0 } as unknown as DeleteManyResult);

      const res = await deleteMonitoredSite('site-1');
      expect(res).toEqual({ error: 'Site not found or forbidden' });
    });

    it('deletes site and revalidates path', async () => {
      mockedAuth.mockResolvedValueOnce(fakeSession('user-1'));
      vi.mocked(db.monitoredSite.deleteMany).mockResolvedValueOnce({ count: 1 } as unknown as DeleteManyResult);

      const result = await deleteMonitoredSite('site-1');
      
      expect(result).toEqual({ success: true });
      expect(db.monitoredSite.deleteMany).toHaveBeenCalledWith({ 
        where: { id: 'site-1', userId: 'user-1' } 
      });
      expect(revalidatePath).toHaveBeenCalledWith('/dashboard');
    });
  });

  describe('addMonitoredSitesBulk', () => {
    it('ajoute les 10 places restantes et explique les 15 lignes ignorées', async () => {
      mockedAuth.mockResolvedValueOnce(fakeSession('user-1'));
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      vi.mocked(db.user.findUnique).mockResolvedValueOnce({ plan: 'SOLO', stripeCurrentPeriodEnd: futureDate } as unknown as MaybeUser);
      vi.mocked(db.monitoredSite.findMany).mockResolvedValueOnce([] as unknown as MonitoredSites);
      vi.mocked(db.monitoredSite.createManyAndReturn).mockImplementation(((args: { data: { url: string }[] }) =>
        Promise.resolve(args.data.map((row) => ({ id: row.url })))) as unknown as typeof db.monitoredSite.createManyAndReturn);
      vi.mocked(assertSafeUrl).mockImplementation(async (url: string) => {
        if (url.includes('10.0.0.1') || url.includes('notaurl')) {
          throw new Error('URL refusée');
        }
        return url;
      });

      const lines = [
        ...Array.from({ length: 20 }, (_, i) => `https://ok${i + 1}.example`),
        'https://ok1.example',
        'https://ok2.example',
        'https://ok3.example',
        'http://10.0.0.1/secret',
        'notaurl',
      ];

      vi.mocked(inngest.send).mockResolvedValueOnce(undefined as never);

      const res = await addMonitoredSitesBulk(lines.join('\n'));

      expect(db.monitoredSite.create).not.toHaveBeenCalled();
      expect(db.monitoredSite.createManyAndReturn).toHaveBeenCalledTimes(1);
      const bulkData = vi.mocked(db.monitoredSite.createManyAndReturn).mock.calls[0]?.[0]?.data ?? [];
      const bulkRows = Array.isArray(bulkData) ? bulkData : [bulkData];
      expect(bulkRows).toHaveLength(10);
      // Même raison que pour addMonitoredSite : un site importé en masse n'a
      // pas non plus été scanné avant son premier passage Inngest.
      expect(bulkRows.every((row) => row.status === 'À VÉRIFIER')).toBe(true);
      expect(res).toMatchObject({ data: { skipped: expect.any(Array), scanTriggered: true } });
      if (!('data' in res) || !res.data) throw new Error('expected data');
      expect(res.data.created).toHaveLength(10);
      expect(res.data.skipped).toHaveLength(15);
      expect(res.data.skipped.filter((row) => row.reason === 'Doublon dans la liste.')).toHaveLength(3);
      expect(res.data.skipped.filter((row) => row.reason === 'URL refusée')).toHaveLength(2);
      expect(res.data.skipped.filter((row) => row.reason.includes('palier Freelance'))).toHaveLength(10);
      expect(captureServerEvent).toHaveBeenCalledWith('user-1', 'site_added', {
        count: 10,
        total_sites: 10,
        is_first_site: true,
      });
      // Un événement app/scan.site par site créé, aucun pour les 3 doublons ignorés.
      expect(inngest.send).toHaveBeenCalledTimes(1);
      expect(vi.mocked(inngest.send).mock.calls[0]?.[0]).toHaveLength(10);
    });

    it("n'envoie aucun événement Inngest quand triggerScan vaut false (appelé depuis l'onboarding)", async () => {
      mockedAuth.mockResolvedValueOnce(fakeSession('user-1'));
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      vi.mocked(db.user.findUnique).mockResolvedValueOnce({ plan: 'SOLO', stripeCurrentPeriodEnd: futureDate } as unknown as MaybeUser);
      vi.mocked(db.monitoredSite.findMany).mockResolvedValueOnce([] as unknown as MonitoredSites);
      vi.mocked(db.monitoredSite.createManyAndReturn).mockImplementation(((args: { data: { url: string }[] }) =>
        Promise.resolve(args.data.map((row) => ({ id: row.url })))) as unknown as typeof db.monitoredSite.createManyAndReturn);

      const res = await addMonitoredSitesBulk('https://ok1.example', { triggerScan: false });

      expect(inngest.send).not.toHaveBeenCalled();
      expect(res).toMatchObject({ data: { scanTriggered: false } });
    });

    it('ne crée aucun site quand la liste est vide (T051 : le champ onboarding démarre vide, jamais pré-rempli)', async () => {
      mockedAuth.mockResolvedValueOnce(fakeSession('user-1'));

      const res = await addMonitoredSitesBulk('');

      expect(db.monitoredSite.createManyAndReturn).not.toHaveBeenCalled();
      expect(res).toMatchObject({ data: { created: [], skipped: [] } });
      expect(captureServerEvent).not.toHaveBeenCalled();
    });
  });
});
