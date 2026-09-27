import type { CmsKey, FirewallKey, PlatformGuidance } from "./types";

/**
 * Marche à suivre par pare-feu / CDN / hébergeur pour laisser passer un
 * robot de citation IA qui se heurte à un défi anti-bot ou à un refus direct
 * (401/403/429/503). Partagée entre les causes « défi de sécurité » et
 * « accès bloqué », dont le correctif est le même : autoriser ce robot dans
 * la couche qui l'intercepte avant même d'atteindre le site.
 */
export const AI_BOT_FIREWALL_GUIDANCE: Partial<Record<FirewallKey, PlatformGuidance>> = {
  cloudflare: {
    supported: true,
    steps: [
      "Sécurité > Bots (Security > Bots) : vérifiez que l'option qui laisse passer les robots vérifiés (Googlebot, Bingbot, et les robots IA reconnus par Cloudflare) est active, avant d'ajouter toute règle de blocage.",
      "Si le site a activé « AI Crawl Control » (anciennement AI Audit) : ouvrez l'onglet Crawlers, repérez ce robot et vérifiez qu'il n'est pas explicitement bloqué ; sinon autorisez-le.",
      "Si un défi (Turnstile / JS Challenge) apparaît malgré tout : Sécurité > WAF > Custom rules, créez une règle qui laisse passer ce robot (par son User-Agent, ou par le champ « Verified Bot ») avant les règles qui déclenchent un défi.",
    ],
    // Source : https://developers.cloudflare.com/ai-crawl-control/
    // https://developers.cloudflare.com/ai-crawl-control/features/manage-ai-crawlers
    // https://developers.cloudflare.com/use-cases/solutions/stop-malicious-bots/
    // https://developers.cloudflare.com/bots/get-started/super-bot-fight-mode/
  },
  sucuri: {
    supported: true,
    steps: [
      "Firewall > Access Control > Block User-Agents : vérifiez qu'aucune règle ne bloque ce robot (par exemple GPTBot, ClaudeBot, PerplexityBot).",
      "Le filtre « bot agressif » (aggressive bot filter) bloque les user-agents jugés non conformes à un vrai navigateur : si ce robot est mal reconnu, désactivez temporairement ce filtre pour confirmer que c'est bien la cause, puis affinez plutôt que de le laisser désactivé durablement.",
    ],
    // Source : https://docs.sucuri.net/website-firewall/whitelist-and-blacklist/block-user-agents/
  },
  wordfence: {
    supported: true,
    steps: [
      "Wordfence ne propose pas d'autoriser un robot par son simple user-agent — l'éditeur le déconseille explicitement, un user-agent se falsifiant trop facilement pour servir de preuve. Le réglage à ajuster est plutôt Firewall > Rate Limiting : un robot légitime mais trop actif peut y être bloqué comme un robot malveillant.",
      "Augmentez le seuil de tolérance du Rate Limiting pour les visiteurs qui se déclarent comme robots de recherche, ou ajoutez l'IP du robot si son éditeur en publie une liste fixe et vérifiable (ce n'est pas le cas de la plupart des robots IA à ce jour : à vérifier au cas par cas auprès de l'éditeur du robot avant de s'y fier).",
    ],
    // Source : https://www.wordfence.com/help/firewall/rate-limiting/
  },
  imperva: {
    supported: true,
    steps: [
      "Dans la configuration Bot Management d'Imperva : ajoutez ce robot à la liste « Good Bots », ou retirez-le d'une liste d'exclusion (« Bad Bots » / bots retirés de la liste par défaut) s'il y a été ajouté par erreur.",
    ],
    note: "Le nom exact des écrans dans la console Imperva actuelle n'a pas pu être reconfirmé pendant la rédaction de ce catalogue (documentation consultée via la ressource Terraform et les pages produit, pas la console elle-même).",
    // Source : https://www.imperva.com/learn/application-security/bot-management/
    // https://registry.terraform.io/providers/imperva/incapsula/latest/docs/resources/bots_configuration
    unverified: true,
  },
  hostingOvh: {
    supported: false,
    steps: [],
    note: "Sur un hébergement mutualisé OVH, le pare-feu applicatif (mod_security) se pilote uniquement en Marche/Arrêt depuis l'espace client : il n'existe pas de liste blanche par user-agent réglable par le client. Si ce pare-feu bloque le robot, les seules options sont de le désactiver entièrement (protection réduite pour tout le site) ou de contacter le support OVHcloud pour signaler le faux positif.",
    // Source : fils de discussion officiels community.ovhcloud.com sur le pare-feu applicatif des
    // hébergements mutualisés ; la documentation officielle docs.ovhcloud.com n'a pas pu être
    // consultée directement pendant la rédaction de ce catalogue (accès réseau restreint) — à
    // reconfirmer auprès du support OVHcloud avant d'agir.
    unverified: true,
  },
  hostingO2switch: {
    supported: true,
    steps: [
      "Dans cPanel : section Sécurité, outil Tiger Protect (WAF maison o2switch) ou ModSecurity : consultez les règles déclenchées pour ce robot et ajoutez une exception si l'interface le permet.",
    ],
    note: "Le support o2switch indique qu'il n'est pas possible de mettre une adresse IP en liste blanche sur du mutualisé standard ; la marge de manœuvre pour autoriser un robot précis semble donc limitée, et doit être confirmée au cas par cas avec leur support avant de promettre un résultat au client.",
    // Source : faq.o2switch.fr (pages Tiger Protect / ModSecurity / liste blanche pare-feu, consultées
    // via extraits de recherche ; l'accès direct à faq.o2switch.fr a été bloqué pendant la rédaction
    // de ce catalogue) — à revérifier avant application.
    unverified: true,
  },
  hostingHostinger: {
    supported: true,
    steps: [
      "Dans hPanel : Performance > CDN > AI Audit, autorisez explicitement ce robot IA par son user-agent plutôt que de le bloquer.",
      "Si le blocage vient du pare-feu général plutôt que de l'AI Audit : Avancé > Gestionnaire d'IP (IP Manager), vérifiez qu'aucune plage ne bloque les adresses IP publiées par l'éditeur du robot.",
    ],
    note: "Le chemin de menu exact (« Performance > CDN > AI Audit ») provient d'un article de blog Hostinger consulté via un résumé de recherche ; la page officielle n'a pas pu être rechargée directement pendant la rédaction de ce catalogue — à reconfirmer dans hPanel avant application.",
    // Source : hostinger.com/blog/cdn-ai-audit ; docs.hostinger.com/websites/ip-access-rules
    unverified: true,
  },
  hostingGandi: {
    supported: false,
    steps: [],
    note: "Aucune documentation Gandi trouvée décrivant un pare-feu applicatif ou un contrôle de robots pilotable par le client sur Simple Hosting. Si un blocage est constaté, il s'agit plus probablement d'un réglage côté CMS (voir la section correspondante ci-dessus) que de l'hébergeur : à vérifier directement auprès du support Gandi si le doute persiste.",
    unverified: true,
  },
};

