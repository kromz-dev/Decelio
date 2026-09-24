"use client";

import { useState, useTransition } from "react";
import posthog from "posthog-js";
import { addMonitoredSite, deleteMonitoredSite } from "@/app/actions/sites";
import { Loader2, Plus, ShieldAlert, X, Download, Trash2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Verdict, type VerdictValue } from "@/components/ui/verdict";

export type MonitoredSite = {
  id: string;
  name: string;
  url: string;
  status: string;
  createdAt: Date;
};

const FILTERS = ["Tous", "En alerte", "OK"] as const;

export function DashboardSites({ initialSites }: { initialSites: MonitoredSite[] }) {
  const [sites, setSites] = useState(initialSites);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("Tous");
  const [search, setSearch] = useState("");

  const handleAddSite = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    startTransition(async () => {
      const response = await addMonitoredSite({ name, url });

      if (response.error) {
        setError(response.error);
        return;
      }

      if (response.data) {
        setSites([response.data as MonitoredSite, ...sites]);
        posthog.capture("monitored_site_added");
        setName("");
        setUrl("");
        setShowAddForm(false);
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Supprimer ce domaine ? La surveillance s'arrête immédiatement, sans retour en arrière possible.")) return;

    startTransition(async () => {
      const response = await deleteMonitoredSite(id);

      if (response.error) {
        alert(response.error);
        return;
      }

      if (response.success) {
        setSites((prev) => prev.filter((s) => s.id !== id));
        posthog.capture("monitored_site_deleted");
      }
    });
  };

  const activeAlerts = sites.filter(s => s.status === "ERROR" || s.status === "BLOCKED");
  const healthySites = sites.filter(s => s.status === "ACTIVE" || s.status === "OK");

  const filteredSites = sites.filter(site => {
    const matchesSearch = site.name.toLowerCase().includes(search.toLowerCase()) || site.url.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      filter === "Tous" ? true :
      filter === "En alerte" ? (site.status === "ERROR" || site.status === "BLOCKED") :
      filter === "OK" ? (site.status === "ACTIVE" || site.status === "OK") : true;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="mt-10 space-y-8">
      {/* Bandeau d'alerte */}
      {activeAlerts.length > 0 && (
        <Card className="border-stop/30 bg-stop-soft">
          <CardContent className="flex flex-wrap items-center justify-between gap-5">
            <div className="flex items-start gap-3">
              <Verdict value="refuse" variant="glyph" size="lg" className="mt-0.5" />
              <div>
                <div className="text-sm font-medium text-stop">
                  {activeAlerts.length} {activeAlerts.length > 1 ? "domaines bloquent" : "domaine bloque"} les assistants IA
                </div>
                <h2 className="mt-1 text-[17px] font-semibold text-ink">
                  {activeAlerts[0].url.replace(/^https?:\/\//, "")} n&apos;est plus lisible depuis peu
                </h2>
              </div>
            </div>
            <Button variant="outline" render={<Link href={`/sites/${activeAlerts[0].id}`} />}>
              Voir le détail
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Chiffres clés */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card size="sm">
          <CardContent>
            <div className="type-caption text-ink-2">Domaines surveillés</div>
            <div className="mt-2 text-2xl font-semibold text-ink tnum">
              {sites.length}<span className="text-base font-normal text-ink-2"> / 20</span>
            </div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent>
            <div className="type-caption text-ink-2">Lisibles par l&apos;IA</div>
            <div className="mt-2 text-2xl font-semibold text-ink tnum">{healthySites.length}</div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent>
            <div className="type-caption text-ink-2">En alerte</div>
            <div className={`mt-2 text-2xl font-semibold tnum ${activeAlerts.length > 0 ? "text-stop" : "text-ink"}`}>
              {activeAlerts.length}
            </div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent>
            <div className="type-caption text-ink-2">Prochain scan</div>
            <div className="mt-2 text-2xl font-semibold text-ink tnum">04:12</div>
          </CardContent>
        </Card>
      </div>

      {/* Actions et filtres */}
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div className="flex w-full flex-wrap items-center gap-3 md:w-auto">
          <Input
            placeholder="Filtrer un domaine"
            className="w-full md:w-[220px]"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Filtrer les domaines par nom ou adresse"
          />
          <div className="flex shrink-0 items-center gap-1 rounded-sm border border-line bg-surface p-1" role="group" aria-label="Filtrer par statut">
            {FILTERS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setFilter(opt)}
                className={`rounded-xs px-3 py-1.5 text-sm font-medium transition-colors ${
                  filter === opt ? "bg-surface-2 text-ink" : "text-ink-2 hover:text-ink"
                }`}
                aria-pressed={filter === opt}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
        <div className="flex w-full shrink-0 items-center gap-3 md:w-auto">
          <Button variant="outline" className="flex-1 md:flex-none">
            <Download className="h-4 w-4" data-icon="inline-start" /> <span className="hidden sm:inline">Exporter</span>
          </Button>
          <Button className="flex-1 md:flex-none" onClick={() => setShowAddForm(!showAddForm)} aria-expanded={showAddForm}>
            <Plus className="h-4 w-4" data-icon="inline-start" /> Ajouter un domaine
          </Button>
        </div>
      </div>

      {/* Formulaire d'ajout */}
      {showAddForm && (
        <Card className="animate-fade-in">
          <CardContent>
            <form onSubmit={handleAddSite}>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-[17px] font-semibold text-ink">Nouveau domaine à surveiller</h3>
                <button type="button" onClick={() => setShowAddForm(false)} className="rounded-sm p-1 text-ink-2 hover:text-ink" aria-label="Fermer le formulaire">
                  <X className="h-[18px] w-[18px]" />
                </button>
              </div>

              {error && (
                <div className="mb-4 flex items-start gap-3 rounded-sm border border-stop/30 bg-stop-soft px-4 py-3 text-stop" role="alert">
                  <ShieldAlert className="mt-0.5 h-[18px] w-[18px] shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Domaine non ajouté</p>
                    <p className="mt-0.5 text-sm">{error}</p>
                  </div>
                </div>
              )}

              <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-end">
                <div className="w-full flex-1">
                  <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-ink">Nom du projet</label>
                  <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Mon projet" />
                </div>
                <div className="w-full flex-1">
                  <label htmlFor="url" className="mb-1.5 block text-sm font-medium text-ink">Adresse du site</label>
                  <Input id="url" type="url" required value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://mon-site.com" />
                </div>
                <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ajouter"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Tableau des domaines */}
      <div className="overflow-hidden rounded-lg border border-line bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left type-table">
            <caption className="sr-only">Liste des domaines surveillés</caption>
            <thead className="border-b border-ink text-ink-2">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">Domaine</th>
                <th scope="col" className="px-3 py-2 font-medium">Verdict IA</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Code</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Texte utile</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Depuis</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Dernier scan</th>
                <th scope="col" className="px-3 py-2 text-right font-medium"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {isPending && (
                <tr className="h-11 animate-pulse">
                  <td className="px-3 py-2"><div className="h-4 w-3/4 rounded bg-surface-2" /></td>
                  <td className="px-3 py-2"><div className="h-4 w-16 rounded bg-surface-2" /></td>
                  <td className="px-3 py-2"><div className="ml-auto h-4 w-8 rounded bg-surface-2" /></td>
                  <td className="px-3 py-2"><div className="ml-auto h-4 w-14 rounded bg-surface-2" /></td>
                  <td className="px-3 py-2"><div className="ml-auto h-4 w-10 rounded bg-surface-2" /></td>
                  <td className="px-3 py-2"><div className="ml-auto h-4 w-16 rounded bg-surface-2" /></td>
                  <td className="px-3 py-2"><div className="ml-auto h-4 w-6 rounded bg-surface-2" /></td>
                </tr>
              )}
              {filteredSites.length === 0 && !isPending ? (
                <tr>
                  <td colSpan={7} className="px-3 py-12 text-center">
                    {sites.length === 0 ? (
                      <>
                        <p className="text-sm font-medium text-ink">Aucun domaine surveillé pour le moment</p>
                        <p className="mx-auto mt-1 max-w-sm text-sm text-ink-2">Ajoutez un domaine pour vérifier sa lisibilité par ChatGPT, Claude et les autres assistants.</p>
                        <Button className="mt-4" onClick={() => setShowAddForm(true)}>
                          <Plus className="h-4 w-4" data-icon="inline-start" /> Ajouter un domaine
                        </Button>
                      </>
                    ) : (
                      <p className="text-sm text-ink-2">Aucun domaine ne correspond à ce filtre. Essayez un autre terme ou choisissez « Tous ».</p>
                    )}
                  </td>
                </tr>
              ) : (
                filteredSites.map((site) => {
                  const isError = site.status === "ERROR" || site.status === "BLOCKED";
                  const isOk = site.status === "ACTIVE" || site.status === "OK";
                  const isPendingStatus = site.status === "PENDING";
                  const verdict: VerdictValue = isError ? "refuse" : isOk ? "lu" : "inconnu";

                  return (
                    <tr key={site.id} className="h-11 hover:bg-paper">
                      <td className="px-3 py-2">
                        <div className="font-medium text-ink">{site.url.replace(/^https?:\/\//, '')}</div>
                        <div className="type-caption text-ink-2">{site.name}</div>
                      </td>
                      <td className="px-3 py-2">
                        {isPendingStatus ? (
                          <span className="type-caption text-ink-2">Scan en cours</span>
                        ) : (
                          <Verdict value={verdict} variant="inline" />
                        )}
                      </td>
                      <td className="px-3 py-2 text-right text-ink-2 tnum">
                        {isError ? "403" : isOk ? "200" : "—"}
                      </td>
                      <td className="px-3 py-2 text-right text-ink-2 tnum">
                        {isError ? "0 car." : isOk ? "4 210 car." : "—"}
                      </td>
                      <td className="px-3 py-2 text-right text-ink-2 tnum">
                        {isError ? "6 jours" : "—"}
                      </td>
                      <td className="px-3 py-2 text-right text-ink-2 tnum">
                        {new Date(site.createdAt).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleDelete(site.id)}
                          disabled={isPending}
                          aria-label={`Supprimer ${site.name}`}
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
