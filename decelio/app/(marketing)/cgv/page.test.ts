import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactElement, ReactNode } from "react";
import { auth } from "@/auth";
import CgvPage from "./page";
import { LastUpdated } from "@/components/home/LegalBits";
import { TERMS_UPDATED_LABEL, TERMS_VERSION } from "@/lib/legal/terms";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

/**
 * Retrouve dans l'arbre JSX le premier element du type donne, en descendant
 * dans `children` (meme principe que `app/login/page.test.ts`).
 */
function findByType(node: ReactNode, type: unknown): ReactElement<{ children?: ReactNode }> | null {
  if (node == null || typeof node !== "object") return null;
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findByType(child, type);
      if (found) return found;
    }
    return null;
  }
  const element = node as ReactElement<{ children?: ReactNode }>;
  if (element.type === type) return element;
  if (element.props && "children" in element.props) {
    return findByType(element.props.children, type);
  }
  return null;
}

/** Aplatit un noeud JSX en texte brut, pour comparer ce qu'un visiteur lit vraiment. */
function textContent(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textContent).join("");
  const element = node as ReactElement<{ children?: ReactNode }>;
  if (element.props && "children" in element.props) {
    return textContent(element.props.children);
  }
  return "";
}

describe("CgvPage (T-date-version-cgv)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue(null as never);
  });

  it("affiche la date de mise à jour issue de TERMS_UPDATED_LABEL, sans le marqueur à compléter", async () => {
    const jsx = await CgvPage();
    const lastUpdated = findByType(jsx, LastUpdated);

    expect(lastUpdated).not.toBeNull();
    const text = textContent(lastUpdated?.props.children);
    expect(text).toContain(TERMS_UPDATED_LABEL);
    expect(text).not.toContain("à compléter");
    expect(text).not.toContain("date");
  });

  it("affiche une référence de version qui correspond à TERMS_VERSION", async () => {
    const jsx = await CgvPage();
    const lastUpdated = findByType(jsx, LastUpdated);

    const text = textContent(lastUpdated?.props.children);
    expect(text).toContain(TERMS_VERSION);
  });

  it("tire la date et la référence de version du module lib/legal/terms, jamais d'une valeur écrite en dur", async () => {
    // Comparer au texte affiché aux constantes importées (et non à une chaîne
    // recopiée comme "2026-09-27-2") est ce qui garde ce test vrai le jour où
    // l'Ingénierie fera avancer TERMS_VERSION.
    const jsx = await CgvPage();
    const lastUpdated = findByType(jsx, LastUpdated);

    const text = textContent(lastUpdated?.props.children);
    expect(text).toBe(`${TERMS_UPDATED_LABEL} (référence ${TERMS_VERSION})`);
  });
});
