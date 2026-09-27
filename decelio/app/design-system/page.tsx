import type { Metadata } from "next";
import { Download, Plus, Search, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Verdict, VERDICTS, type VerdictValue } from "@/components/ui/verdict";
import { Wordmark } from "@/components/home/SiteChrome";
import { RingsWatermark } from "@/components/home/MarketingBits";
import { describePlatform } from "@/components/scan/platformLabel";

export const metadata: Metadata = {
  title: "Système de design | Decelio",
  description: "Jetons, composants et règles d'interface de Decelio. Page interne.",
  robots: { index: false, follow: false },
};

/* ------------------------------------------------------------------ */
/* Données d'exemple                                                    */
/* ------------------------------------------------------------------ */

const swatches: { name: string; token: string; light: string; dark: string; role: string }[] = [
  { name: "Papier", token: "--paper", light: "#f3f5f8", dark: "#0e131d", role: "Fond de page" },
  { name: "Surface", token: "--surface", light: "#ffffff", dark: "#151c29", role: "Cartes, tableaux, champs" },
  { name: "Surface 2", token: "--surface-2", light: "#e9edf2", dark: "#1e2736", role: "Survol, en-têtes" },
  { name: "Encre", token: "--ink", light: "#18213a", dark: "#e6eaf2", role: "Texte, action principale" },
  { name: "Encre 2", token: "--ink-2", light: "#5a6478", dark: "#a2acbf", role: "Texte secondaire" },
  { name: "Filet", token: "--line", light: "#d9dfe7", dark: "#273142", role: "Séparateurs" },
  { name: "Cobalt", token: "--cobalt", light: "#2b55d0", dark: "#8caaff", role: "Liens, focus" },
  { name: "Lu", token: "--ok", light: "#177249", dark: "#4fcb8e", role: "Verdict positif" },
  { name: "Refusé", token: "--stop", light: "#be2b2b", dark: "#f2716a", role: "Verdict bloqué" },
  { name: "Vide", token: "--warn", light: "#8f5a00", dark: "#e8a93f", role: "Verdict incomplet" },
  { name: "Inconnu", token: "--unknown", light: "#5d6880", dark: "#9aa4b8", role: "Non vérifié" },
];

type Row = {
  domain: string;
  client: string;
  chatgpt: VerdictValue;
  claude: VerdictValue;
  perplexity: VerdictValue;
  checked: string;
  since: string;
};

const rows: Row[] = [
  { domain: "maison-verdier.com", client: "Maison Verdier", chatgpt: "refuse", claude: "refuse", perplexity: "lu", checked: "04:12", since: "2 j" },
  { domain: "cabinet-lherbier.fr", client: "Cabinet Lherbier", chatgpt: "lu", claude: "lu", perplexity: "lu", checked: "04:12", since: "41 j" },
  { domain: "brasserie-du-nord.fr", client: "Brasserie du Nord", chatgpt: "vide", claude: "lu", perplexity: "vide", checked: "04:11", since: "6 j" },
  { domain: "clinique-des-lilas.fr", client: "Clinique des Lilas", chatgpt: "lu", claude: "lu", perplexity: "lu", checked: "04:11", since: "112 j" },
  { domain: "menuiserie-rocher.fr", client: "Menuiserie Rocher", chatgpt: "lu", claude: "inconnu", perplexity: "lu", checked: "04:10", since: "8 j" },
  { domain: "hotel-le-cap.com", client: "Hôtel Le Cap", chatgpt: "refuse", claude: "refuse", perplexity: "refuse", checked: "04:10", since: "1 j" },
  { domain: "boulangerie-martin.fr", client: "Boulangerie Martin", chatgpt: "lu", claude: "lu", perplexity: "lu", checked: "04:09", since: "63 j" },
];

/* ------------------------------------------------------------------ */
/* Blocs de la page                                                     */
/* ------------------------------------------------------------------ */

