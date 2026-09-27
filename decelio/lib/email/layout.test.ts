import { describe, it, expect } from "vitest";
import { renderEmailLayout, renderButton, renderVerdict, SITE_URL } from "./layout";

describe("renderEmailLayout", () => {
  it("pointe le logo vers decelio.fr", () => {
    const html = renderEmailLayout({ bodyHtml: "<p>Bonjour</p>" });
    expect(html).toContain(`src="${SITE_URL}/logo-decelio.png"`);
  });

  it("n'utilise que la pile de polices systeme, aucune police web", () => {
    const html = renderEmailLayout({ bodyHtml: "<p>Bonjour</p>" });
    expect(html).toContain(
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    );
    expect(html).not.toMatch(/@import/i);
    expect(html).not.toMatch(/fonts\.googleapis\.com/i);
    expect(html).not.toMatch(/<link[^>]+font/i);
  });

  it("ne contient aucune URL https:// hors decelio.fr et hors les liens fournis par l'appelant", () => {
    const providedHref = "https://autre-domaine.example/mon-lien";
    const html = renderEmailLayout({
      bodyHtml: `<p>${renderButton(providedHref, "Continuer")}</p>`,
    });

    const urls = html.match(/https:\/\/[^"'\s)]+/g) ?? [];
    for (const url of urls) {
      const isDecelio = url.startsWith(SITE_URL);
      const isProvided = url.startsWith(providedHref);
      expect(isDecelio || isProvided).toBe(true);
    }
  });

  it("echappe le preheader fourni par l'appelant", () => {
    const html = renderEmailLayout({
      bodyHtml: "<p>Bonjour</p>",
      preheader: `<script>alert('xss')</script>`,
    });
    expect(html).not.toContain("<script>alert");
    expect(html).toContain("&lt;script&gt;");
  });

  it("affiche le nom de marque sans logo ni nom Decelio quand `brand` est fourni", () => {
    const html = renderEmailLayout({ bodyHtml: "<p>Bonjour</p>", brand: "Studio Web" });
    expect(html).toContain("Studio Web");
    expect(html).not.toContain("logo-decelio.png");
    expect(html).not.toContain(">ecelio<");
    expect(html).not.toContain("decelio.fr");
  });

  it("n'utilise aucun tiret cadratin", () => {
    const html = renderEmailLayout({ bodyHtml: "<p>Bonjour</p>", preheader: "Aperçu" });
    expect(html).not.toContain("—");
  });

  it("inclut le pied de page Decelio par defaut (contact et confidentialite)", () => {
    const html = renderEmailLayout({ bodyHtml: "<p>Bonjour</p>" });
    expect(html).toContain("mailto:contact@decelio.fr");
    expect(html).toContain(`${SITE_URL}/confidentialite`);
  });
});

describe("renderButton", () => {
  it("rend un bouton en pilule avec le href et le libelle echappes", () => {
    const html = renderButton(`https://decelio.fr/x?a="><script>1</script>`, `Valider "maintenant"`);
    expect(html).toContain("border-radius: 999px");
    expect(html).not.toContain("<script>1</script>");
    expect(html).toContain("&quot;&gt;&lt;script&gt;");
    expect(html).toContain("&quot;maintenant&quot;");
  });
});

describe("renderVerdict", () => {
  it("affiche toujours une forme ET le mot pour lu", () => {
    const html = renderVerdict("lu");
    expect(html).toContain("●");
    expect(html).toContain("Lu");
  });

  it("affiche toujours une forme ET le mot pour refuse", () => {
    const html = renderVerdict("refuse");
    expect(html).toContain("■");
    expect(html).toContain("Refusé");
  });

  it("affiche toujours une forme ET le mot pour vide", () => {
    const html = renderVerdict("vide");
    expect(html).toContain("▲");
    expect(html).toContain("Vide");
  });

  it("affiche toujours une forme ET le mot pour inconnu", () => {
    const html = renderVerdict("inconnu");
    expect(html).toContain("○");
    expect(html).toContain("Inconnu");
  });

  it("permet de remplacer le libelle par defaut (ex. a verifier)", () => {
    const html = renderVerdict("inconnu", "à vérifier");
    expect(html).toContain("○");
    expect(html).toContain("à vérifier");
    expect(html).not.toContain(">Inconnu<");
  });

  it("n'affiche jamais uniquement une couleur : le mot est toujours du texte lisible", () => {
    for (const value of ["lu", "refuse", "vide", "inconnu"] as const) {
      const html = renderVerdict(value);
      expect(html).not.toContain("—");
    }
  });

  it("garde chaque attribut style entier : le texte du bouton reste blanc après la police", () => {
    const html = renderButton("https://decelio.fr/settings", "Gérer");
    const linkStyle = html.match(/<a [^>]*style="([^"]*)"/)?.[1] ?? "";
    expect(linkStyle).toContain("font-family:");
    expect(linkStyle).toContain("color: #ffffff");
    expect(html).not.toContain('"Segoe UI"');
  });
});
