import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { db } from "@/lib/db"
import authConfig from "./auth.config"
import { verifyPassword, getDummyPasswordHash } from "@/lib/password"
import { loginSchema } from "@/lib/auth-validation"
import { callerKey, rateLimit } from "@/lib/rate-limit"
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

export const credentialsProvider = Credentials({
  name: "Email et mot de passe",
  credentials: {
    email: { label: "Email", type: "email" },
    password: { label: "Mot de passe", type: "password" },
  },
  authorize: authorizeCredentials,
});

/**
 * Enregistre l'acceptation des CGV lors de la première connexion Google.
 * L'acceptation repose sur la mention « En continuant avec Google,
 * vous acceptez les CGV » affichée par le Design à côté du bouton.
 */
export async function handleUserCreated(user: {
  id?: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
}) {
  if (user.id) {
    await db.user.update({
      where: { id: user.id },
      data: {
        termsAcceptedAt: new Date(),
        termsVersion: TERMS_VERSION,
      },
    });
  }
  return user;
}

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
  callbacks: {
    async signIn({ user }) {
      // Intercepte la connexion de l'utilisateur (par ex. première connexion Google).
      // Enregistre l'acceptation des CGV. Le PrismaAdapter a créé l'utilisateur
      // avant ce callback, donc on le met à jour ici.
      await handleUserCreated(user);
      return true;
    },
  },
})

