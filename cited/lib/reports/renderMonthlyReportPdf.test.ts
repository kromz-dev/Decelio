import { describe, it, expect } from 'vitest';
import {
  renderMonthlyReportPdf,
  buildReportSections,
  resolveAccentColor,
  resolveBrandName,
  DEFAULT_ACCENT_COLOR,
  DEFAULT_BRAND_NAME,
  SECTION_TITLES,
  type MonthlyReportData,
} from './renderMonthlyReportPdf';

// Données figées représentant un client avec deux sites, un historique et un
// incident résolu — utilisées par tous les tests de ce fichier.
const fixedData: MonthlyReportData = {
  period: { start: '2026-08-01T00:00:00.000Z', end: '2026-08-31T00:00:00.000Z' },
  clientName: 'Atelier Boréal (fixture de test)',
  sites: [
    {
      name: 'atelier-boreal.fr',
      url: 'https://atelier-boreal.fr',
      currentStatus: 'OK',
      availabilityPct: 98.5,
      degradedDays: 0,
    },
    {
      name: 'boutique.atelier-boreal.fr',
      url: 'https://boutique.atelier-boreal.fr',
      currentStatus: 'BLOQUÉ',
      availabilityPct: 74.2,
      degradedDays: 6,
    },
  ],
  history: [
    {
      site: 'atelier-boreal.fr',
      entries: [
        { date: '2026-08-01T00:00:00.000Z', status: 'OK' },
        { date: '2026-08-15T00:00:00.000Z', status: 'COQUILLE VIDE' },
        { date: '2026-08-20T00:00:00.000Z', status: 'OK' },
      ],
    },
  ],
  incidents: [
    {
      site: 'atelier-boreal.fr',
      type: 'REGRESSION',
      cause: 'robots.txt interdit GPTBot',
      fix: 'Autoriser GPTBot dans robots.txt',
      occurredAt: '2026-08-15T00:00:00.000Z',
    },
    {
      site: 'atelier-boreal.fr',
      type: 'RESOLUTION',
      cause: 'robots.txt corrigé',
      occurredAt: '2026-08-20T00:00:00.000Z',
    },
  ],
  technicalAppendix: [
    {
      site: 'atelier-boreal.fr',
      entries: [
        { bot: 'GPTBot', lastHttpStatus: 200, robotsRule: 'Allow: /', cause: null },
        { bot: 'ClaudeBot', lastHttpStatus: 403, robotsRule: 'Disallow: /', cause: 'robots.txt bloque ClaudeBot' },
      ],
    },
  ],
};

const emptyIncidentsData: MonthlyReportData = { ...fixedData, incidents: [] };

