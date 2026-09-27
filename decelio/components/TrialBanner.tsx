import Link from "next/link";

/**
 * Bandeau de l'essai gratuit (ADR-002), affiche en haut de l'espace client.
 *
 * `trialEndsAt` vient de `getTrialEndsAt` (Ingenierie) : `null` hors essai.
 * Rien n'est affiche dans ce cas, ni si la date est deja passee : la donnee
 * depend du webhook Stripe `customer.subscription.updated`, et un webhook en
 * retard laisserait sinon un compte de jours faux sous les yeux du client.
 *
 * Le compte et la date sont calcules en heure de Paris, pas en heure du
 * serveur (UTC sur l'hebergeur) : une fin d'essai a 23 h UTC tombe le
 * lendemain a Paris, et il s'agit d'une date de prelevement bancaire.
 */
const DAY_MS = 24 * 60 * 60 * 1000;

const PARIS_DAY = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Paris",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const PARIS_DATE = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris",
  day: "numeric",
  month: "long",
});

/**
 * Nombre de jours de calendrier restants a Paris. `0` le dernier jour.
 *
 * Compte des jours de calendrier et non des tranches de 24 h : le dernier
 * dimanche d'octobre dure 25 h a Paris, et un ecart en millisecondes
 * divise par 24 h ferait alors afficher un jour de trop.
 */
export function trialDaysLeft(trialEndsAt: Date, now: Date = new Date()): number {
  const end = Date.parse(`${PARIS_DAY.format(trialEndsAt)}T00:00:00Z`);
  const today = Date.parse(`${PARIS_DAY.format(now)}T00:00:00Z`);
  return Math.max(0, Math.round((end - today) / DAY_MS));
}

export function TrialBanner({ trialEndsAt, now = new Date() }: { trialEndsAt: Date | null; now?: Date }) {
  if (!trialEndsAt || trialEndsAt.getTime() <= now.getTime()) return null;

  const days = trialDaysLeft(trialEndsAt, now);
  const remaining = days === 0 ? "dernier jour" : days === 1 ? "1 jour restant" : `${days} jours restants`;

  return (
    <div className="border-b border-line bg-surface-2 md:pl-64">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-3 text-sm sm:flex-row sm:items-center sm:justify-between md:px-10">
        <p className="text-ink">
          <span className="font-semibold">Essai gratuit&nbsp;: {remaining}.</span>{" "}
          <span className="text-ink-2">
            Premier prélèvement le{" "}
            <time dateTime={trialEndsAt.toISOString()}>{PARIS_DATE.format(trialEndsAt)}</time>, sauf résiliation avant.
          </span>
        </p>
        <Link
          href="/settings#abonnement"
          className="inline-flex min-h-11 w-fit shrink-0 items-center font-medium text-cobalt underline underline-offset-4 hover:text-ink"
        >
          Gérer mon abonnement
        </Link>
      </div>
    </div>
  );
}
