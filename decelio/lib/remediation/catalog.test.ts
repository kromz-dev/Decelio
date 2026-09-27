import { describe, expect, it } from "vitest";
import { REMEDIATION_CAUSES, UNKNOWN_CAUSE } from "./catalog";
import { CMS_LABELS, FIREWALL_LABELS, PlatformGuidance } from "./types";

/**
 * Ces tests ne vérifient pas le contenu éditorial (aucun test ne peut
 * remplacer la relecture humaine d'un texte destiné à un client final), mais
 * la discipline d'honnêteté exigée par la mission : une plateforme marquée
 * comme non supportée ne doit jamais porter d'étapes inventées, et une
 * information non sourcée doit rester signalée comme telle.
 */
function allGuidances(): PlatformGuidance[] {
  const out: PlatformGuidance[] = [];
  for (const cause of [...REMEDIATION_CAUSES, UNKNOWN_CAUSE]) {
    if (cause.cms) out.push(...Object.values(cause.cms));
    if (cause.firewalls) out.push(...Object.values(cause.firewalls));
  }
  return out;
}

describe("REMEDIATION_CAUSES", () => {
  it("a un identifiant unique par cause", () => {
    const ids = REMEDIATION_CAUSES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("donne un titre et un impact client non vides pour chaque cause", () => {
    for (const cause of REMEDIATION_CAUSES) {
      expect(cause.title.trim().length, cause.id).toBeGreaterThan(0);
      expect(cause.clientImpact.trim().length, cause.id).toBeGreaterThan(0);
    }
  });

  it("expose au moins une marche à suivre (cms, firewalls ou generalSteps) par cause", () => {
    for (const cause of REMEDIATION_CAUSES) {
      const hasCms = !!cause.cms && Object.keys(cause.cms).length > 0;
      const hasFirewalls = !!cause.firewalls && Object.keys(cause.firewalls).length > 0;
      const hasGeneral = !!cause.generalSteps && cause.generalSteps.length > 0;
      expect(hasCms || hasFirewalls || hasGeneral, cause.id).toBe(true);
    }
  });

  it("porte une nuance (caveat) pour les verdicts non établis (coquille vide, erreur)", () => {
    const jsDependent = REMEDIATION_CAUSES.find((c) => c.id === "js-dependent");
    const siteUnreachable = REMEDIATION_CAUSES.find((c) => c.id === "site-unreachable");
    const httpError = REMEDIATION_CAUSES.find((c) => c.id === "http-error");
    expect(jsDependent?.caveat).toBeTruthy();
    expect(jsDependent?.caveat).toMatch(/présomption|probablement/i);
    expect(siteUnreachable?.caveat).toBeTruthy();
    expect(siteUnreachable?.caveat).toMatch(/10 secondes/);
    expect(httpError?.caveat).toBeTruthy();
  });
});

describe("cohérence des marches à suivre par plateforme", () => {
  it("n'a jamais d'étape pour une plateforme marquée non supportée", () => {
    for (const guidance of allGuidances()) {
      if (!guidance.supported) {
        expect(guidance.steps).toEqual([]);
      }
    }
  });

  it("explique toujours pourquoi via une note quand une plateforme n'est pas supportée", () => {
    for (const guidance of allGuidances()) {
      if (!guidance.supported) {
        expect(guidance.note?.trim().length ?? 0).toBeGreaterThan(0);
      }
    }
  });

  it("donne au moins une étape concrète quand une plateforme est supportée", () => {
    for (const guidance of allGuidances()) {
      if (guidance.supported) {
        expect(guidance.steps.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("libellés de plateformes", () => {
  it("a un libellé pour chaque CmsKey référencé par le catalogue", () => {
    for (const cause of REMEDIATION_CAUSES) {
      for (const key of Object.keys(cause.cms ?? {})) {
        expect(CMS_LABELS[key as keyof typeof CMS_LABELS]).toBeTruthy();
      }
    }
  });

  it("a un libellé pour chaque FirewallKey référencé par le catalogue", () => {
    for (const cause of REMEDIATION_CAUSES) {
      for (const key of Object.keys(cause.firewalls ?? {})) {
        expect(FIREWALL_LABELS[key as keyof typeof FIREWALL_LABELS]).toBeTruthy();
      }
    }
  });
});

/**
 * Principe non négociable (docs/08-constitution.md, principe I) : Decelio ne
 * mesure ni les citations ni la présence dans les réponses des assistants
 * IA. Le seul fait constaté est qu'un robot donné n'a pas pu lire (ou n'a
 * presque rien pu lire) une page. Aucun texte destiné au client ne doit donc
 * affirmer une conséquence non mesurée (citation, visibilité, présence dans
 * une réponse d'assistant IA).
 */
// \b avant « cit » évite les faux positifs sur des mots sans rapport (« explicitement »,
// « explicite ») qui contiennent la sous-chaîne « cit » sans être une citation.
const FORBIDDEN_WORDING = /\bcit(e|er|é|ation)|invisible|apparaî?t dans|visibilité/i;

/** Tous les champs de texte, destinés au client, d'une entrée du catalogue. */
function collectClientFacingTexts(): { label: string; text: string }[] {
  const out: { label: string; text: string }[] = [];
  for (const cause of [...REMEDIATION_CAUSES, UNKNOWN_CAUSE]) {
    out.push({ label: `${cause.id}.title`, text: cause.title });
    out.push({ label: `${cause.id}.clientImpact`, text: cause.clientImpact });
    if (cause.caveat) out.push({ label: `${cause.id}.caveat`, text: cause.caveat });
    for (const [idx, step] of (cause.generalSteps ?? []).entries()) {
      out.push({ label: `${cause.id}.generalSteps[${idx}]`, text: step });
    }
    const platformGroups: [string, Partial<Record<string, PlatformGuidance>> | undefined][] = [
      ["cms", cause.cms],
      ["firewalls", cause.firewalls],
    ];
    for (const [groupName, group] of platformGroups) {
      for (const [key, guidance] of Object.entries(group ?? {})) {
        if (!guidance) continue;
        if (guidance.note) out.push({ label: `${cause.id}.${groupName}.${key}.note`, text: guidance.note });
        for (const [idx, step] of guidance.steps.entries()) {
          out.push({ label: `${cause.id}.${groupName}.${key}.steps[${idx}]`, text: step });
        }
      }
    }
  }
  return out;
}

describe("honnêteté de la mesure (docs/08-constitution.md, principe I)", () => {
  it("aucun texte client n'évoque de citation, de visibilité ou de présence dans les réponses IA", () => {
    for (const { label, text } of collectClientFacingTexts()) {
      expect(text, label).not.toMatch(FORBIDDEN_WORDING);
    }
  });
});

describe("UNKNOWN_CAUSE", () => {
  it("ne correspond jamais automatiquement à une raison (elle n'est choisie qu'en repli)", () => {
    expect(UNKNOWN_CAUSE.matches("n'importe quoi")).toBe(false);
  });

  it("invite à transmettre le cas à un développeur plutôt que d'inventer un correctif", () => {
    expect(UNKNOWN_CAUSE.generalSteps?.join(" ")).toMatch(/développeur/);
  });
});
