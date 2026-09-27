"use client";

import Link from "next/link";
import { useState } from "react";

import { AuthShell } from "@/components/home/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const GENERIC_MESSAGE = "Si un compte existe avec cette adresse, un e-mail de réinitialisation vient d'être envoyé.";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/reset-password/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (response.status === 429) {
        const data = await response.json().catch(() => ({}));
        setError(data.error || "Trop de tentatives. Réessayez plus tard.");
        setLoading(false);
        return;
      }

      // Réponse générique dans tous les autres cas : on n'indique jamais si le
      // compte existe ou non.
      setSent(true);
    } catch {
      setError("Une erreur est survenue. Réessayez.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Mot de passe oublié"
      title="Réinitialiser votre mot de passe"
      lede="Indiquez votre e-mail professionnel : si un compte existe, vous recevrez un lien pour choisir un nouveau mot de passe."
      footer={
        <div className="flex flex-col gap-2">
          <Link href="/login" className="font-medium text-cobalt hover:underline">
            Retour à la connexion
          </Link>
          <span>
            Pas encore de compte ?{" "}
            <Link href="/register" className="font-medium text-cobalt hover:underline">
              Créer mon compte
            </Link>
          </span>
        </div>
      }
    >
      {sent ? (
        <p role="status" className="rounded-md border border-line bg-surface-2 p-3 text-sm text-ink">
          {GENERIC_MESSAGE}
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="fp-mail" className="text-xs font-medium text-ink-2">
              E-mail professionnel
            </label>
            <Input
              id="fp-mail"
              type="email"
              required
              autoComplete="email"
              fieldSize="lg"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {error && (
            <p role="alert" className="rounded-md border border-stop/30 bg-stop-soft p-3 text-sm text-stop">
              {error}
            </p>
          )}

          <Button type="submit" size="lg" disabled={loading} className="mt-1 w-full">
            {loading ? "Envoi..." : "Envoyer le lien de réinitialisation"}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
