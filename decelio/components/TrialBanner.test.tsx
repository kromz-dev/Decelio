// On utilise renderToStaticMarkup (et non @testing-library/react comme les
// autres tests de composants du projet) parce que TrialBanner est un
// composant serveur sans interaction : il n'y a rien a cliquer ni a attendre,
// juste du HTML statique a verifier.
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { TrialBanner } from "./TrialBanner";

const NOW = new Date("2026-09-27T10:00:00Z");

describe("TrialBanner", () => {
  it("n'affiche rien hors essai (trialEndsAt nul)", () => {
    expect(renderToStaticMarkup(<TrialBanner trialEndsAt={null} now={NOW} />)).toBe("");
  });

  it("n'affiche rien si la date de fin d'essai est deja passee", () => {
    // Garde-fou contre un webhook Stripe `customer.subscription.updated` en
    // retard qui laisserait `stripeTrialEnd` fige dans le passe : sans ce
    // garde-fou, le bandeau annoncerait un prelevement a une date revolue.
    const html = renderToStaticMarkup(
      <TrialBanner trialEndsAt={new Date("2026-09-20T10:00:00Z")} now={NOW} />
    );
    expect(html).toBe("");
  });

  it("annonce 14 jours restants au depart de l'essai", () => {
    const html = renderToStaticMarkup(
      <TrialBanner trialEndsAt={new Date("2026-10-11T09:00:00Z")} now={NOW} />
    );
    expect(html).toContain("14 jours restants");
  });

  it("dit « dernier jour » quand l'essai finit plus tard le jour meme", () => {
    const html = renderToStaticMarkup(
      <TrialBanner trialEndsAt={new Date("2026-09-27T20:00:00Z")} now={NOW} />
    );
    expect(html).toContain("dernier jour");
  });

  it("dit « 1 jour restant » au singulier quand l'essai finit le lendemain", () => {
    const html = renderToStaticMarkup(
      <TrialBanner trialEndsAt={new Date("2026-09-28T08:00:00Z")} now={NOW} />
    );
    expect(html).toContain("1 jour restant");
    expect(html).not.toContain("1 jours restants");
  });

  it("compte 1 jour restant (pas 2) au passage a l'heure d'hiver", () => {
    // La France passe de UTC+2 a UTC+1 le dimanche 25 octobre 2026.
    // now = 2026-10-24T20:00:00Z est 22 h a Paris le 24 (encore UTC+2) ;
    // trialEndsAt = 2026-10-25T21:00:00Z est 22 h a Paris le 25 (deja UTC+1).
    // L'ecart reel entre ces deux instants est de 25 h, pas 24 : un calcul
    // en tranches de 24 h renverrait 2 et afficherait a tort
    // "2 jours restants" alors qu'il ne reste qu'un jour de calendrier a
    // Paris.
    const html = renderToStaticMarkup(
      <TrialBanner trialEndsAt={new Date("2026-10-25T21:00:00Z")} now={new Date("2026-10-24T20:00:00Z")} />
    );
    expect(html).toContain("1 jour restant");
    expect(html).not.toContain("2 jours restants");
  });

  it("affiche la date de prelevement en heure de Paris, pas en heure du serveur", () => {
    // trialEndsAt = 2026-10-04T23:00:00Z correspond a 2026-10-05T01:00 a
    // Paris (UTC+2 en octobre, avant le changement d'heure) : le serveur
    // (UTC) est encore le 4, mais pour le client francais c'est deja le 5,
    // et c'est cette date de prelevement bancaire qui doit s'afficher.
    const html = renderToStaticMarkup(
      <TrialBanner trialEndsAt={new Date("2026-10-04T23:00:00Z")} now={NOW} />
    );
    expect(html).toContain("5 octobre");
    expect(html).not.toContain("4 octobre");
  });

  it("le lien « Gerer mon abonnement » pointe vers /settings#abonnement", () => {
    const html = renderToStaticMarkup(
      <TrialBanner trialEndsAt={new Date("2026-10-11T09:00:00Z")} now={NOW} />
    );
    expect(html).toContain('href="/settings#abonnement"');
  });
});
