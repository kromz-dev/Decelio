import { escapeHtml } from "./escapeHtml";

/**
 * Domaine de production Decelio. Toujours en dur, jamais lu depuis une
 * variable d'environnement : le logo et les liens de pied de page d'un
 * e-mail doivent pointer vers ce domaine, jamais vers un CDN tiers ni un
 * domaine de prévisualisation (docs/08-constitution.md : aucun appel à un
 * tiers).
 */
export const SITE_URL = "https://decelio.fr";

/** Jetons de couleur communs à tous les e-mails, alignés sur l'identité du site. */
export const EMAIL_COLORS = {
  background: "#f3f5f8",
  card: "#ffffff",
  text: "#18213a",
  textSecondary: "#5a6478",
  brand: "#1d4ca4",
  buttonBackground: "#18213a",
  buttonText: "#ffffff",
} as const;

/**
 * Pile de polices système uniquement : aucune police web ne se charge de
 * façon fiable dans les clients mail, et charger une ressource tierce
 * enverrait l'IP du destinataire à un service externe.
 */
const FONT_STACK =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export interface RenderEmailLayoutOptions {
  /** Texte d'aperçu (masqué visuellement, lu par le client mail dans la liste des messages). */
  preheader?: string;
  /**
   * HTML du corps du message. Construit et échappé par l'appelant : cette
   * fonction ne réchappe pas `bodyHtml` (voir escapeHtml.ts pour les valeurs
   * variables individuelles).
   */
  bodyHtml: string;
  /**
   * Nom de la marque à afficher à la place du logo et du nom Decelio, pour
   * un e-mail envoyé au nom d'une agence à ses propres clients (marque
   * blanche). Quand elle est fournie, ni le logo ni le nom Decelio,
   * ni les liens de pied de page vers decelio.fr n'apparaissent.
   */
  brand?: string;
}

function renderHeader(brand?: string): string {
  if (brand) {
    const safeBrand = escapeHtml(brand);
    return `
      <tr>
        <td style="padding: 28px 32px 20px 32px;">
          <span style="font-family: ${FONT_STACK}; font-size: 20px; font-weight: 700; color: ${EMAIL_COLORS.text};">${safeBrand}</span>
        </td>
      </tr>`;
  }

  return `
    <tr>
      <td style="padding: 28px 32px 20px 32px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="vertical-align: middle;">
              <img src="${SITE_URL}/logo-decelio.png" alt="" height="28" style="height: 28px; width: auto; display: block; border: 0;" />
            </td>
            <td style="vertical-align: middle; padding-left: 4px;">
              <span style="font-family: ${FONT_STACK}; font-size: 20px; font-weight: 700; color: ${EMAIL_COLORS.text}; letter-spacing: -0.02em;">Decelio</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

function renderFooter(brand?: string): string {
  if (brand) {
    // Marque blanche : aucun lien ni mention Decelio dans le pied de page.
    return "";
  }

  return `
    <tr>
      <td style="padding: 20px 32px 28px 32px; font-family: ${FONT_STACK}; font-size: 12px; color: ${EMAIL_COLORS.textSecondary};">
        <p style="margin: 0 0 6px 0;">Une question ? <a href="mailto:contact@decelio.fr" style="color: ${EMAIL_COLORS.brand}; text-decoration: none;">contact@decelio.fr</a></p>
        <p style="margin: 0;"><a href="${SITE_URL}/confidentialite" style="color: ${EMAIL_COLORS.textSecondary}; text-decoration: underline;">Confidentialité</a></p>
      </td>
    </tr>`;
}

/**
 * Gabarit commun à tous les e-mails Decelio : structure en tableaux pour la
 * compatibilité Outlook, styles en ligne, largeur maximale de 600px, pile de
 * polices système, sans aucune ressource tierce.
 */
export function renderEmailLayout({ preheader, bodyHtml, brand }: RenderEmailLayoutOptions): string {
  const safePreheader = preheader ? escapeHtml(preheader) : "";

  return `<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <title>Decelio</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: ${EMAIL_COLORS.background}; font-family: ${FONT_STACK};">
    ${safePreheader ? `<div style="display: none; max-height: 0; overflow: hidden; opacity: 0;">${safePreheader}</div>` : ""}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${EMAIL_COLORS.background};">
      <tr>
        <td align="center" style="padding: 32px 16px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width: 100%; max-width: 600px; background-color: ${EMAIL_COLORS.card}; border-radius: 14px; overflow: hidden;">
            ${renderHeader(brand)}
            <tr>
              <td style="padding: 4px 32px 28px 32px; font-family: ${FONT_STACK}; font-size: 15px; line-height: 1.6; color: ${EMAIL_COLORS.text};">
                ${bodyHtml}
              </td>
            </tr>
            ${renderFooter(brand)}
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/** Bouton principal en pilule, fond sombre et texte blanc, pour un appel à l'action. */
export function renderButton(href: string, label: string): string {
  const safeHref = escapeHtml(href);
  const safeLabel = escapeHtml(label);
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 24px 0;"><tr><td style="border-radius: 999px; background-color: ${EMAIL_COLORS.buttonBackground};"><a href="${safeHref}" style="display: inline-block; padding: 12px 24px; font-family: ${FONT_STACK}; font-size: 15px; font-weight: 600; color: ${EMAIL_COLORS.buttonText}; text-decoration: none; border-radius: 999px;">${safeLabel}</a></td></tr></table>`;
}

export type EmailVerdictValue = "lu" | "refuse" | "vide" | "inconnu";

const VERDICT_GLYPH: Record<EmailVerdictValue, string> = {
  lu: "●",
  refuse: "■",
  vide: "▲",
  inconnu: "○",
};

const VERDICT_COLOR: Record<EmailVerdictValue, string> = {
  lu: "#177249",
  refuse: "#be2b2b",
  vide: "#8f5a00",
  inconnu: "#5d6880",
};

const VERDICT_WORD: Record<EmailVerdictValue, string> = {
  lu: "Lu",
  refuse: "Refusé",
  vide: "Vide",
  inconnu: "Inconnu",
};

/**
 * Verdict d'e-mail : TOUJOURS une forme ET un mot, jamais une couleur seule,
 * pour rester lisible sans la couleur (daltonisme, client mail en texte
 * brut réduit, impression). `label` remplace le mot par défaut (ex.
 * « à vérifier » pour un statut inconnu).
 */
export function renderVerdict(value: EmailVerdictValue, label?: string): string {
  const word = label ? escapeHtml(label) : VERDICT_WORD[value];
  const color = VERDICT_COLOR[value];
  return `<span style="color: ${color}; font-weight: 600;">${VERDICT_GLYPH[value]} ${word}</span>`;
}
