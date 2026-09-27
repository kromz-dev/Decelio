import { describe, expect, it } from "vitest";
import { escapeHtml } from "./escapeHtml";

describe("escapeHtml", () => {
  it("échappe les chevrons pour neutraliser une balise <script>", () => {
    expect(escapeHtml("<script>alert(1)</script>")).toBe(
      "&lt;script&gt;alert(1)&lt;/script&gt;"
    );
  });

  it("échappe les guillemets doubles et simples", () => {
    expect(escapeHtml(`"citation" et 'apostrophe'`)).toBe(
      "&quot;citation&quot; et &#39;apostrophe&#39;"
    );
  });

  it("échappe le esperluette, et le fait avant les autres entités pour ne pas les doubler", () => {
    expect(escapeHtml("Dupont & Fils")).toBe("Dupont &amp; Fils");
    expect(escapeHtml("<a>")).toBe("&lt;a&gt;");
  });

  it("laisse un texte sans caractère spécial inchangé", () => {
    expect(escapeHtml("Bonjour Kamal")).toBe("Bonjour Kamal");
  });

  it("gère la chaîne vide", () => {
    expect(escapeHtml("")).toBe("");
  });
});
