import Link from "next/link";
import { auth } from "@/auth";
import { LayoutDashboard, Globe, Settings, LogOut, Bell, FileText } from "lucide-react";
import { redirect } from "next/navigation";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <div className="flex items-center justify-between border-b border-line bg-surface px-5 py-4 md:hidden">
        <Link href="/" className="text-xl font-semibold tracking-tight">
          Cited<span className="text-cobalt">.</span>
        </Link>
        <details className="relative">
          <summary className="cursor-pointer list-none rounded-sm border border-line-strong px-3 py-2 text-sm font-medium text-ink">
            Menu
          </summary>
          <nav className="absolute right-0 z-20 mt-2 w-48 rounded-lg border border-line bg-surface p-2 shadow-float">
            <Link href="/dashboard" className="block rounded-sm px-3 py-2 text-sm text-ink hover:bg-surface-2">Portefeuille</Link>
            <Link href="/alerts" className="block rounded-sm px-3 py-2 text-sm text-ink hover:bg-surface-2">Alertes</Link>
            <Link href="/reports" className="block rounded-sm px-3 py-2 text-sm text-ink hover:bg-surface-2">Rapports</Link>
            <Link href="/sources" className="block rounded-sm px-3 py-2 text-sm text-ink hover:bg-surface-2">Sources</Link>
            <Link href="/settings" className="block rounded-sm px-3 py-2 text-sm text-ink hover:bg-surface-2">Réglages</Link>
          </nav>
        </details>
      </div>
      <div className="flex min-h-[calc(100vh-65px)] md:min-h-screen">
        <aside className="hidden w-64 border-r border-line bg-surface p-5 md:flex md:flex-col">
          <Link href="/" className="mb-10 text-xl font-semibold tracking-tight text-ink">
            Cited<span className="text-cobalt">.</span>
          </Link>
          <nav className="flex-1 space-y-1">
            <Link href="/dashboard" className="flex items-center gap-2 rounded-sm px-3 py-2.5 text-sm font-medium text-ink-2 hover:bg-surface-2 hover:text-ink">
              <LayoutDashboard className="h-4 w-4" />
              Portefeuille
            </Link>
            <Link href="/alerts" className="flex items-center gap-2 rounded-sm px-3 py-2.5 text-sm font-medium text-ink-2 hover:bg-surface-2 hover:text-ink">
              <Bell className="h-4 w-4" />
              Alertes
            </Link>
            <Link href="/reports" className="flex items-center gap-2 rounded-sm px-3 py-2.5 text-sm font-medium text-ink-2 hover:bg-surface-2 hover:text-ink">
              <FileText className="h-4 w-4" />
              Rapports
            </Link>
            <Link href="/sources" className="flex items-center gap-2 rounded-sm px-3 py-2.5 text-sm font-medium text-ink-2 hover:bg-surface-2 hover:text-ink">
              <Globe className="h-4 w-4" />
              Sources
            </Link>
            <Link href="/settings" className="flex items-center gap-2 rounded-sm px-3 py-2.5 text-sm font-medium text-ink-2 hover:bg-surface-2 hover:text-ink">
              <Settings className="h-4 w-4" />
              Réglages
            </Link>
            <Link href="/pricing" className="flex items-center gap-2 rounded-sm px-3 py-2.5 text-sm font-medium text-ink-2 hover:bg-surface-2 hover:text-ink">
              Voir les plans
            </Link>
          </nav>
          <div className="flex items-center justify-between gap-2 border-t border-line pt-4 text-sm">
            <span className="truncate text-ink-2">{session.user?.name || session.user?.email}</span>
            <form action={async () => {
              "use server";
              const { signOut } = await import("@/auth");
              await signOut({ redirectTo: "/?posthog_reset=1" });
            }}>
              <button type="submit" className="text-ink-2 hover:text-ink" title="Déconnexion" aria-label="Déconnexion">
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </aside>
        <main className="flex-1 overflow-y-auto p-6 md:p-10">
          {children}
        </main>
      </div>
    </div>
  );
}