function Section({
  id,
  title,
  lead,
  children,
}: {
  id: string;
  title: string;
  lead?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="border-t border-line py-10 first:border-t-0">
      <div className="mb-6 max-w-2xl">
        <h2 className="text-xl font-semibold text-ink">{title}</h2>
        {lead && <p className="mt-1.5 text-sm leading-6 text-ink-2">{lead}</p>}
      </div>
      {children}
    </section>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="mb-3 type-table font-medium text-ink-2">{children}</div>;
}

function Marque() {
  const examplePlatform = describePlatform({
    cms: "wordpress",
    seoPlugin: "yoast",
    firewall: "cloudflare",
    signals: ["meta generator=WordPress", "en-tête X-Yoast-SEO", "règle Cloudflare Bot Fight Mode"],
  });
  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col items-start gap-3 rounded-lg border border-line bg-surface p-5">
          <Label>Sur fond clair</Label>
          <Wordmark size="lg" />
        </div>
        <div className="flex flex-col items-start gap-3 rounded-lg border border-line bg-ink p-5">
          <Label>Sur fond sombre (pied de page, en-tête d&apos;onboarding)</Label>
          <Wordmark light size="lg" />
        </div>
      </div>
      <div>
        <Label>Halo de marque : réservé au héros de la page d&apos;accueil marketing, jamais dans l&apos;application</Label>
        <div className="relative flex h-40 items-center justify-center overflow-hidden rounded-lg border border-line bg-surface">
          <RingsWatermark className="pointer-events-none absolute h-[260px] w-[260px] text-brand-soft" />
          <Wordmark size="lg" />
        </div>
      </div>
      <div>
        <Label>Plateforme détectée (fiche d&apos;un site, résultat du scan public)</Label>
        <div className="max-w-md rounded-lg border border-line bg-surface p-4">
          <p className="type-caption text-ink-2">
            <span className="font-medium text-ink">Plateforme détectée&nbsp;: </span>
            {examplePlatform} (d&apos;après les indices de la page)
          </p>
        </div>
      </div>
    </div>
  );
}

