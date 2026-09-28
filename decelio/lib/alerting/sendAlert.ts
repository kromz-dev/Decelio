import { Resend } from "resend";
import { db } from "@/lib/db";
import { logFailure } from "../log";
import type { BotAgent } from "@/lib/scanner/agents";
import { escapeHtml } from "../email/escapeHtml";
import { renderEmailLayout, renderVerdict, type EmailVerdictValue } from "../email/layout";
import { verdictForSiteStatus } from "../sites/site-status";
import { emailFrom } from "../email/from";

export type AlertKind = "REGRESSION" | "RESOLUTION";

export interface AlertSiteChange {
  siteId?: string;
  domain: string;
  cause: string;
  fix: string;
  /**
   * Robot de recherche décisif pour ce changement (celui d'entre les
   * `DEFAULT_PROBE_BOTS` qui a déterminé le nouveau statut), quand
   * l'appelant le connaît. Sert à nommer l'assistant dans le texte
   * d'alerte : jamais un robot d'entraînement (GPTBot, ClaudeBot) : ceux-là
   * restent informatifs et ne déclenchent pas d'alerte.
   */
  bot?: BotAgent;
  /**
   * Statut brut du moteur (OK, BLOQUÉ, COQUILLE VIDE, ERREUR, À VÉRIFIER…),
   * quand l'appelant le connaît. Sert uniquement à choisir le verdict
   * (forme + mot) affiché dans l'e-mail via `verdictForSiteStatus` ; sans
   * statut connu, un verdict par défaut est choisi selon `kind`.
   */
  status?: string;
}

/** Nom grand public de l'assistant derrière chaque robot de recherche. */
const SEARCH_ASSISTANT_LABEL: Partial<Record<BotAgent, string>> = {
  "OAI-SearchBot": "ChatGPT",
  "Claude-SearchBot": "Claude",
  PerplexityBot: "Perplexity",
};

/**
 * Phrase en français simple nommant l'assistant et précisant qu'il s'agit
 * du robot de **recherche** (jamais d'entraînement), sans jamais promettre
 * une citation ni dire que le site serait « invisible dans les réponses » —
 * Decelio ne mesure pas les citations (voir docs/08-constitution.md).
 */
export function searchBotAlertSentence(bot: BotAgent, kind: AlertKind): string {
  const label = SEARCH_ASSISTANT_LABEL[bot];
  if (!label) {
    throw new Error(`${bot} n'est pas un robot de recherche connu pour une alerte client.`);
  }
  return kind === "REGRESSION"
    ? `Le robot de recherche de ${label} (${bot}) ne peut plus lire le site.`
    : `Le robot de recherche de ${label} (${bot}) peut de nouveau lire le site.`;
}

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

/**
 * Choisit le verdict (forme + mot) à afficher pour un domaine : à partir du
 * statut brut du moteur quand l'appelant le fournit (`verdictForSiteStatus`),
 * sinon un défaut raisonnable selon le sens de l'alerte.
 */
function verdictFor(item: AlertSiteChange, kind: AlertKind): { value: EmailVerdictValue; label?: string } {
  if (item.status) {
    const value = verdictForSiteStatus(item.status);
    const upper = item.status.trim().toUpperCase();
    if (value === "inconnu" && (upper === "À VÉRIFIER" || upper === "A VERIFIER")) {
      return { value, label: "à vérifier" };
    }
    if (value === "inconnu" && (upper === "ERREUR" || upper === "ERROR")) {
      return { value, label: "erreur" };
    }
    return { value };
  }
  return { value: kind === "REGRESSION" ? "refuse" : "lu" };
}

export function renderAlertEmail(input: {
  kind: AlertKind;
  domains: AlertSiteChange[];
}): { subject: string; text: string; html: string } {
  const count = input.domains.length;
  const regression = input.kind === "REGRESSION";
  const subject = regression
    ? count === 1
      ? "Decelio : un domaine n'est plus lisible"
      : `Decelio : ${count} domaines ne sont plus lisibles`
    : count === 1
      ? "Decelio : un domaine est de nouveau lisible"
      : `Decelio : ${count} domaines sont de nouveau lisibles`;

  const intro = regression
    ? count === 1
      ? "Un passage du scan vient de constater que ce domaine n'est plus lisible par les assistants."
      : "Un passage du scan vient de constater que ces domaines ne sont plus lisibles par les assistants."
    : count === 1
      ? "Un passage du scan vient de constater que ce domaine est de nouveau lisible par les assistants."
      : "Un passage du scan vient de constater que ces domaines sont de nouveau lisibles par les assistants.";

  const causeFor = (item: AlertSiteChange): string =>
    item.bot ? `${searchBotAlertSentence(item.bot, input.kind)} ${item.cause}` : item.cause;

  const lines = input.domains.map(
    (item) => `${item.domain}\nCause : ${causeFor(item)}\nCorrectif : ${item.fix}`,
  );
  const text = `${intro}\n\n${lines.join("\n\n")}\n`;
  const html = renderEmailLayout({
    preheader: intro,
    bodyHtml: `
      <p>${escapeHtml(intro)}</p>
      ${input.domains
        .map((item) => {
          const verdict = verdictFor(item, input.kind);
          return `<h2 style="font-size: 16px; margin: 20px 0 4px 0;">${escapeHtml(item.domain)} : ${renderVerdict(verdict.value, verdict.label)}</h2>
      <p><strong>Cause :</strong> ${escapeHtml(causeFor(item))}</p>
      <p><strong>Correctif :</strong> ${escapeHtml(item.fix)}</p>`;
        })
        .join("")}
    `,
  });

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
      from: emailFrom(),
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

/**
 * Conservé pour les appelants existants : un domaine, gabarit de régression.
 * `bot` est optionnel et rétrocompatible : quand l'appelant connaît le
 * robot de recherche décisif (celui des `DEFAULT_PROBE_BOTS` qui a fait
 * basculer le statut), le texte de l'alerte le nomme explicitement.
 */
export async function sendRegressionAlert(
  to: string,
  domain: string,
  _oldStatus: string,
  newStatus: string,
  bot?: BotAgent,
) {
  const cause = newStatus;
  const site = await db.monitoredSite.findFirst({
    where: { url: domain, user: { email: to } },
    select: { id: true },
  });
  return sendUserDigest(to, "REGRESSION", [
    { siteId: site?.id, domain, cause, fix: suggestFix(cause), bot, status: newStatus },
  ]);
}
