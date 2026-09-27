import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { db } from "@/lib/db"
import authConfig from "./auth.config"
import { verifyPassword, getDummyPasswordHash } from "@/lib/password"
import { loginSchema } from "@/lib/auth-validation"
import { callerKey, rateLimit } from "@/lib/rate-limit"
import { captureServerEvent, captureServerException } from "@/lib/posthog-server"
import { TERMS_VERSION } from "@/lib/legal/terms"
import {
  LOGIN_IP_LIMIT,
  LOGIN_IP_WINDOW_MS,
  LOGIN_EMAIL_LIMIT,
  LOGIN_EMAIL_WINDOW_MS,
  loginEmailRateLimitKey,
} from "@/lib/auth-login-policy"

/**
 * NextAuth v5 passe la `Request` d'origine en second argument à `authorize`
 * (voir `node_modules/@auth/core/providers/credentials.d.ts`). C'est ici,
 * avant toute lecture en base, qu'on limite le débit de connexion.
 *
 * `request` est optionnel uniquement pour les tests qui exercent la logique
 * d'identification sans vouloir couvrir la limitation de débit : NextAuth,
 * lui, l'appelle toujours avec la requête.
 */
export async function authorizeCredentials(credentials: unknown, request?: Request) {
  const parsed = loginSchema.safeParse(credentials);
  if (!parsed.success) return null;

  const { email, password } = parsed.data;

  if (request) {
    const [ipQuota, emailQuota] = await Promise.all([
      rateLimit(callerKey(request, "login"), LOGIN_IP_LIMIT, LOGIN_IP_WINDOW_MS),
      rateLimit(loginEmailRateLimitKey(email), LOGIN_EMAIL_LIMIT, LOGIN_EMAIL_WINDOW_MS),
    ]);
    if (!ipQuota.allowed || !emailQuota.allowed) {
      // Même échec générique qu'un mot de passe erroné : ne rien révéler.
      return null;
    }
  }

  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, image: true, passwordHash: true },
  });

  // Un e-mail inconnu, ou un compte sans mot de passe (inscrit via Google),
  // ne doit pas répondre plus vite qu'un mot de passe erroné : on vérifie
  // quand même contre un hash factice constant, au coût scrypt habituel.
  const hashToVerify = user?.passwordHash ?? (await getDummyPasswordHash());
  const passwordMatches = await verifyPassword(password, hashToVerify);

  if (!user?.passwordHash || !passwordMatches) {
    return null;
  }

  return { id: user.id, email: user.email, name: user.name, image: user.image };
}

/**
 * Ne se déclenche que pour un compte que l'adaptateur Prisma vient de créer
 * — donc jamais pour l'inscription par identifiants (le compte est déjà
 * inséré par `app/api/auth/register` avant que NextAuth n'intervienne),
 * seulement pour la toute première connexion via un fournisseur OAuth.
 * Google est aujourd'hui le seul fournisseur OAuth configuré
 * (`auth.config.ts`) : `method: "google"` est donc toujours exact ici.
 */
export async function handleUserCreated({ user }: { user: { id?: string } }) {
  if (!user.id) return;
  // Acceptation des CGV (T069) : elle repose sur la mention « En continuant
  // avec Google, vous acceptez les CGV » affichée à côté du bouton Google.
  //
  // `@auth/core` appelle cet événement sans try/catch (voir
  // node_modules/@auth/core/src/lib/actions/callback/handle-login.ts) : une
  // exception non rattrapée ici casserait toute la connexion. Or l'adaptateur
  // Prisma a déjà créé la ligne `User` avant que l'événement ne parte, donc
  // une nouvelle tentative de connexion Google ne redéclenche jamais
  // `createUser` — le compte resterait sans acceptation, définitivement, sans
  // rien pour le signaler. On préfère une connexion qui marche plus une
  // erreur bruyante plutôt qu'une connexion cassée ET aucune acceptation
  // enregistrée.
  //
  // Requête de rattrapage pour retrouver les comptes concernés : un compte
  // Google sans acceptation se reconnaît à `termsAcceptedAt IS NULL` combiné
  // à `passwordHash IS NULL` (un compte créé par mot de passe a forcément
  // les deux renseignés).
  try {
    await db.user.update({
      where: { id: user.id },
      data: { termsAcceptedAt: new Date(), termsVersion: TERMS_VERSION },
    });
  } catch (error) {
    await captureServerException(error, user.id, { source: "handleUserCreated" });
  }
  await captureServerEvent(user.id, "signup_completed", { method: "google" });
}

export const credentialsProvider = Credentials({
  name: "Email et mot de passe",
  credentials: {
    email: { label: "Email", type: "email" },
    password: { label: "Mot de passe", type: "password" },
  },
  authorize: authorizeCredentials,
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(db),
  ...authConfig,
  providers: [
    ...authConfig.providers,
    credentialsProvider,
  ],
  pages: {
    signIn: "/login",
  },
  events: {
    createUser: handleUserCreated,
  },
})

