import { describe, expect, it } from 'vitest';
import zlib from 'node:zlib';
import { generateDiagnosticPdfBuffer } from './renderDiagnosticPdf';
import type { ScanReport, ScanCoreResult } from '../scanner/core';
import type { PlatformDetection } from '../scanner/platform';

/**
 * Rapport minimal mais complet, aligné sur la vraie forme de `ScanReport`
 * (contrairement aux fixtures `as never` de reportGeneration.e2e.test.ts,
 * qui testent la résilience du pipeline à un payload malformé plutôt que le
 * contenu réel du PDF).
 */
function makeReport(platform?: PlatformDetection): ScanReport {
  return {
    url: 'https://exemple.fr',
    finalUrl: 'https://exemple.fr/',
    scannedAt: '2026-09-24T10:00:00.000Z',
    robots: {
      url: 'https://exemple.fr/robots.txt',
      fetchStatus: 'ok',
      httpStatus: 200,
      path: '/',
      sitemaps: [],
      policies: [],
    },
    access: {
      risk: 'ok',
      httpStatus: 200,
      finalUrl: 'https://exemple.fr/',
      redirects: [],
      signals: [],
      durationMs: 120,
      userAgent: 'DecelioBot/1.0',
      unverifiedProbes: [],
    },
    jsDependency: {
      verdict: 'static',
      rawWordCount: 300,
      renderedWordCount: null,
      rawToRenderedRatio: null,
      hasAppRoot: false,
      renderer: 'none',
    },
    indexing: { sources: [], perBot: [] },
    platform,
  } as ScanReport;
}

function makeResult(overrides: Partial<ScanCoreResult> = {}): ScanCoreResult {
  return {
    agent: 'GPTBot',
    simpleStatus: 'OK',
    reasons: [],
    httpStatus: 200,
    durationMs: 120,
    wordCount: 300,
    ...overrides,
  };
}

async function pdfText(buffer: Buffer): Promise<string> {
  // @react-pdf/renderer produit un PDF compressé par défaut, mais le texte
  // brut passé aux <Text> reste identifiable dans les flux non compressés
  // du corps du document ; on se contente ici de vérifier la structure PDF
  // et la taille, comme le fait déjà reportGeneration.e2e.test.ts, plutôt que
  // de parser le PDF pour en extraire le texte.
  return buffer.toString('latin1');
}

/**
 * Extrait le texte réellement dessiné dans le PDF, pour les tests qui ont
 * besoin de vérifier une phrase précise (pas seulement la validité globale
 * du fichier). Les flux de contenu PDF sont compressés (FlateDecode) par
 * défaut ; une fois décompressés, `@react-pdf/renderer` écrit chaque
 * fragment de texte comme une chaîne hexadécimale `<...>` dans un opérateur
 * `TJ` (police Helvetica standard, non embarquée : un octet par caractère,
 * en WinAnsi/Latin-1). Concaténer ces chaînes hexadécimales décodées, dans
 * l'ordre d'apparition, reconstitue le texte visible sans avoir à interpréter
 * tout le langage de mise en page PDF.
 */
function extractPdfText(buffer: Buffer): string {
  const raw = buffer.toString('latin1');
  const streamRe = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let content = '';
  let streamMatch: RegExpExecArray | null;
  while ((streamMatch = streamRe.exec(raw))) {
    const chunk = Buffer.from(streamMatch[1], 'latin1');
    try {
      content += zlib.inflateSync(chunk).toString('latin1');
    } catch {
      content += chunk.toString('latin1');
    }
  }

  const hexStringRe = /<([0-9a-fA-F]+)>/g;
  let text = '';
  let hexMatch: RegExpExecArray | null;
  while ((hexMatch = hexStringRe.exec(content))) {
    text += Buffer.from(hexMatch[1], 'hex').toString('latin1');
  }
  return text;
}

