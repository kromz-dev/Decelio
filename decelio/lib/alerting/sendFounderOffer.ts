import { Resend } from "resend";

function getResend(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is required to send the founder offer email.");
  }
  return new Resend(apiKey);
}

function formatDeadlineFr(deadline: Date): string {
  const formatted = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(deadline);
  return `jusqu'au ${formatted} inclus`;
}

export interface SendFounderOfferInput {
  email: string;
  name?: string | null;
  /** Date limite d'activation de l'offre ; doit être dans le futur. */
  deadline: Date;
}

export interface SendFounderOfferResult {
  success: boolean;
  id?: string;
  error?: unknown;
}

/**
 * T047 (EF-066) : e-mail d'offre fondatrice, déclenché à la main par le
 * fondateur après au moins 3 réponses positives au questionnaire de
 * découverte (règle qualitative, kit de prospection §5). Cette fonction ne
 * lit jamais les réponses elle-même — c'est une décision humaine en amont.
 *
 * Refuse d'envoyer si la date limite est déjà passée ou si le coupon
 * fondateur (STRIPE_FOUNDER_COUPON, créé manuellement dans Stripe — T037)
 * n'est pas configuré côté serveur.
 */
export async function sendFounderOffer({
  email,
  name,
  deadline,
}: SendFounderOfferInput): Promise<SendFounderOfferResult> {
  if (deadline.getTime() <= Date.now()) {
    throw new Error("La date limite de l'offre fondatrice doit être dans le futur.");
  }

  const couponCode = process.env.STRIPE_FOUNDER_COUPON;
  if (!couponCode) {
    throw new Error(
      "STRIPE_FOUNDER_COUPON n'est pas défini : impossible d'envoyer l'offre fondatrice sans code de coupon valide."
    );
  }

  const greeting = name ? `Bonjour ${name},` : "Bonjour,";
  const deadlineText = formatDeadlineFr(deadline);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const pricingUrl = appUrl ? `${appUrl}/pricing` : "/pricing";

  const html = `
    <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto;">
      <p>${greeting}</p>
      <p>Merci pour vos réponses. Vous faites partie des 10 premières agences : <strong>-50 % à vie</strong> sur le plan Agence si vous activez votre compte ${deadlineText}.</p>
      <p>Code à saisir au moment du paiement : <strong>${couponCode}</strong></p>
      <p>En échange : un retour écrit chaque mois sur votre usage de Decelio, et l'autorisation de citer votre agence.</p>
      <p><a href="${pricingUrl}">Activer mon offre fondatrice</a></p>
      <p>Cette offre est limitée à 10 comptes au total et expire ${deadlineText}.</p>
      <br />
      <p>À bientôt,<br/>L'équipe Decelio</p>
    </div>
  `;

  const text = [
    greeting,
    "",
    `Merci pour vos réponses. Vous faites partie des 10 premières agences : -50 % à vie sur le plan Agence si vous activez votre compte ${deadlineText}.`,
    "",
    `Code à saisir au moment du paiement : ${couponCode}`,
    "",
    "En échange : un retour écrit chaque mois sur votre usage de Decelio, et l'autorisation de citer votre agence.",
    "",
    `Activer mon offre fondatrice : ${pricingUrl}`,
    "",
    `Cette offre est limitée à 10 comptes au total et expire ${deadlineText}.`,
    "",
    "À bientôt,",
    "L'équipe Decelio",
  ].join("\n");

  try {
    const response = await getResend().emails.send({
      from: "Decelio <bonjour@decelio.fr>", // Domaine a verifier chez Resend (tache T068) : sans cela, aucun envoi ne part.
      to: email,
      subject: "Votre offre fondatrice Decelio : -50 % à vie",
      html,
      text,
    });

    if (response.error) {
      console.error("Failed to send founder offer email:", response.error);
      return { success: false, error: response.error };
    }

    return { success: true, id: response.data?.id };
  } catch (error) {
    console.error("Failed to send founder offer email:", error);
    return { success: false, error };
  }
}
