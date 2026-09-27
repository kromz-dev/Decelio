// Doit couvrir chaque dossier de route de `app/(app)/` : le test
// `auth-route-policy.test.ts` relit ce répertoire et échoue si l'un d'eux
// manque ici.
const protectedPrefixes = [
  "/alerts",
  "/dashboard",
  "/onboarding",
  "/reports",
  "/settings",
  "/sites",
  "/sources",
] as const;

export function isProtectedPath(pathname: string): boolean {
  return protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function safeCallbackUrl(value: string | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return "/dashboard";
  }
  return value;
}
