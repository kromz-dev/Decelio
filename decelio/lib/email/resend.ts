import { Resend } from "resend";
import { escapeHtml } from "./escapeHtml";

function getResend(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is required to send emails.");
  }
  return new Resend(apiKey);
}

export async function sendPasswordResetEmail(to: string, token: string) {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <p>Bonjour,</p>
      <p>Vous avez demandé la réinitialisation du mot de passe de votre compte Decelio.</p>
      <p><a href="${resetUrl}">Choisir un nouveau mot de passe</a></p>
      <p>Ce lien est valable 1 heure. Ignorez cet e-mail si vous n'êtes pas à l'origine de la demande.</p>
      <br />
      <p>L'équipe Decelio</p>
    </div>
  `;

  try {
    const response = await getResend().emails.send({
      from: "Decelio <bonjour@decelio.fr>", // Domaine a verifier chez Resend (tache T068) : sans cela, aucun envoi ne part.
      to,
      subject: "Réinitialisation de votre mot de passe Decelio",
      html,
    });

    // Le SDK Resend ne leve PAS sur un rejet : il resout avec
    // `{ data: null, error: {...} }`. Sans ce controle, un envoi refuse
    // etait rapporte comme reussi — et pour une alerte, une ligne
    // `AlertEvent` etait ecrite affirmant que le client avait ete
    // prevenu alors qu'aucun e-mail n'etait parti.
    if (response.error) {
      console.error("Echec d'envoi (sendPasswordResetEmail) :", response.error);
      return { success: false, error: response.error };
    }

    return { success: true, id: response.data?.id };
  } catch (error) {
    console.error("Failed to send password reset email:", error);
    return { success: false, error };
  }
}

// T046 (EF-064/EF-065) : découverte écrite envoyée 3 jours après l'inscription.
// Réponse par simple retour d'e-mail, pas de formulaire — voir docs/06-kit-prospection.md §5.
export async function sendDiscoveryEmail(to: string, name?: string | null) {
  const greeting = name ? `Bonjour ${escapeHtml(name)},` : "Bonjour,";

  const html = `
    <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto;">
      <p>${greeting}</p>
      <p>Pour régler Decelio au plus près de votre usage, j'aurais besoin de 5 réponses courtes. Vous pouvez simplement répondre à cet e-mail.</p>
      <ol>
        <li>Combien de sites avez-vous sous contrat récurrent, et chez quels hébergeurs ?</li>
        <li>Que contient votre rapport mensuel aujourd'hui ? Combien de temps vous prend-il ?</li>
        <li>Un client vous a-t-il déjà parlé de ChatGPT ou de Perplexity ? Qu'avez-vous répondu ?</li>
        <li>Avez-vous déjà découvert un blocage (Cloudflare, plugin, hébergeur) <em>après</em> le client ?</li>
        <li>Que devrait contenir le rapport pour que vous l'envoyiez tel quel à vos clients ?</li>
      </ol>
      <br />
      <p>À bientôt,<br/>L'équipe Decelio</p>
    </div>
  `;

  try {
    const response = await getResend().emails.send({
      from: "Decelio <bonjour@decelio.fr>", // Domaine a verifier chez Resend (tache T068) : sans cela, aucun envoi ne part.
      to,
      subject: "5 questions pour régler Decelio sur votre parc",
      html,
    });

    // Le SDK Resend ne leve PAS sur un rejet : il resout avec
    // `{ data: null, error: {...} }`. Sans ce controle, un envoi refuse
    // etait rapporte comme reussi — et pour une alerte, une ligne
    // `AlertEvent` etait ecrite affirmant que le client avait ete
    // prevenu alors qu'aucun e-mail n'etait parti.
    if (response.error) {
      console.error("Echec d'envoi (sendDiscoveryEmail) :", response.error);
      return { success: false, error: response.error };
    }

    return { success: true, id: response.data?.id };
  } catch (error) {
    console.error("Failed to send discovery email:", error);
    return { success: false, error };
  }
}

export interface SendMonthlyReportReadyEmailOptions {
  to: string;
  recipientName?: string | null;
  agencyName?: string | null;
  period: string; // e.g. "2026-09"
  clientCount?: number;
  clientNames?: string[];
  reportUrl?: string;
}

export function formatReportPeriodFr(period: string): string {
  const parts = period.split("-");
  if (parts.length === 2) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    if (!isNaN(year) && !isNaN(month) && month >= 1 && month <= 12) {
      const date = new Date(Date.UTC(year, month - 1, 1));
      return new Intl.DateTimeFormat("fr-FR", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(date);
    }
  }
  return period;
}

/**
 * T048 : E-mail notifiant l'agence que son (ou ses) rapport(s) mensuel(s)
 * en marque blanche sont prêts.
 *
 * Pour respecter le palier gratuit Resend (100 e-mails/jour, §8.1
 * docs/10-plan-technique.md), cette fonction est conçue pour notifier l'agence
 * en une seule fois (1 e-mail par agence et non 1 e-mail par client).
 */
export async function sendMonthlyReportReadyEmail({
  to,
  recipientName,
  agencyName,
  period,
  clientCount,
  clientNames,
  reportUrl,
}: SendMonthlyReportReadyEmailOptions) {
  const greeting = recipientName
    ? `Bonjour ${escapeHtml(recipientName)},`
    : agencyName
      ? `Bonjour ${escapeHtml(agencyName)},`
      : "Bonjour,";

  const periodLabel = formatReportPeriodFr(period);
  const count = clientCount ?? (clientNames ? clientNames.length : 1);
  const isMultiple = count > 1;

  const subject = isMultiple
    ? `Vos rapports mensuels sont disponibles — ${periodLabel}`
    : `Votre rapport mensuel est disponible — ${periodLabel}`;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://decelio.fr";
  const targetUrl = reportUrl || `${appUrl}/reports`;

  const clientListHtml =
    clientNames && clientNames.length > 0
      ? `<p style="margin-bottom: 8px;"><strong>${
          isMultiple ? "Rapports disponibles pour :" : "Rapport disponible pour :"
        }</strong></p><ul style="margin-top: 0; padding-left: 20px;">${clientNames
          .map((name) => `<li style="margin-bottom: 4px;">${escapeHtml(name)}</li>`)
          .join("")}</ul>`
      : "";

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a; line-height: 1.5;">
      <p>${greeting}</p>
      <p>${
        isMultiple
          ? `Vos rapports mensuels sont disponibles pour la période de <strong>${periodLabel}</strong> (votre rapport mensuel est disponible pour chacun de vos ${count} clients).`
          : `Votre rapport mensuel est disponible pour la période de <strong>${periodLabel}</strong>.`
      }</p>
      ${clientListHtml}
      <p>Vous pouvez consulter et télécharger vos rapports PDF en marque blanche directement depuis votre espace :</p>
      <p style="margin: 24px 0;"><a href="${escapeHtml(targetUrl)}" style="display: inline-block; background-color: #0f172a; color: #ffffff; padding: 10px 18px; border-radius: 6px; text-decoration: none; font-weight: 500;">Accéder aux rapports</a></p>
      <p style="font-size: 13px; color: #64748b;">Ces rapports sont prêts à être partagés avec vos clients sous votre propre identité visuelle.</p>
      <br />
      <p>À bientôt,<br/>L'équipe Decelio</p>
    </div>
  `;

  const text = [
    greeting,
    "",
    isMultiple
      ? `Vos rapports mensuels sont disponibles pour la période de ${periodLabel} (votre rapport mensuel est disponible pour vos ${count} clients).`
      : `Votre rapport mensuel est disponible pour la période de ${periodLabel}.`,
    ...(clientNames && clientNames.length > 0
      ? [
          "",
          isMultiple ? "Rapports disponibles pour :" : "Rapport disponible pour :",
          ...clientNames.map((n) => `- ${n}`),
        ]
      : []),
    "",
    `Accéder aux rapports : ${targetUrl}`,
    "",
    "Ces rapports sont prêts à être partagés avec vos clients sous votre propre identité visuelle.",
    "",
    "À bientôt,",
    "L'équipe Decelio",
  ].join("\n");

  try {
    const response = await getResend().emails.send({
      from: "Decelio <bonjour@decelio.fr>", // Domaine a verifier chez Resend (tache T068) : sans cela, aucun envoi ne part.
      to,
      subject,
      html,
      text,
    });

    if (response.error) {
      console.error("Failed to send monthly report ready email:", response.error);
      return { success: false, error: response.error };
    }

    return { success: true, id: response.data?.id };
  } catch (error) {
    console.error("Failed to send monthly report ready email:", error);
    return { success: false, error };
  }
}

export const sendReportReadyEmail = sendMonthlyReportReadyEmail;