describe('generateDiagnosticPdfBuffer', () => {
  it('génère un PDF valide quand aucun bot ne remonte de raison', async () => {
    const buffer = await generateDiagnosticPdfBuffer(makeReport(), [makeResult()]);
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.subarray(0, 4).toString('utf-8')).toBe('%PDF');
    expect((await pdfText(buffer)).includes('%%EOF')).toBe(true);
  });

  it('reste un PDF valide avec un mélange de causes reconnues et de raisons inconnues', async () => {
    const results: ScanCoreResult[] = [
      makeResult({
        agent: 'GPTBot',
        simpleStatus: 'BLOQUÉ',
        reasons: ['robots.txt disallows GPTBot'],
      }),
      makeResult({
        agent: 'ClaudeBot',
        simpleStatus: 'COQUILLE VIDE',
        reasons: ['likely_js_dependent: 4 words in raw HTML'],
      }),
      makeResult({
        agent: 'PerplexityBot',
        simpleStatus: 'ERREUR',
        // Format non produit par summarizeForBot : doit retomber sur la cause
        // de repli sans faire planter le rendu.
        reasons: ['un format jamais vu par ce catalogue'],
      }),
    ];

    const buffer = await generateDiagnosticPdfBuffer(makeReport(), results);
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.subarray(0, 4).toString('utf-8')).toBe('%PDF');
    expect((await pdfText(buffer)).includes('%%EOF')).toBe(true);
    // Le PDF est bien plus long qu'un simple libellé de statut : l'annexe
    // multi-plateforme et les explications client ont bien été injectées.
    expect(buffer.length).toBeGreaterThan(4000);
  });

  it('reste un PDF valide même si un même bot cumule plusieurs causes distinctes', async () => {
    const results: ScanCoreResult[] = [
      makeResult({
        agent: 'GPTBot',
        simpleStatus: 'BLOQUÉ',
        reasons: ['robots.txt disallows GPTBot', 'access blocked (status:403)', 'noindex'],
      }),
    ];

    const buffer = await generateDiagnosticPdfBuffer(makeReport(), results);
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.subarray(0, 4).toString('utf-8')).toBe('%PDF');
  });

  it("ne produit pas d'annexe quand aucun bot n'a de raison à corriger", async () => {
    const buffer = await generateDiagnosticPdfBuffer(makeReport(), [
      makeResult({ agent: 'GPTBot', simpleStatus: 'OK', reasons: [] }),
      makeResult({ agent: 'ClaudeBot', simpleStatus: 'OK', reasons: [] }),
    ]);
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.subarray(0, 4).toString('utf-8')).toBe('%PDF');
  });
});

describe('annexe de correctifs — plateforme détectée', () => {
  const results: ScanCoreResult[] = [
    makeResult({
      agent: 'GPTBot',
      simpleStatus: 'BLOQUÉ',
      // Deux causes distinctes pour exercer à la fois la correspondance CMS
      // (robots-disallow-rule) et pare-feu (access-challenged) dans la même annexe.
      reasons: ['robots.txt disallows GPTBot', 'access challenged (cloudflare)'],
    }),
  ];

  it('met en avant la plateforme détectée et rappelle que ce n\'est qu\'un indice, pas une certitude', async () => {
    const platform: PlatformDetection = {
      cms: 'wordpress',
      seoPlugin: 'yoast',
      firewall: 'cloudflare',
      signals: ['meta generator: WordPress 6.5'],
    };

    const buffer = await generateDiagnosticPdfBuffer(makeReport(platform), results);
    const text = extractPdfText(buffer);

    expect(text).toContain('Plateforme détectée');
    expect(text).toContain("d'après les indices");
    // Les marches à suivre WordPress/Yoast et Cloudflare apparaissent bien.
    expect(text).toContain('Dans le tableau de bord WordPress');
    expect(text).toContain('AI Crawl Control');
  });

  it('met en avant les étapes Shopify quand Shopify est la plateforme détectée', async () => {
    const platform: PlatformDetection = { cms: 'shopify', signals: ['référence cdn.shopify.com dans le HTML'] };

    const buffer = await generateDiagnosticPdfBuffer(makeReport(platform), results);
    const text = extractPdfText(buffer);

    expect(text).toContain('Plateforme détectée');
    expect(text).toContain('robots.txt.liquid');
  });

  it('garde l\'annexe générique (toutes plateformes) quand le cms détecté est unknown', async () => {
    const platform: PlatformDetection = { cms: 'unknown', signals: [] };

    const buffer = await generateDiagnosticPdfBuffer(makeReport(platform), results);
    const text = extractPdfText(buffer);

    expect(text).not.toContain('Plateforme détectée');
    // L'annexe complète liste toujours plusieurs CMS pour la même cause.
    expect(text).toContain('WordPress');
    expect(text).toContain('Shopify');
  });

  it("garde l'annexe générique (toutes plateformes) quand platform est absent du rapport", async () => {
    const buffer = await generateDiagnosticPdfBuffer(makeReport(undefined), results);
    const text = extractPdfText(buffer);

    expect(text).not.toContain('Plateforme détectée');
    expect(text).toContain('WordPress');
    expect(text).toContain('Shopify');
  });

  it("n'affiche jamais les indices bruts (`signals`) de la détection dans le PDF", async () => {
    const platform: PlatformDetection = {
      cms: 'wordpress',
      seoPlugin: 'yoast',
      signals: ['SIGNAL-BRUT-NE-DOIT-PAS-APPARAITRE'],
    };

    const buffer = await generateDiagnosticPdfBuffer(makeReport(platform), results);
    const text = extractPdfText(buffer);

    expect(text).not.toContain('SIGNAL-BRUT-NE-DOIT-PAS-APPARAITRE');
  });

  it("n'évoque ni citation, ni visibilité, ni présence dans les réponses IA (docs/08-constitution.md, principe I)", async () => {
    const platform: PlatformDetection = {
      cms: 'wordpress',
      seoPlugin: 'yoast',
      firewall: 'cloudflare',
      signals: [],
    };

    const buffer = await generateDiagnosticPdfBuffer(makeReport(platform), results);
    const text = extractPdfText(buffer);

    // Même expression interdite que lib/remediation/catalog.test.ts.
    expect(text).not.toMatch(/\bcit(e|er|é|ation)|invisible|apparaî?t dans|visibilité/i);
  });
});
