import { Resend } from "resend";
import { db } from "@/lib/db";
import { logFailure } from "../log";

export type AlertKind = "REGRESSION" | "RESOLUTION";

export interface AlertSiteChange {
  siteId?: string;
  domain: string;
  cause: string;
  fix: string;
}

const FROM = "Decelio <bonjour@decelio.app>";

export function suggestFix(cause: string): string {
  if (/robots\.txt/i.test(cause)) {
    return "Retirez la règle qui interdit cet assistant dans robots.txt, puis relancez un scan.";
  }
  if (/javascript|coquille/i.test(cause)) {
    return "Servez le texte principal dans le HTML, sans attendre le JavaScript, puis relancez un scan.";
  }
  if (/injoignable|http 5|erreur/i.test(cause)) {
    return "Vérifiez que le site répond. Une panne ponctuelle n'est pas un blocage. Relancez un scan ensuite.";
  }
  if (/403|challenge|pare-feu|bloqu/i.test(cause)) {
    return "Autorisez les user-agents des assistants dans le pare-feu, puis relancez un scan.";
  }
  return "Ouvrez la fiche du domaine, corrigez la cause indiquée, puis relancez un scan.";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function renderAlertEmail(input: {
  kind: AlertKind;
  domains: AlertSiteChange[];
}): { subject: string; text: string; html: string } {
  const count = input.domains.length;
  const regression = input.kind === "REGRESSION";
  const subject = regression
    ? count === 1
      ? "Decelio — un domaine n'est plus lisible"
      : `Decelio — ${count} domaines ne sont plus lisibles`
    : count === 1
      ? "Decelio — un domaine est de nouveau lisible"
      : `Decelio — ${count} domaines sont de nouveau lisibles`;

  const intro = regression
    ? count === 1
      ? "Un passage du scan vient de constater que ce domaine n'est plus lisible par les assistants."
      : "Un passage du scan vient de constater que ces domaines ne sont plus lisibles par les assistants."
    : count === 1
      ? "Un passage du scan vient de constater que ce domaine est de nouveau lisible par les assistants."
      : "Un passage du scan vient de constater que ces domaines sont de nouveau lisibles par les assistants.";

  const lines = input.domains.map(
    (item) => `${item.domain}\nCause : ${item.cause}\nCorrectif : ${item.fix}`,
  );
  const text = `${intro}\n\n${lines.join("\n\n")}\n`;
  const html = `<div style="font-family: sans-serif; max-width: 600px;">
    <p>${escapeHtml(intro)}</p>
    ${input.domains
      .map(
        (item) => `<h2 style="font-size: 16px;">${escapeHtml(item.domain)}</h2>
      <p><strong>Cause :</strong> ${escapeHtml(item.cause)}</p>
      <p><strong>Correctif :</strong> ${escapeHtml(item.fix)}</p>`,
      )
      .join("")}
  </div>`;

  return { subject, text, html };
}

/** Domaines concernés par un envoi, pour les logs : jamais l'adresse e-mail du destinataire. */
function domainsSummary(domains: AlertSiteChange[]): string {
  return domains.map((item) => item.domain).join(", ");
}

async function deliver(
  to: string,
  email: { subject: string; text: string; html: string },
  domains: AlertSiteChange[],
) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    logFailure("alert.missing_api_key", { domains: domainsSummary(domains) });
    return { success: false as const, error: "No API Key" };
  }
  try {
    const response = await new Resend(apiKey).emails.send({
      from: FROM,
      to,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });
    // Le SDK Resend ne leve PAS sur un rejet : il resout avec
    // `{ data: null, error: {...} }`. Sans ce controle, un envoi refuse
    // etait rapporte comme reussi — et pour une alerte, une ligne
    // `AlertEvent` etait ecrite affirmant que le client avait ete
    // prevenu alors qu'aucun e-mail n'etait parti.
    if (response.error) {
      console.error("Echec d'envoi (deliver) :", response.error);
      return { success: false as const, error: response.error };
    }

    return { success: true as const, id: response.data?.id };
  } catch (error) {
    logFailure("alert.send_failed", {
      domains: domainsSummary(domains),
      message: error instanceof Error ? error.message : "unknown",
    });
    return { success: false as const, error };
  }
}

async function recordAlerts(kind: AlertKind, domains: AlertSiteChange[]) {
  const rows = domains.filter((item) => item.siteId);
  if (rows.length === 0) return;
  await db.alertEvent.createMany({
    data: rows.map((item) => ({
      siteId: item.siteId as string,
      type: kind,
      cause: item.cause,
      fix: item.fix,
      channel: "EMAIL",
    })),
  });
}

export async function listRecentAlerts(userId: string) {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  return db.alertEvent.findMany({
    where: { site: { userId }, sentAt: { gte: since } },
    orderBy: { sentAt: "desc" },
    select: {
      id: true,
      type: true,
      cause: true,
      fix: true,
      sentAt: true,
      site: { select: { id: true, url: true } },
    },
  });
}

/**
 * Un seul e-mail pour tous les domaines d'un compte lors d'un passage du scan,
 * puis une ligne AlertEvent par domaine concerné (T026) pour que le journal
 * ne rate jamais une alerte réellement envoyée.
 */
export async function sendUserDigest(
  to: string,
  kind: AlertKind,
  domains: AlertSiteChange[],
) {
  if (domains.length === 0) return { success: true as const, skipped: true as const };
  const sent = await deliver(to, renderAlertEmail({ kind, domains }), domains);
  if (!sent.success) return sent;
  await recordAlerts(kind, domains);
  return sent;
}

/** Conservé pour les appelants existants : un domaine, gabarit de régression. */
export async function sendRegressionAlert(
  to: string,
  domain: string,
  _oldStatus: string,
  newStatus: string,
) {
  const cause = newStatus;
  const site = await db.monitoredSite.findFirst({
    where: { url: domain, user: { email: to } },
    select: { id: true },
  });
  return sendUserDigest(to, "REGRESSION", [
    { siteId: site?.id, domain, cause, fix: suggestFix(cause) },
  ]);
}
