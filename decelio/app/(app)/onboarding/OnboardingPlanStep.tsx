"use client";

import { useState } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { createCheckoutSession } from "@/lib/billing/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wordmark } from "@/components/home/SiteChrome";
import { ONBOARDING_PLANS } from "./onboarding-plan";

/**
 * Étape « Choisir un palier » de l'onboarding (EF-063, T045).
 *
 * Affichée uniquement pour un compte sans abonnement actif (voir
 * `shouldSkipPlanStep` dans `onboarding-plan.ts`, appelé côté serveur dans
 * `page.tsx`). Chaque palier soumet son propre formulaire vers
 * `createCheckoutSession`, qui redirige vers Stripe Checkout ; il n'y a rien
 * d'autre à faire ici que déclencher ce paiement.
 */
export function OnboardingPlanStep() {
  const [couponCode, setCouponCode] = useState("");

  return (
    <div className="-m-6 flex min-h-screen flex-col bg-paper text-ink md:-m-10">
      <header className="bg-ink text-paper">
        <div className="mx-auto flex w-full max-w-[1240px] items-center justify-between px-6 py-3.5">
          <Link href="/" aria-label="Decelio, accueil" className="mr-auto inline-flex items-center">
            <Wordmark light="invert" />
          </Link>
          <span className="type-caption font-medium opacity-70">Étape 2 sur 3</span>
        </div>
      </header>

      <div className="flex h-1.5 bg-ink/15">
        <span className="flex-1 bg-cobalt" />
        <span className="flex-[2]" />
      </div>

      <main className="flex flex-1 justify-center bg-paper p-6 sm:p-12">
        <div className="w-full max-w-[760px]">
          <p className="mb-2.5 text-sm font-medium text-ink-2">Étape 2 · Choisir un palier</p>
          <h1 className="font-display mb-2.5 text-[28px] leading-[1.1] font-semibold tracking-[-0.02em] text-ink sm:text-[32px]">
            Le scan gratuit s&apos;arrête à un site
          </h1>
          <p className="mb-[22px] text-sm leading-6 text-ink-2">
            Choisissez un palier pour surveiller votre portefeuille en continu. Le paiement se fait sur
            Stripe ; vous revenez ensuite directement sur Decelio.
          </p>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="o-coupon" className="text-sm font-medium text-ink">
              Code fondateur (optionnel)
            </label>
            <Input
              id="o-coupon"
              type="text"
              fieldSize="lg"
              autoComplete="off"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              className="max-w-[280px]"
              placeholder="Reçu par e-mail si applicable"
            />
          </div>

          <div className="mt-[22px] grid grid-cols-1 gap-3.5 sm:grid-cols-3">
            {ONBOARDING_PLANS.map((plan) => (
              <div
                key={plan.id}
                className={
                  "flex flex-col rounded-lg border bg-surface p-4.5 " +
                  (plan.id === "PRO" ? "border-ink" : "border-line")
                }
              >
                {plan.id === "PRO" && (
                  <span className="mb-2.5 self-start rounded-full bg-ink px-2.5 py-0.5 text-xs font-semibold text-paper">
                    Recommandé
                  </span>
                )}
                <span className="text-sm font-semibold text-ink">{plan.name}</span>
                <span className="mt-1 text-2xl font-semibold tracking-[-0.01em] text-ink">
                  {plan.price}
                  <span className="text-sm font-normal text-ink-2">{plan.priceUnit}</span>
                </span>
                <span className="mt-1.5 text-[13px] text-ink-2">{plan.maxSites} sites surveillés</span>

                <form action={createCheckoutSession.bind(null, plan.id, couponCode)} className="mt-4">
                  <PlanSubmitButton label={plan.ctaLabel} primary={plan.id === "PRO"} />
                </form>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

function PlanSubmitButton({ label, primary }: { label: string; primary: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" size="lg" variant={primary ? "default" : "outline"} disabled={pending} className="h-auto min-h-11 w-full whitespace-normal py-2.5 text-center leading-snug">
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Redirection vers Stripe…
        </>
      ) : (
        label
      )}
    </Button>
  );
}
