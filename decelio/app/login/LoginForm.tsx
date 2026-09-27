"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import posthog from "posthog-js";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setLoading(true);
    setError("");
    const result = await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirect: false,
    });
    if (result?.error) {
      setError("E-mail ou mot de passe incorrect. Vérifiez les deux champs et réessayez.");
      setLoading(false);
      return;
    }
    posthog.capture("user_logged_in");
    window.location.href = callbackUrl;
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-ink-2" htmlFor="email">
          Adresse e-mail
        </label>
        <Input id="email" name="email" type="email" autoComplete="email" required fieldSize="lg" />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-ink-2" htmlFor="password">
          Mot de passe
        </label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required fieldSize="lg" />
        <Link href="/forgot-password" className="mt-1 w-fit text-[13px] text-cobalt hover:underline">
          Mot de passe oublié
        </Link>
      </div>
      {error && (
        <p role="alert" className="rounded-md border border-stop/30 bg-stop-soft p-3 text-sm text-stop">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" disabled={loading} className="w-full">
        {loading ? "Connexion..." : "Se connecter"}
      </Button>
    </form>
  );
}

