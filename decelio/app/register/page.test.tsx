// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import RegisterPage from "./page";

/**
 * Régression #152 (Ingénierie) : `/api/auth/register` exige désormais un
 * champ `acceptTerms: true` et refuse l'inscription sinon (400). Ces tests
 * couvrent la case CGV ajoutée au formulaire d'inscription : décochée par
 * défaut, obligatoire pour soumettre, reliée à son libellé pour les
 * technologies d'assistance, et le message d'erreur serveur affiché dans
 * la zone d'alerte existante.
 */
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

function fillRequiredFields() {
  fireEvent.change(screen.getByLabelText("Nom de l'agence"), {
    target: { value: "Atelier Boréal" },
  });
  fireEvent.change(screen.getByLabelText("E-mail professionnel"), {
    target: { value: "contact@atelier-boreal.fr" },
  });
  fireEvent.change(screen.getByLabelText("Mot de passe"), {
    target: { value: "un-mot-de-passe-solide" },
  });
}

describe("RegisterPage — case CGV (#152)", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("affiche la case CGV décochée au premier rendu", () => {
    render(<RegisterPage />);

    const checkbox = screen.getByLabelText(/J.accepte les/i);
    expect(checkbox).not.toBeChecked();
  });

  it("envoie acceptTerms: true et les trois autres champs une fois la case cochée", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<RegisterPage />);
    fillRequiredFields();
    fireEvent.click(screen.getByLabelText(/J.accepte les/i));
    fireEvent.click(screen.getByRole("button", { name: /Créer mon compte/ }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/auth/register");
    expect(JSON.parse(options.body as string)).toEqual({
      name: "Atelier Boréal",
      email: "contact@atelier-boreal.fr",
      password: "un-mot-de-passe-solide",
      acceptTerms: true,
    });
  });

  it("n'envoie aucune requête si la case CGV n'est pas cochée, même en forçant la soumission du formulaire", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { container } = render(<RegisterPage />);
    fillRequiredFields();
    // La case reste décochée : on déclenche l'événement submit directement
    // sur le <form> pour vérifier la garde JS de handleSubmit, indépendamment
    // de la validation native du navigateur sur l'attribut `required`.
    const form = container.querySelector("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form!);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("affiche le message d'erreur renvoyé par l'API quand elle refuse l'inscription (400)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: "Vous devez accepter les conditions générales de vente." }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<RegisterPage />);
    fillRequiredFields();
    fireEvent.click(screen.getByLabelText(/J.accepte les/i));
    fireEvent.click(screen.getByRole("button", { name: /Créer mon compte/ }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Vous devez accepter les conditions générales de vente.");
  });

  it("relie le libellé à la case (un clic sur le libellé la coche) et ouvre les CGV dans un nouvel onglet", () => {
    const { container } = render(<RegisterPage />);

    const checkbox = screen.getByLabelText(/J.accepte les/i);
    expect(checkbox).not.toBeChecked();

    const label = container.querySelector('label[for="i-accept-terms"]');
    expect(label).not.toBeNull();
    fireEvent.click(label!);
    expect(checkbox).toBeChecked();

    const link = screen.getByRole("link", { name: "conditions générales de vente" });
    expect(link).toHaveAttribute("href", "/cgv");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("ouvrir les CGV depuis le libellé ne coche pas la case (le lien est un descendant du label)", () => {
    render(<RegisterPage />);

    const checkbox = screen.getByLabelText(/J.accepte les/i);
    expect(checkbox).not.toBeChecked();

    const link = screen.getByRole("link", { name: "conditions générales de vente" });
    fireEvent.click(link);

    expect(checkbox).not.toBeChecked();
  });
});
