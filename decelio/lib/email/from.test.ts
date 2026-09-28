import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { DEFAULT_EMAIL_FROM, emailFrom } from "./from";

describe("emailFrom", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.ALERT_FROM_EMAIL;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("renvoie l'adresse par defaut quand la variable est absente", () => {
    expect(emailFrom()).toBe(DEFAULT_EMAIL_FROM);
  });

  it("renvoie l'adresse par defaut quand la variable est vide", () => {
    process.env.ALERT_FROM_EMAIL = "";
    expect(emailFrom()).toBe(DEFAULT_EMAIL_FROM);
  });

  it("renvoie l'adresse par defaut quand la variable ne contient que des espaces", () => {
    process.env.ALERT_FROM_EMAIL = "   ";
    expect(emailFrom()).toBe(DEFAULT_EMAIL_FROM);
  });

  it("renvoie la variable quand elle a une valeur normale", () => {
    process.env.ALERT_FROM_EMAIL = "Decelio <onboarding@resend.dev>";
    expect(emailFrom()).toBe("Decelio <onboarding@resend.dev>");
  });

  it("supprime les espaces autour de la variable", () => {
    process.env.ALERT_FROM_EMAIL = "  Decelio <onboarding@resend.dev>  ";
    expect(emailFrom()).toBe("Decelio <onboarding@resend.dev>");
  });

  it("lit la variable a chaque appel, jamais en cache", () => {
    process.env.ALERT_FROM_EMAIL = "Decelio <a@resend.dev>";
    expect(emailFrom()).toBe("Decelio <a@resend.dev>");
    process.env.ALERT_FROM_EMAIL = "Decelio <b@resend.dev>";
    expect(emailFrom()).toBe("Decelio <b@resend.dev>");
  });

  it("la production ne change pas tant que la variable n'est pas definie", () => {
    expect(process.env.ALERT_FROM_EMAIL).toBeUndefined();
    expect(emailFrom()).toBe("Decelio <bonjour@decelio.fr>");
  });
});
