import Link from "next/link";

/**
 * Bandeau de l'essai gratuit (ADR-002), affiche en haut de l'espace client.
 *
 * `trialEndsAt` vient de `getTrialEndsAt` (Ingenierie) : `null` hors essai,
 * et jamais une date passee. Rien n'est affiche dans ce cas. Le premier
 * prelevement a lieu a la fin de l'essai, sauf resiliation avant.
 */
const DAY_MS = 24 * 60 * 60 * 1000;

export function trialDaysLeft(trialEndsAt: Date, now: Date = new Date()): number {
  return Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / DAY_MS));
}

export function TrialBanner({ trialEndsAt, now }: { trialEndsAt: Date | null; now?: Date }) {
  if (!trialEndsAt) return null;
  const days = trialDaysLeft(trialEndsAt, now);
  const endDate = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" }).format(trialEndsAt);
  const remaining = days <= 1 ? "dernier jour" : `${days} jours restants`;

  return (
    <div role="status" className="border-b border-brand/20 bg-brand-soft">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-3 text-sm sm:flex-row sm:items-center sm:justify-between md:px-10">
        <p className="text-ink">
          <span className="font-semibold">Essai gratuit : {remaining}.</span>{" "}
          <span className="text-ink-2">Premier prélèvement le {endDate}, sauf résiliation avant.</span>
        </p>
        <Link
          href="/settings#abonnement"
          className="shrink-0 font-semibold text-brand underline underline-offset-4 hover:text-ink"
        >
          Gérer mon abonnement
        </Link>
      </div>
    </div>
  );
}
