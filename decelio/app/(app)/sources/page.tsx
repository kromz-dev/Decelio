import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Globe, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Sources | Decelio",
  description: "Gérez vos sources et moteurs d'IA surveillés.",
};

export default async function SourcesPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    redirect("/login");
  }

  return (
    <div className="mx-auto max-w-6xl pb-12">
      <header className="mb-8">
        <h1 className="text-[28px] leading-[34px] font-semibold tracking-[-0.02em] text-ink">Sources</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-ink-2">
          Gérez vos sources d&apos;information et les moteurs d&apos;IA (LLMs) surveillés pour votre portefeuille.
        </p>
      </header>

      <div className="mt-8 rounded-xl border border-line border-dashed bg-surface-2 p-12 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface shadow-sm ring-1 ring-line">
          <Globe className="h-6 w-6 text-ink-2" />
        </div>
        <h3 className="mt-4 text-sm font-semibold text-ink">Aucune source personnalisée</h3>
        <p className="mt-2 text-sm text-ink-2">
          Les sources d&apos;intelligence artificielle globales sont surveillées par défaut pour vos domaines.
          La configuration de sources personnalisées est en préparation.
        </p>
        <div className="mt-6">
          <Button variant="outline" disabled>
            <Plus className="mr-2 h-4 w-4" />
            Ajouter une source (en préparation)
          </Button>
        </div>
      </div>
    </div>
  );
}