function Colors() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {swatches.map((s) => (
        <div key={s.token} className="overflow-hidden rounded-lg border border-line bg-surface">
          <div className="flex h-16">
            <div className="flex-1" style={{ background: s.light }} />
            <div className="flex-1" style={{ background: s.dark }} />
          </div>
          <div className="px-3 py-2.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-semibold text-ink">{s.name}</span>
              <code className="shrink-0 type-caption text-ink-2">{s.token}</code>
            </div>
            <div className="mt-0.5 type-caption text-ink-2">{s.role}</div>
            <div className="mt-1 flex gap-2 type-caption text-ink-3">
              <span>{s.light}</span>
              <span>{s.dark}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Typography() {
  return (
    <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
      <div className="flex flex-col gap-6">
        <div>
          <Label>Affichage, 700, clamp(36px, 56px), -0.025em</Label>
          <p className="type-display text-ink">Sachez avant votre client.</p>
        </div>
        <div>
          <Label>Titre 1 (page), 28px / 34px, 600, en font-display</Label>
          <p className="font-display text-[28px] leading-[34px] font-semibold tracking-[-0.02em] text-ink">Portefeuille</p>
          <p className="mt-1.5 type-caption text-ink-2">
            Depuis l&apos;harmonisation de septembre 2026, chaque titre de page de l&apos;application (Portefeuille,
            Alertes, Rapports, Paramètres) reprend Bricolage Grotesque, comme les titres marketing : c&apos;est le
            seul endroit où l&apos;application utilise cette famille.
          </p>
        </div>
        <div>
          <Label>Titre 2, 22px / 28px, 600</Label>
          <p className="text-[22px] leading-7 font-semibold tracking-[-0.015em] text-ink">2 sites refusés depuis hier</p>
        </div>
        <div>
          <Label>Titre 3, 17px / 24px, 600</Label>
          <p className="text-[17px] leading-6 font-semibold text-ink">Cause identifiée</p>
        </div>
        <div>
          <Label>Corps marketing, 17px / 26px, 400</Label>
          <p className="max-w-[60ch] text-[17px] leading-[26px] text-ink">
            Chaque matin, Decelio vérifie que ChatGPT, Claude et Perplexity lisent encore chacun des sites que vous
            maintenez. Quand un site casse, vous recevez la cause et le correctif avant que le client ne s&apos;en
            aperçoive.
          </p>
        </div>
        <div>
          <Label>Corps application, 14px / 20px, 400</Label>
          <p className="max-w-[64ch] text-sm leading-5 text-ink">
            Règle Cloudflare « Block AI bots » activée le 23 septembre à 18:40. GPTBot et ClaudeBot reçoivent un
            code 403 ; PerplexityBot passe encore.
          </p>
        </div>
        <div>
          <Label>Tableau, 13px / 18px, 400 et 500, chiffres tabulaires</Label>
          <p className="type-table text-ink">maison-verdier.com, vérifié à <span className="tnum">04:12</span>, <span className="tnum">1 248</span> mots lus</p>
        </div>
        <div>
          <Label>Légende, 12px / 16px, 400</Label>
          <p className="type-caption text-ink-2">Dernière vérification complète le 24 septembre 2026 à 04:12.</p>
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <Card size="sm">
          <CardHeader>
            <CardTitle>Une seule famille</CardTitle>
            <CardDescription>
              Schibsted Grotesk pour tout : marketing, application, rapport. Le mono est réservé aux extraits de
              code.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <div className="flex items-baseline justify-between"><span className="font-normal">Texte</span><span className="text-ink-2 tnum">400</span></div>
            <div className="flex items-baseline justify-between"><span className="font-medium">Interface, libellés</span><span className="text-ink-2 tnum">500</span></div>
            <div className="flex items-baseline justify-between"><span className="font-semibold">Titres</span><span className="text-ink-2 tnum">600</span></div>
            <div className="flex items-baseline justify-between"><span className="font-bold">Affichage</span><span className="text-ink-2 tnum">700</span></div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardTitle>Code, uniquement du code</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-sm bg-surface-2 p-3 type-caption leading-5 text-ink">
{`User-agent: GPTBot
Disallow: /`}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Buttons() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <Label>Variantes</Label>
        <div className="flex flex-wrap items-center gap-3">
          <Button>Ajouter un site</Button>
          <Button variant="outline">Voir le rapport</Button>
          <Button variant="secondary">Exporter</Button>
          <Button variant="ghost">Annuler</Button>
          <Button variant="destructive">Supprimer le site</Button>
          <Button variant="link">Ouvrir robots.txt</Button>
        </div>
      </div>
      <div>
        <Label>Tailles et icônes</Label>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm"><Plus data-icon="inline-start" />Site</Button>
          <Button size="default"><Plus data-icon="inline-start" />Ajouter un site</Button>
          <Button size="lg">Commencer la surveillance</Button>
          <Button size="xl" variant="outline">Voir un rapport d&apos;exemple</Button>
          <Button size="icon" variant="outline" aria-label="Télécharger le rapport"><Download /></Button>
          <Button size="icon-sm" variant="ghost" aria-label="Supprimer"><Trash2 /></Button>
        </div>
      </div>
      <div>
        <Label>États</Label>
        <div className="flex flex-wrap items-center gap-3">
          <Button disabled>Ajouter un site</Button>
          <Button variant="outline" disabled>Voir le rapport</Button>
          <Button aria-busy="true" disabled>Vérification en cours</Button>
        </div>
      </div>
    </div>
  );
}

function Fields({ prefix }: { prefix: string }) {
  return (
    <div className="grid max-w-3xl gap-6 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${prefix}-domain`} className="text-sm font-medium text-ink">
          Domaine du site
        </label>
        <Input id={`${prefix}-domain`} placeholder="maison-verdier.com" inputMode="url" />
        <p className="type-caption text-ink-2">Sans https ni chemin. Le site doit être public.</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${prefix}-client`} className="text-sm font-medium text-ink">
          Nom du client
        </label>
        <Input id={`${prefix}-client`} defaultValue="Maison Verdier" />
        <p className="type-caption text-ink-2">Apparaît sur le rapport mensuel.</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${prefix}-email`} className="text-sm font-medium text-ink">
          E-mail professionnel
        </label>
        <Input
          id={`${prefix}-email`}
          type="email"
          fieldSize="lg"
          defaultValue="sophie@atelier"
          aria-invalid="true"
          aria-describedby={`${prefix}-email-error`}
        />
        <p id={`${prefix}-email-error`} className="type-caption font-medium text-stop">
          Adresse incomplète : il manque le domaine après « @ ».
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${prefix}-plan`} className="text-sm font-medium text-ink">
          Formule
        </label>
        <Input id={`${prefix}-plan`} fieldSize="lg" defaultValue="Agence, 50 sites" disabled />
        <p className="type-caption text-ink-2">Modifiable depuis la facturation.</p>
      </div>
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <label htmlFor={`${prefix}-search`} className="sr-only">
          Filtrer les sites
        </label>
        <div className="relative max-w-sm">
          <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3" />
          <Input id={`${prefix}-search`} placeholder="Filtrer les sites" className="pl-9" />
        </div>
      </div>
    </div>
  );
}

function Verdicts() {
  const values = Object.keys(VERDICTS) as VerdictValue[];
  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {values.map((v) => (
          <Card key={v} size="sm">
            <CardHeader>
              <Verdict value={v} size="lg" />
              <CardDescription className="mt-2">{VERDICTS[v].description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div>
          <Label>Tampon, avec précision</Label>
          <div className="flex flex-wrap gap-2">
            <Verdict value="lu" detail="1 248 mots" />
            <Verdict value="refuse" detail="403" />
            <Verdict value="vide" detail="148 car." />
            <Verdict value="inconnu" detail="délai" />
          </div>
        </div>
        <div>
          <Label>En ligne, pour les tableaux</Label>
          <div className="flex flex-wrap gap-4">
            {values.map((v) => (
              <Verdict key={v} value={v} variant="inline" />
            ))}
          </div>
        </div>
        <div>
          <Label>Glyphe seul, colonnes étroites</Label>
          <div className="flex flex-wrap items-center gap-3">
            {values.map((v) => (
              <Verdict key={v} value={v} variant="glyph" size="lg" />
            ))}
          </div>
        </div>
      </div>
      <div>
        <Label>Contrôle sans couleur : les quatre formes restent distinctes en niveaux de gris</Label>
        <div className="flex flex-wrap gap-2 grayscale">
          {values.map((v) => (
            <Verdict key={v} value={v} />
          ))}
        </div>
      </div>
    </div>
  );
}

function PortfolioTable() {
  const counts = rows.reduce(
    (acc, r) => {
      for (const v of [r.chatgpt, r.claude, r.perplexity]) acc[v] += 1;
      return acc;
    },
    { lu: 0, refuse: 0, vide: 0, inconnu: 0 } as Record<VerdictValue, number>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 type-table text-ink-2">
          <span className="font-medium text-ink">{rows.length} sites</span>
          <Verdict value="lu" variant="inline" detail={counts.lu} />
          <Verdict value="refuse" variant="inline" detail={counts.refuse} />
          <Verdict value="vide" variant="inline" detail={counts.vide} />
          <Verdict value="inconnu" variant="inline" detail={counts.inconnu} />
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary"><Download data-icon="inline-start" />Exporter</Button>
          <Button size="sm"><Plus data-icon="inline-start" />Ajouter un site</Button>
        </div>
      </div>
      <div className="overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full min-w-[720px] border-collapse type-table">
          <caption className="sr-only">Verdicts par assistant pour chaque site du portefeuille</caption>
          <thead>
            <tr className="border-b border-ink text-left type-caption font-medium text-ink-2">
              <th scope="col" className="px-4 py-2.5 font-medium">Site</th>
              <th scope="col" className="px-3 py-2.5 font-medium">ChatGPT</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Claude</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Perplexity</th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">Vérifié</th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">Stable depuis</th>
              <th scope="col" className="px-4 py-2.5"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.domain} className="h-11 border-b border-line last:border-b-0 hover:bg-paper">
                <td className="px-4 py-2">
                  <div className="font-medium text-ink">{r.domain}</div>
                  <div className="type-caption text-ink-2">{r.client}</div>
                </td>
                <td className="px-3 py-2"><Verdict value={r.chatgpt} variant="inline" /></td>
                <td className="px-3 py-2"><Verdict value={r.claude} variant="inline" /></td>
                <td className="px-3 py-2"><Verdict value={r.perplexity} variant="inline" /></td>
                <td className="px-3 py-2 text-right text-ink-2 tnum">{r.checked}</td>
                <td className="px-3 py-2 text-right text-ink-2 tnum">{r.since}</td>
                <td className="px-4 py-2 text-right">
                  <Button size="sm" variant="ghost">Détail</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AlertRow({
  value,
  title,
  cause,
  fix,
  when,
  handled,
}: {
  value: VerdictValue;
  title: string;
  cause: string;
  fix: string;
  when: string;
  handled?: boolean;
}) {
  return (
    <article
      className={
        "grid gap-x-4 gap-y-2 rounded-lg border border-line bg-surface p-4 sm:grid-cols-[auto_1fr_auto] " +
        (handled ? "opacity-70" : "")
      }
    >
      <div className="pt-0.5"><Verdict value={value} variant="glyph" size="lg" /></div>
      <div className="min-w-0">
        <h3 className="text-[15px] leading-5 font-semibold text-ink">{title}</h3>
        <dl className="mt-1.5 grid gap-1 text-sm leading-5 sm:grid-cols-[auto_1fr] sm:gap-x-3">
          <dt className="font-medium text-ink-2">Cause</dt>
          <dd className="text-ink">{cause}</dd>
          <dt className="font-medium text-ink-2">Correctif</dt>
          <dd className="text-ink">{fix}</dd>
        </dl>
      </div>
      <div className="flex items-start justify-between gap-3 sm:flex-col sm:items-end">
        <time className="type-caption text-ink-2 tnum">{when}</time>
        <div className="flex gap-2">
          <Button size="sm" variant="outline">Voir le site</Button>
          {!handled && <Button size="sm">Marquer traité</Button>}
        </div>
      </div>
    </article>
  );
}

function Alerts() {
  return (
    <div className="flex max-w-4xl flex-col gap-3">
      <AlertRow
        value="refuse"
        title="GPTBot et ClaudeBot refusés sur maison-verdier.com"
        cause="Règle Cloudflare « Block AI bots » activée le 23 septembre à 18:40. Code 403 sur toutes les pages."
        fix="Dans Cloudflare, Sécurité, Bots : désactiver « Block AI bots » ou ajouter une exception pour GPTBot, ClaudeBot et PerplexityBot."
        when="Aujourd'hui, 04:12"
      />
      <AlertRow
        value="vide"
        title="Perplexity ne lit plus que 148 caractères sur atelier-boreal.fr"
        cause="Le thème charge le contenu en JavaScript depuis la mise à jour du 18 septembre."
        fix="Réactiver le rendu côté serveur du thème, ou servir une version pré-rendue aux robots vérifiés."
        when="Hier, 04:11"
      />
      <AlertRow
        value="lu"
        title="hotel-le-cap.com est de nouveau lu par les trois assistants"
        cause="Règle Wordfence « Bloquer les faux robots Google » désactivée par votre équipe."
        fix="Aucune action. La capture avant / après est jointe au rapport de septembre."
        when="21 sept., 04:10"
        handled
      />
    </div>
  );
}

function Surfaces({ prefix }: { prefix: string }) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>Rapport de septembre</CardTitle>
          <CardDescription>42 sites, 39 lus tous les jours, 3 incidents résolus en moins de 48 h.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Badge>PDF, 6 pages</Badge>
          <Badge variant="info">Logo agence</Badge>
          <Badge variant="ok">Envoyé le 1er oct.</Badge>
        </CardContent>
        <CardFooter>
          <Button size="sm" variant="outline"><Download data-icon="inline-start" />Télécharger</Button>
          <Button size="sm" variant="ghost">Aperçu</Button>
        </CardFooter>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Étiquettes</CardTitle>
          <CardDescription>Pour un plan, un canal ou un compteur. Jamais pour un verdict.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            <Badge>Freelance</Badge>
            <Badge variant="outline">E-mail</Badge>
            <Badge variant="ink">Slack</Badge>
            <Badge variant="info">Nouveau</Badge>
            <Badge variant="warn">Essai, 9 j</Badge>
            <Badge variant="stop">Impayé</Badge>
          </div>
          <Separator />
          <div className="flex items-center gap-3">
            <AvatarGroup>
              <Avatar><AvatarFallback>SM</AvatarFallback></Avatar>
              <Avatar><AvatarFallback>JL</AvatarFallback></Avatar>
              <Avatar><AvatarFallback>AB</AvatarFallback></Avatar>
              <AvatarGroupCount>+2</AvatarGroupCount>
            </AvatarGroup>
            <span className="text-sm text-ink-2">5 membres dans l&apos;agence</span>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Questions fréquentes</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion defaultValue={[`${prefix}-q1`]}>
            <AccordionItem value={`${prefix}-q1`}>
              <AccordionTrigger>Faut-il installer quelque chose chez le client ?</AccordionTrigger>
              <AccordionContent>
                Non. Decelio interroge le site depuis l&apos;extérieur, comme le font les assistants. Une lecture seule
                de Cloudflare permet en plus de voir les règles qui bloquent.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value={`${prefix}-q2`}>
              <AccordionTrigger>À quelle heure a lieu la vérification ?</AccordionTrigger>
              <AccordionContent>Chaque nuit vers 04:00, heure de Paris. Une vérification manuelle est possible à tout moment.</AccordionContent>
            </AccordionItem>
            <AccordionItem value={`${prefix}-q3`}>
              <AccordionTrigger>Et si le client veut bloquer les robots IA ?</AccordionTrigger>
              <AccordionContent>Le site est marqué « blocage voulu » ; il reste surveillé mais n&apos;alerte plus.</AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}

function Showcase({ prefix, theme }: { prefix: string; theme: "Clair" | "Sombre" }) {
  return (
    <div className="bg-paper text-ink">
      <div className="mx-auto max-w-[1120px] px-4 sm:px-6">
        <div className="flex items-center justify-between gap-4 py-4">
          <span className="type-table font-medium text-ink-2">Thème {theme.toLowerCase()}</span>
          <Badge variant="outline">{theme === "Clair" ? "marketing et application" : "application"}</Badge>
        </div>
        <Section id={`${prefix}-marque`} title="Marque" lead="Le logo est un « D » tracé en anneaux concentriques, toujours suivi du mot « Decelio » : seul, il n'est pas encore reconnaissable.">
          <Marque />
        </Section>
        <Section id={`${prefix}-couleurs`} title="Couleurs" lead="Onze jetons. Le chrome est monochrome ; la couleur est réservée aux verdicts et à l'interactif. Chaque carte montre la valeur claire puis la valeur sombre.">
          <Colors />
        </Section>
        <Section id={`${prefix}-typo`} title="Typographie" lead="Schibsted Grotesk, une seule famille. L'échelle suit le rôle du texte, pas la place disponible.">
          <Typography />
        </Section>
        <Section id={`${prefix}-boutons`} title="Boutons" lead="Une action principale par écran, en encre pleine. Le libellé est un verbe, sans flèche.">
          <Buttons />
        </Section>
        <Section id={`${prefix}-champs`} title="Champs" lead="Étiquette visible au-dessus, aide en dessous, erreur en texte. Hauteur 36 px dans l'application, 44 px dans les formulaires marketing.">
          <Fields prefix={prefix} />
        </Section>
        <Section id={`${prefix}-verdicts`} title="Verdicts" lead="Quatre états, chacun porté par une forme, un mot et une couleur. Le glyphe ne se lit jamais seul dans un rapport.">
          <Verdicts />
        </Section>
        <Section id={`${prefix}-tableau`} title="Tableau du portefeuille" lead="Densité : lignes de 44 px, texte 13 px, chiffres tabulaires alignés à droite, règle d'encre sous l'en-tête, filets légers entre les lignes.">
          <PortfolioTable />
        </Section>
        <Section id={`${prefix}-alertes`} title="Alertes" lead="Chaque alerte donne le verdict, la cause datée et le correctif. Une alerte résolue reste visible mais s'efface.">
          <Alerts />
        </Section>
        <Section id={`${prefix}-surfaces`} title="Cartes, étiquettes, accordéon" lead="Surfaces sans ombre, filet 1 px, rayon 10 px. L'ombre n'existe que pour les menus et les boîtes de dialogue.">
          <Surfaces prefix={prefix} />
        </Section>
      </div>
    </div>
  );
}

export default function DesignSystemPage() {
  return (
    <main className="min-h-screen bg-paper text-ink">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-[1120px] flex-col gap-6 px-4 py-10 sm:px-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="type-table font-medium text-ink-2">Decelio, page interne</p>
            <h1 className="mt-2 text-[28px] leading-[34px] font-semibold tracking-[-0.02em] text-ink sm:text-[36px] sm:leading-10">
              Système de design
            </h1>
            <p className="mt-3 text-[15px] leading-6 text-ink-2">
              Chrome silencieux, verdicts parlants. L&apos;interface est en papier et en encre ; la couleur dit
              seulement si un site est lu, refusé, vide ou inconnu. Tout est daté, rien n&apos;est décoratif.
            </p>
          </div>
          <ol className="grid gap-x-8 gap-y-1.5 text-sm text-ink-2 sm:grid-cols-2 lg:w-[440px]">
            <li><span className="font-medium text-ink">1.</span> Une action principale par écran</li>
            <li><span className="font-medium text-ink">2.</span> Un verdict, c&apos;est une forme et un mot</li>
            <li><span className="font-medium text-ink">3.</span> Filets avant ombres</li>
            <li><span className="font-medium text-ink">4.</span> Tout état porte sa date</li>
            <li><span className="font-medium text-ink">5.</span> Le mouvement répond, il n&apos;accueille pas</li>
          </ol>
        </div>
      </header>
      <div id="light">
        <Showcase prefix="l" theme="Clair" />
      </div>
      <div id="dark" className="dark">
        <Showcase prefix="d" theme="Sombre" />
      </div>
    </main>
  );
}
