import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { registerSchema } from "@/lib/auth-validation";
import { callerKey, rateLimit } from "@/lib/rate-limit";
import { REGISTER_LIMIT_PER_HOUR, REGISTER_WINDOW_MS } from "@/lib/auth-registration-policy";
import { captureServerEvent } from "@/lib/posthog-server";
import { TERMS_VERSION } from "@/lib/legal/terms";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const parsed = registerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Données invalides." }, { status: 400 });
  }

  const quota = await rateLimit(callerKey(request, "register"), REGISTER_LIMIT_PER_HOUR, REGISTER_WINDOW_MS);
  if (!quota.allowed) {
    return NextResponse.json(
      { error: "Trop de tentatives d'inscription. Réessayez plus tard." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((quota.resetAt.getTime() - Date.now()) / 1000)) } },
    );
  }

  const { email, name, password } = parsed.data;
  const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    return NextResponse.json({ error: "Un compte existe déjà avec cette adresse email." }, { status: 409 });
  }

  let userId: string;
  try {
    const user = await db.user.create({
      data: {
        email,
        name,
        passwordHash: await hashPassword(password),
        termsAcceptedAt: new Date(),
        termsVersion: TERMS_VERSION,
      },
      select: { id: true },
    });
    userId = user.id;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Un compte existe déjà avec cette adresse email." }, { status: 409 });
    }
    throw error;
  }

  // L'inscription par Google est instrumentée séparément (auth.ts, hors
  // périmètre de ce fichier) : ce point ne couvre que les identifiants.
  await captureServerEvent(userId, "signup_completed", { method: "credentials" });

  return NextResponse.json({ success: true }, { status: 201 });
}