/**
 * Vérifications côté CMS souvent responsables d'un blocage total (401/403),
 * indépendamment de tout pare-feu : un site encore protégé par un mot de
 * passe ou en mode « bientôt disponible » refuse l'accès à tous les
 * visiteurs, robots inclus. Ces réglages n'ont pas pu être resourcés
 * individuellement pendant la rédaction de ce catalogue : à vérifier avant
 * de les présenter comme la cause certaine.
 */
export const ACCESS_BLOCKED_CMS_GUIDANCE: Partial<Record<CmsKey, PlatformGuidance>> = {
  shopify: {
    supported: true,
    steps: [
      "Vérifiez que la boutique n'est plus protégée par un mot de passe (Boutique en ligne > Préférences > Protection par mot de passe) : tant qu'elle l'est, tous les visiteurs reçoivent un refus, pas seulement les robots IA.",
    ],
    unverified: true,
  },
  wix: {
    supported: true,
    steps: [
      "Vérifiez que le site est bien publié (et non plus en mode brouillon/prévisualisation), et qu'aucune protection par mot de passe n'est active dans les réglages du site.",
    ],
    unverified: true,
  },
  squarespace: {
    supported: true,
    steps: [
      "Vérifiez qu'aucune protection par mot de passe n'est activée sur le site (Réglages > Protection par mot de passe) : un site protégé refuse l'accès à tout le monde, y compris aux robots.",
    ],
    unverified: true,
  },
  wordpress: {
    supported: true,
    steps: [
      "Vérifiez qu'aucune extension de type « mode maintenance » ou « bientôt disponible » ne renvoie un blocage général du site.",
    ],
    unverified: true,
  },
};
