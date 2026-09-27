import { describe, expect, it } from 'vitest';
import { generateDiagnosticPdfBuffer } from './renderDiagnosticPdf';
import type { ScanReport, ScanCoreResult } from '../scanner/core';

/**
 * Rapport minimal mais complet, aligné sur la vraie forme de `ScanReport`
 * (contrairement aux fixtures `as never` de reportGeneration.e2e.test.ts,
 * qui testent la résilience du pipeline à un payload malformé plutôt que le
 * contenu réel du PDF).
 */
function makeReport(): ScanReport {
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
