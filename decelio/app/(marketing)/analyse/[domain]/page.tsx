import { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { isValidDomainName } from "@/lib/scanner/domain";
import { AnalyseScanRunner } from "./AnalyseScanRunner";

/** Un segment mal encodé (ex. `%E0%A4%A`) ferait lever `decodeURIComponent` : on garde alors la valeur brute, que la validation rejettera. */
function decodeDomain(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

interface PageProps {
  params: Promise<{ domain: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const domain = decodeDomain((await params).domain);
  return {
    title: `Diagnostic Decelio pour ${domain}`,
    description: `Les robots de ChatGPT, Claude et Perplexity peuvent-ils lire ${domain} ? Politique robots.txt, accès et dépendance JavaScript, vérifiés en direct.`,
  };
}

export default async function AnalyseDomainPage({ params }: PageProps) {
  const domain = decodeDomain((await params).domain);
  const validDomain = isValidDomainName(domain);

  return (
    <main className="min-h-screen bg-paper px-6 py-8 text-ink">
      <header className="mx-auto flex max-w-6xl items-center justify-between">
        <Link href="/" className="text-xl font-semibold tracking-tight">
          Decelio<span className="text-cobalt">.</span>
        </Link>
        <nav className="flex gap-5 text-sm text-ink-2">
          <Link href="/pricing" className="hover:text-ink">Tarifs</Link>
          <Link href="/dashboard" className="hover:text-ink">Connexion</Link>
        </nav>
      </header>

      {validDomain ? (
        <section className="mx-auto max-w-4xl py-20 text-center">
          <Badge variant="info">Diagnostic public · {domain}</Badge>
          <h1 className="mt-6 text-5xl leading-tight sm:text-6xl">
            Les robots IA peuvent-ils lire <span className="text-cobalt [overflow-wrap:anywhere]">{domain}</span> ?
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-ink-2">
            Politique robots.txt, accès et dépendance JavaScript, vérifiés pour ChatGPT, Claude et Perplexity.
          </p>
          <div className="mt-12 flex justify-center">
            <AnalyseScanRunner domain={domain} />
          </div>
        </section>
      ) : (
        <section className="mx-auto max-w-4xl py-20 text-center">
          <Badge variant="stop">Domaine invalide</Badge>
          <h1 className="mt-6 text-4xl leading-tight sm:text-5xl">
            « {domain} » n&apos;est pas un domaine valide
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-ink-2">
            Indiquez un domaine seul, sans <span className="font-mono">http://</span> ni chemin — par exemple{" "}
            <span className="font-mono">mon-site.com</span>.
          </p>
          <div className="mt-12">
            <Link href="/" className={buttonVariants({ size: "lg" })}>
              Lancer un diagnostic
            </Link>
          </div>
        </section>
      )}
    </main>
  );
}
