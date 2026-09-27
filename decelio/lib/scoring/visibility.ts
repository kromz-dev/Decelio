export interface RunData {
  engineId: string;
  isMentioned: boolean;
  position: number | null;
  family?: string;
  citationCount?: number;
  hasBrandCitation?: boolean;
}

export interface VisibilityReport {
  globalScore: number;
  visibilityRate: number;
  rankScore: number;
  citationRate: number | null;
  brandCitationRate: number | null;
  problemScore: number | null;
  solutionScore: number | null;
  comparisonScore: number | null;
}

function getPositionWeight(position: number | null): number {
  if (position === null) return 0;
  if (position === 1) return 100;
  if (position === 2) return 80;
  if (position === 3) return 60;
  if (position === 4) return 40;
  return 20;
}

function calculateScoreForRuns(runs: RunData[]): number | null {
  if (runs.length === 0) return null;
  const totalWeight = runs.reduce(
    (sum, run) => sum + (run.isMentioned ? getPositionWeight(run.position) : 0),
    0,
  );
  return Math.round((totalWeight / runs.length) * 10) / 10;
}

/**
 * Score pondéré et sa marge d'erreur.
 *
 * `marginOfError` vaut `null` quand la marge n'est pas estimable — c'est-à-dire
 * sous deux observations. Elle valait auparavant `0`, ce qui affichait au client
 * « 100 % de visibilité, marge ±0 » à partir d'une seule requête : une certitude
 * parfaite tirée d'une mesure unique. La constitution du projet interdit cette
 * fausse précision, et un client qui vérifie et constate l'exagération ne
 * revient pas. `null` doit être présenté comme « non estimable », jamais rendu
 * en 0 à l'affichage.
 *
 * Réserve à connaître : même au-dessus de deux observations, la marge reste très
 * large à faible échantillon (mesuré : deux observations contrastées donnent un
 * score de 50 pour une marge de 98). Relever le seuil de significativité est une
 * décision produit, pas un correctif technique — elle n'est pas prise ici.
 */
export function scoreWithConfidence(runs: RunData[]): {
  score: number;
  marginOfError: number | null;
} {
  if (runs.length === 0) return { score: 0, marginOfError: null };
  const weights = runs.map((run) =>
    run.isMentioned ? getPositionWeight(run.position) : 0,
  );
  const mean = weights.reduce((sum, value) => sum + value, 0) / weights.length;
  if (weights.length < 2) {
    return { score: Math.round(mean * 10) / 10, marginOfError: null };
  }
  const variance =
    weights.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
    (weights.length - 1);
  return {
    score: Math.round(mean * 10) / 10,
    marginOfError: Math.round((1.96 * Math.sqrt(variance / weights.length)) * 10) / 10,
  };
}

function percentage(predicate: (run: RunData) => boolean, runs: RunData[]): number {
  return Math.round((runs.filter(predicate).length / runs.length) * 1000) / 10;
}

export function calculateVisibilityScore(runs: RunData[]): VisibilityReport {
  if (runs.length === 0) {
    return {
      globalScore: 0,
      visibilityRate: 0,
      rankScore: 0,
      citationRate: null,
      brandCitationRate: null,
      problemScore: null,
      solutionScore: null,
      comparisonScore: null,
    };
  }

  const rankScore = calculateScoreForRuns(runs) ?? 0;
  const citationRuns = runs.filter((run) => run.citationCount !== undefined);
  const brandCitationRuns = runs.filter((run) => run.hasBrandCitation !== undefined);

  return {
    globalScore: rankScore,
    visibilityRate: percentage((run) => run.isMentioned, runs),
    rankScore,
    citationRate: citationRuns.length
      ? percentage((run) => (run.citationCount ?? 0) > 0, citationRuns)
      : null,
    brandCitationRate: brandCitationRuns.length
      ? percentage((run) => run.hasBrandCitation === true, brandCitationRuns)
      : null,
    problemScore: calculateScoreForRuns(runs.filter((run) => run.family === "PROBLEM")),
    solutionScore: calculateScoreForRuns(runs.filter((run) => run.family === "SOLUTION")),
    comparisonScore: calculateScoreForRuns(
      runs.filter((run) => run.family === "COMPARISON"),
    ),
  };
}