describe('renderMonthlyReportPdf', () => {
  it('produces a Buffer that starts with the PDF magic bytes', async () => {
    const buffer = await renderMonthlyReportPdf(fixedData);

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.subarray(0, 4).toString('utf-8')).toBe('%PDF');
  });

  it('generates a PDF for a client with no incidents this month', async () => {
    const buffer = await renderMonthlyReportPdf(emptyIncidentsData);

    expect(buffer.subarray(0, 4).toString('utf-8')).toBe('%PDF');
  });

  it('generates a PDF when branding is omitted', async () => {
    const buffer = await renderMonthlyReportPdf(fixedData);

    expect(buffer.subarray(0, 4).toString('utf-8')).toBe('%PDF');
  });

  it('generates a PDF when branding is provided with a valid accent color', async () => {
    const buffer = await renderMonthlyReportPdf(fixedData, {
      name: 'Agence Fixture',
      accentColor: '#2b55d0',
    });

    expect(buffer.subarray(0, 4).toString('utf-8')).toBe('%PDF');
  });

  it('generates a PDF even when the accent color is invalid', async () => {
    const buffer = await renderMonthlyReportPdf(fixedData, {
      name: 'Agence Fixture',
      accentColor: 'not-a-color',
    });

    expect(buffer.subarray(0, 4).toString('utf-8')).toBe('%PDF');
  });

  it('produces a Buffer containing the PDF EOF marker %%EOF', async () => {
    const buffer = await renderMonthlyReportPdf(fixedData);

    expect(buffer.toString('latin1')).toContain('%%EOF');
  });

  it('generates a PDF when report data is completely empty (zero sites)', async () => {
    const emptyData: MonthlyReportData = {
      period: { start: '2026-08-01T00:00:00.000Z', end: '2026-08-31T00:00:00.000Z' },
      clientName: 'Client Sans Site',
      sites: [],
      history: [],
      incidents: [],
      technicalAppendix: [],
    };
    const buffer = await renderMonthlyReportPdf(emptyData);

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.subarray(0, 4).toString('utf-8')).toBe('%PDF');
    expect(buffer.length).toBeGreaterThan(1000);
  });

  it('generates a PDF for a single-site client', async () => {
    const singleSiteData: MonthlyReportData = {
      period: { start: '2026-08-01T00:00:00.000Z', end: '2026-08-31T00:00:00.000Z' },
      clientName: 'Solo Site Client',
      sites: [
        {
          name: 'solo.example.com',
          url: 'https://solo.example.com',
          currentStatus: 'OK',
          availabilityPct: 100,
          degradedDays: 0,
        },
      ],
      history: [
        {
          site: 'solo.example.com',
          entries: [{ date: '2026-08-15T00:00:00.000Z', status: 'OK' }],
        },
      ],
      incidents: [],
      technicalAppendix: [
        {
          site: 'solo.example.com',
          entries: [{ bot: 'GPTBot', lastHttpStatus: 200, robotsRule: 'Allow: /', cause: null }],
        },
      ],
    };
    const buffer = await renderMonthlyReportPdf(singleSiteData);

    expect(buffer.subarray(0, 4).toString('utf-8')).toBe('%PDF');
  });

  it('generates a PDF covering all possible verdict statuses', async () => {
    const statuses: Array<'OK' | 'BLOQUÉ' | 'COQUILLE VIDE' | 'ERREUR' | 'INCONNU'> = [
      'OK',
      'BLOQUÉ',
      'COQUILLE VIDE',
      'ERREUR',
      'INCONNU',
    ];
    const multiStatusData: MonthlyReportData = {
      ...fixedData,
      sites: statuses.map((status, idx) => ({
        name: `site-${idx}.example.com`,
        url: `https://site-${idx}.example.com`,
        currentStatus: status,
        availabilityPct: 50 + idx * 10,
        degradedDays: idx,
      })),
      history: statuses.map((status, idx) => ({
        site: `site-${idx}.example.com`,
        entries: [{ date: '2026-08-01T00:00:00.000Z', status }],
      })),
    };
    const buffer = await renderMonthlyReportPdf(multiStatusData);

    expect(buffer.subarray(0, 4).toString('utf-8')).toBe('%PDF');
  });

  it('generates a PDF with technical entries containing null fields', async () => {
    const nullFieldsData: MonthlyReportData = {
      ...fixedData,
      technicalAppendix: [
        {
          site: 'atelier-boreal.fr',
          entries: [
            { bot: 'UnknownBot', lastHttpStatus: null, robotsRule: null, cause: null },
          ],
        },
      ],
    };
    const buffer = await renderMonthlyReportPdf(nullFieldsData);

    expect(buffer.subarray(0, 4).toString('utf-8')).toBe('%PDF');
  });

  it('generates a PDF when strings contain special characters, accents and ampersands', async () => {
    const specialCharsData: MonthlyReportData = {
      period: { start: '2026-08-01T00:00:00.000Z', end: '2026-08-31T00:00:00.000Z' },
      clientName: "L'Ébénisterie & Café « Le Chêne » <script>alert(1)</script>",
      sites: [
        {
          name: 'ébénisterie-café.fr & fils',
          url: 'https://xn--bnisterie-caf-4qba.fr?ref=test&utm_source=ia',
          currentStatus: 'OK',
          availabilityPct: 99.9,
          degradedDays: 0,
        },
      ],
      history: [
        {
          site: 'ébénisterie-café.fr & fils',
          entries: [{ date: '2026-08-15T00:00:00.000Z', status: 'OK' }],
        },
      ],
      incidents: [
        {
          site: 'ébénisterie-café.fr & fils',
          type: 'REGRESSION',
          cause: 'Erreur 500 & blocage d\'accès Cloudflare « WAF »',
          fix: 'Débloquer l\'agent dans les règles d\'accès & réessayer',
          occurredAt: '2026-08-10T00:00:00.000Z',
        },
      ],
      technicalAppendix: [
        {
          site: 'ébénisterie-café.fr & fils',
          entries: [
            {
              bot: 'GPTBot 1.0 (OpenAI)',
              lastHttpStatus: 200,
              robotsRule: 'Allow: /boutique & /catalogue',
              cause: 'Aucun blocage constaté — tout est au « vert »',
            },
          ],
        },
      ],
    };
    const buffer = await renderMonthlyReportPdf(specialCharsData);

    expect(buffer.subarray(0, 4).toString('utf-8')).toBe('%PDF');
  });

  it('generates a PDF with 3-digit hex accent color', async () => {
    const buffer = await renderMonthlyReportPdf(fixedData, {
      name: 'Agence 3-Hex',
      accentColor: '#36f',
    });

    expect(buffer.subarray(0, 4).toString('utf-8')).toBe('%PDF');
  });

  it('generates a PDF with whitespace-padded hex accent color', async () => {
    const buffer = await renderMonthlyReportPdf(fixedData, {
      name: 'Agence Trim',
      accentColor: '  #2b55d0  ',
    });

    expect(buffer.subarray(0, 4).toString('utf-8')).toBe('%PDF');
  });
});

