import Link from "next/link";

import { AuthShell } from "@/components/home/AuthShell";
import { safeCallbackUrl } from "@/lib/auth-route-policy";
import { LoginForm } from "./LoginForm";

/**
 * Page de connexion (T051, principe II) : le formulaire appelle réellement
 * `signIn("credentials", …)` via `LoginForm`, jamais un état simulé — avant
 * ce correctif, cette page pré-remplissait un e-mail et un mot de passe
 * inventés et redirigeait vers /dashboard sans la moindre vérification, quel
 * que soit ce qui était saisi. `LoginForm` existait déjà (T0xx, jamais
 * branché) et reste la seule voie de connexion par e-mail/mot de passe.
 *
 * `callbackUrl` vient du middleware (`middleware.ts`) quand un visiteur non
 * connecté tente d'atteindre une page protégée ; `safeCallbackUrl` refuse
 * toute valeur qui ne serait pas un chemin interne (protection open-redirect,
 * même garde que dans `middleware.ts`).
 */
export default async function LoginPage(props: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await props.searchParams;
  const safeUrl = safeCallbackUrl(callbackUrl);

  return (
    <AuthShell
      eyebrow="Connexion"
      title="Content de vous revoir"
      lede="Accédez au portefeuille de votre agence et à l'historique des verdicts."
      footer={
        <>
          Pas encore de compte ?{" "}
          <Link href="/register" className="font-medium text-cobalt hover:underline">
            Créer mon compte
          </Link>
        </>
      }
    >
      <LoginForm callbackUrl={safeUrl} />
    </AuthShell>
  );
}
