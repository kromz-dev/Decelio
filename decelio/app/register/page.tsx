"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { AuthShell } from "@/components/home/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function RegisterPage() {
  const router = useRouter();
  const [agency, setAgency] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [siteSize, setSiteSize] = useState("6-20");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!acceptTerms) return;
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: agency,
          email,
          password,
          acceptTerms: true,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        if (response.status === 409) {
          router.push("/dashboard");
          return;
        }
        setError(data.error || "L'inscription a échoué. Vérifiez vos informations et réessayez.");
        setLoading(false);
        return;
      }

      router.push("/dashboard");
    } catch {
      router.push("/dashboard");
    }
  }

  return (
    <AuthShell
      eyebrow="Créer le compte agence"
      title="Un compte pour tout le portefeuille"
      lede="Vous pourrez inviter vos collègues ensuite : les scans et les alertes sont partagés à l'échelle de l'agence."
      footer={
        <>
          Déjà un compte ?{" "}
          <Link href="/login" className="font-medium text-cobalt hover:underline">
            Se connecter
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="i-agency" className="text-xs font-medium text-ink-2">
            Nom de l&apos;agence
          </label>
          <Input
            id="i-agency"
            type="text"
            required
            fieldSize="lg"
            value={agency}
            onChange={(e) => setAgency(e.target.value)}
            placeholder="Nom de votre agence"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="i-mail" className="text-xs font-medium text-ink-2">
            E-mail professionnel
          </label>
          <Input
            id="i-mail"
            type="email"
            required
            fieldSize="lg"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="vous@votre-agence.fr"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="i-pass" className="text-xs font-medium text-ink-2">
            Mot de passe
          </label>
          <Input
            id="i-pass"
            type="password"
            minLength={12}
            required
            fieldSize="lg"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <span className="text-xs text-ink-2">12 caractères minimum.</span>
        </div>

        <div className="flex flex-col gap-1.5">
          <span id="i-size-label" className="text-xs font-medium text-ink-2">
            Nombre de sites à surveiller
          </span>
          <div role="group" aria-labelledby="i-size-label" className="inline-flex w-fit flex-wrap gap-1.5">
            {(["1-5", "6-20", "20+"] as const).map((option) => (
              <Button
                key={option}
                type="button"
                variant={siteSize === option ? "default" : "outline"}
                size="sm"
                onClick={() => setSiteSize(option)}
                aria-pressed={siteSize === option}
              >
                {option === "1-5" ? "1 à 5" : option === "6-20" ? "6 à 20" : "20 et plus"}
              </Button>
            ))}
          </div>
        </div>

        {error && (
          <p role="alert" className="rounded-md border border-stop/30 bg-stop-soft p-3 text-sm text-stop">
            {error}
          </p>
        )}

        {/*
          text-sm text-ink plutôt que le text-xs text-ink-2 des libellés de champ :
          c'est un engagement contractuel à lire, pas un simple intitulé de champ,
          il mérite la même taille et le même contraste que le texte courant.
        */}
        <label
          htmlFor="i-accept-terms"
          className="flex min-h-11 cursor-pointer items-start gap-2.5 text-sm text-ink"
        >
          <input
            id="i-accept-terms"
            type="checkbox"
            required
            checked={acceptTerms}
            onChange={(e) => setAcceptTerms(e.target.checked)}
            className="mt-0.5 size-4 shrink-0 rounded-xs border border-line-strong accent-cobalt"
          />
          <span>
            J&apos;accepte les{" "}
            <Link
              href="/cgv"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-cobalt underline"
              // Empêche la remontée du clic vers le <label> : sans ça, ouvrir les CGV coche la case CGV par effet de bord.
              onClick={(event) => event.stopPropagation()}
            >
              conditions générales de vente
            </Link>
            .
          </span>
        </label>

        <Button type="submit" size="lg" disabled={loading} className="mt-1 w-full">
          {loading ? "Création du compte..." : "Créer mon compte"}
        </Button>

        <p className="m-0 text-xs leading-normal text-ink-2">
          Carte bancaire demandée à la dernière étape. Résiliable en un clic.
        </p>
      </form>
    </AuthShell>
  );
}