// @react-pdf/renderer compresse le flux PDF par défaut (`renderToBuffer`/
// `renderToStream` n'exposent aucune option publique pour désactiver la
// compression dans la version 4.9 installée), donc chercher les titres de
// section en texte brut dans le Buffer ci-dessus n'est pas fiable : on teste
// à la place la structure intermédiaire pure que le composant PDF consomme.
describe('buildReportSections', () => {
  it('lists the five sections in the required order', () => {
    const sections = buildReportSections(fixedData);

    expect(sections.map((s) => s.key)).toEqual([
      'cover',
      'currentVerdict',
      'history',
      'incidents',
      'technicalAppendix',
    ]);
    expect(sections.map((s) => s.title)).toEqual([
      SECTION_TITLES.cover,
      SECTION_TITLES.currentVerdict,
      SECTION_TITLES.history,
      SECTION_TITLES.incidents,
      SECTION_TITLES.technicalAppendix,
    ]);
  });

  it('marks the current verdict, history and technical appendix sections as non-empty for fixed data', () => {
    const sections = buildReportSections(fixedData);
    const byKey = Object.fromEntries(sections.map((s) => [s.key, s]));

    expect(byKey.currentVerdict.isEmpty).toBe(false);
    expect(byKey.history.isEmpty).toBe(false);
    expect(byKey.technicalAppendix.isEmpty).toBe(false);
  });

  it('marks the incidents section as empty when the incident list is empty', () => {
    const sections = buildReportSections(emptyIncidentsData);
    const incidentsSection = sections.find((s) => s.key === 'incidents')!;

    expect(incidentsSection.isEmpty).toBe(true);
  });

  it('marks the incidents section as non-empty when incidents are present', () => {
    const sections = buildReportSections(fixedData);
    const incidentsSection = sections.find((s) => s.key === 'incidents')!;

    expect(incidentsSection.isEmpty).toBe(false);
  });

  it('marks all sections except cover as empty when all collections are empty', () => {
    const emptyData: MonthlyReportData = {
      period: { start: '2026-08-01T00:00:00.000Z', end: '2026-08-31T00:00:00.000Z' },
      clientName: 'Client Vide',
      sites: [],
      history: [],
      incidents: [],
      technicalAppendix: [],
    };
    const sections = buildReportSections(emptyData);
    const byKey = Object.fromEntries(sections.map((s) => [s.key, s]));

    expect(byKey.cover.isEmpty).toBe(false);
    expect(byKey.currentVerdict.isEmpty).toBe(true);
    expect(byKey.history.isEmpty).toBe(true);
    expect(byKey.incidents.isEmpty).toBe(true);
    expect(byKey.technicalAppendix.isEmpty).toBe(true);
  });
});

describe('resolveBrandName', () => {
  it('returns "Cited" when branding is absent', () => {
    expect(resolveBrandName(undefined)).toBe(DEFAULT_BRAND_NAME);
    expect(resolveBrandName(undefined)).toBe('Cited');
  });

  it('returns the branding name when provided', () => {
    expect(resolveBrandName({ name: 'Agence Fixture' })).toBe('Agence Fixture');
  });

  it('trims leading and trailing whitespace from the brand name', () => {
    expect(resolveBrandName({ name: '  Studio Digitale  ' })).toBe('Studio Digitale');
  });

  it('falls back to default brand name when brand name is empty string or only whitespace', () => {
    expect(resolveBrandName({ name: '' })).toBe(DEFAULT_BRAND_NAME);
    expect(resolveBrandName({ name: '   ' })).toBe(DEFAULT_BRAND_NAME);
  });
});

describe('resolveAccentColor', () => {
  it('returns the default ink color when accentColor is absent', () => {
    expect(resolveAccentColor(undefined)).toBe(DEFAULT_ACCENT_COLOR);
  });

  it('returns a valid 6-digit hex color unchanged', () => {
    expect(resolveAccentColor('#2b55d0')).toBe('#2b55d0');
  });

  it('returns a valid 3-digit hex color unchanged', () => {
    expect(resolveAccentColor('#abc')).toBe('#abc');
  });

  it('falls back to the default color for an invalid value', () => {
    expect(resolveAccentColor('not-a-color')).toBe(DEFAULT_ACCENT_COLOR);
    expect(resolveAccentColor('red')).toBe(DEFAULT_ACCENT_COLOR);
    expect(resolveAccentColor('#12345')).toBe(DEFAULT_ACCENT_COLOR);
  });

  it('trims whitespace around a valid hex color', () => {
    expect(resolveAccentColor('  #2b55d0  ')).toBe('#2b55d0');
    expect(resolveAccentColor('  #abc  ')).toBe('#abc');
  });

  it('handles uppercase hex color', () => {
    expect(resolveAccentColor('#2B55D0')).toBe('#2B55D0');
    expect(resolveAccentColor('#ABC')).toBe('#ABC');
  });

  it('falls back to default color for empty or whitespace-only string', () => {
    expect(resolveAccentColor('')).toBe(DEFAULT_ACCENT_COLOR);
    expect(resolveAccentColor('   ')).toBe(DEFAULT_ACCENT_COLOR);
  });
});
