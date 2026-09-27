"use client";

import { useState, useTransition } from "react";
import { assignSiteClient, createClient } from "@/app/actions/clients";
import { addMonitoredSite, addMonitoredSitesBulk, deleteMonitoredSite } from "@/app/actions/sites";
import { Loader2, Plus, ShieldAlert, X, Trash2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Verdict } from "@/components/ui/verdict";
import { verdictForSiteStatus } from "@/lib/sites/site-status";
import { quotaLabel } from "@/lib/sites/quota-label";

export type MonitoredSite = {
  id: string;
  name: string;
  url: string;
  status: string;
  clientId: string | null;
  createdAt: Date;
};

export type AgencyClient = {
  id: string;
  name: string;
};

const FILTERS = ["Tous", "En alerte", "OK"] as const;

export function DashboardSites({
  initialSites,
  initialClients,
  siteLimit,
}: {
  initialSites: MonitoredSite[];
  initialClients: AgencyClient[];
  siteLimit: number;
}) {
  const [sites, setSites] = useState(initialSites);
  const [clients, setClients] = useState(initialClients);
  const [clientName, setClientName] = useState("");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [bulk, setBulk] = useState("");
  const [bulkReport, setBulkReport] = useState("");
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

      if ("error" in response && response.error) {
        setError(response.error);
        return;
      }

      if ("data" in response && response.data) {
        const created = response.data;
        setSites((prev) => [created as MonitoredSite, ...prev]);
        setName("");
        setUrl("");
        setShowAddForm(false);
      }
    });
  };

  const handleBulk = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setBulkReport("");
    startTransition(async () => {
      const response = await addMonitoredSitesBulk(bulk);
      if ("error" in response && response.error) {
        setError(response.error);
        return;
      }
      if (!("data" in response) || !response.data) return;
      setSites((prev) => [...(response.data.created as MonitoredSite[]), ...prev]);
      const ignored = response.data.skipped.length;
      setBulkReport(
        ignored === 0
          ? `${response.data.created.length} domaines ajoutés.`
          : `${response.data.created.length} domaines ajoutés, ${ignored} lignes ignorées.`,
      );
      setBulk("");
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
      }
    });
  };

  const handleCreateClient = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    startTransition(async () => {
      const response = await createClient(clientName);
      if ("error" in response && response.error) {
        setError(response.error);
        return;
      }
      if ("data" in response && response.data) {
        setClients((prev) => [...prev, response.data].sort((a, b) => a.name.localeCompare(b.name, "fr")));
        setClientName("");
      }
    });
  };

  const handleAssignClient = (siteId: string, clientId: string | null) => {
    setError("");
    startTransition(async () => {
      const response = await assignSiteClient(siteId, clientId);
      if ("error" in response && response.error) {
        setError(response.error);
        return;
      }
      setSites((prev) => prev.map((site) => (site.id === siteId ? { ...site, clientId } : site)));
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
              {quotaLabel(sites.length, siteLimit)}
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
            <div className="mt-2 text-2xl font-semibold text-ink">3 h</div>
            <p className="mt-1 text-sm text-ink-2">chaque nuit</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions et filtres */}
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div className="flex w-full flex-wrap items-center gap-3 md:w-auto">
          <Input
            fieldSize="lg"
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
                className={`min-h-11 rounded-xs px-3 text-sm font-medium transition-colors ${
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
          <Button size="lg" className="flex-1 md:flex-none" onClick={() => setShowAddForm(!showAddForm)} aria-expanded={showAddForm}>
            <Plus className="h-4 w-4" data-icon="inline-start" /> Ajouter un domaine
          </Button>
        </div>
      </div>

      {/* Formulaire d'ajout */}
      {error && !showAddForm && (
        <div className="flex items-start gap-3 rounded-sm border border-stop/30 bg-stop-soft px-4 py-3 text-stop" role="alert" id="sites-form-error">
          <ShieldAlert className="mt-0.5 h-[18px] w-[18px] shrink-0" />
          <div>
            <p className="text-sm font-medium">Opération refusée</p>
            <p className="mt-0.5 text-sm">{error}</p>
          </div>
        </div>
      )}
      {showAddForm && (
        <Card className="animate-fade-in">
          <CardContent>
            <form onSubmit={handleAddSite}>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-[17px] font-semibold text-ink">Nouveau domaine à surveiller</h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-lg"
                  onClick={() => setShowAddForm(false)}
                  aria-label="Fermer le formulaire"
                >
                  <X className="h-[18px] w-[18px]" />
                </Button>
              </div>

              {error && (
                <div className="mb-4 flex items-start gap-3 rounded-sm border border-stop/30 bg-stop-soft px-4 py-3 text-stop" role="alert" id="sites-form-error">
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
                  <Input
                    id="name"
                    fieldSize="lg"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Mon projet"
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? "sites-form-error" : undefined}
                  />
                </div>
                <div className="w-full flex-1">
                  <label htmlFor="url" className="mb-1.5 block text-sm font-medium text-ink">Adresse du site</label>
                  <Input
                    id="url"
                    type="url"
                    fieldSize="lg"
                    required
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://mon-site.com"
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? "sites-form-error" : undefined}
                  />
                </div>
                <Button type="submit" size="lg" disabled={isPending} className="w-full sm:w-auto">
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ajouter"}
                </Button>
              </div>
            </form>
            <form onSubmit={handleBulk} className="mt-6 border-t border-line pt-6">
              <label htmlFor="bulk" className="mb-1.5 block text-sm font-medium text-ink">Plusieurs domaines</label>
              <p className="mb-2 text-sm text-ink-2">Une ligne par domaine, ou « nom, adresse ».</p>
              <textarea
                id="bulk"
                value={bulk}
                onChange={(event) => setBulk(event.target.value)}
                rows={5}
                placeholder={"atelier.fr\nCabinet, https://cabinet.fr"}
                className="w-full rounded-sm border border-line bg-surface px-3 py-2 text-sm text-ink"
              />
              {bulkReport && <p className="mt-2 text-sm text-ink-2">{bulkReport}</p>}
              <Button type="submit" variant="outline" size="lg" className="mt-3" disabled={isPending || bulk.trim().length === 0}>
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ajouter la liste"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleCreateClient} className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <label htmlFor="client-name" className="mb-1.5 block text-sm font-medium text-ink">Nouveau client</label>
          <Input
            id="client-name"
            fieldSize="lg"
            value={clientName}
            onChange={(event) => setClientName(event.target.value)}
            placeholder="Nom du client"
            maxLength={80}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "sites-form-error" : undefined}
          />
        </div>
        <Button type="submit" variant="outline" size="lg" disabled={isPending || clientName.trim().length === 0}>
          Créer le client
        </Button>
      </form>

      {/* Tableau des domaines */}
      <div className="overflow-hidden rounded-lg border border-line bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left type-table">
            <caption className="sr-only">Liste des domaines surveillés</caption>
            <thead className="border-b border-ink text-ink-2">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">Domaine</th>
                <th scope="col" className="px-3 py-2 font-medium">Client</th>
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
                  <td className="px-3 py-2"><div className="h-4 w-20 rounded bg-surface-2" /></td>
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
                  <td colSpan={8} className="px-3 py-12 text-center">
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
                  const isError = site.status === "ERROR" || site.status === "BLOCKED" || site.status === "BLOQUÉ" || site.status === "ERREUR";
                  const isOk = site.status === "ACTIVE" || site.status === "OK";
                  const isPendingStatus = site.status === "PENDING";
                  const verdict = verdictForSiteStatus(site.status);

                  return (
                    <tr key={site.id} className="h-11 hover:bg-paper">
                      <td className="px-3 py-2">
                        <div className="font-medium text-ink">{site.url.replace(/^https?:\/\//, '')}</div>
                        <div className="type-caption text-ink-2">{site.name}</div>
                      </td>
                      <td className="px-3 py-2">
                        <label className="sr-only" htmlFor={`client-${site.id}`}>Client de {site.name}</label>
                        <select
                          id={`client-${site.id}`}
                          value={site.clientId ?? ""}
                          disabled={isPending}
                          onChange={(event) => handleAssignClient(site.id, event.target.value || null)}
                          className="h-8 max-w-[200px] rounded-sm border border-line bg-surface px-2 text-sm text-ink"
                        >
                          <option value="">Sans client</option>
                          {clients.map((client) => (
                            <option key={client.id} value={client.id}>{client.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        {isPendingStatus ? (
                          <span className="type-caption text-ink-2">Scan en cours</span>
                        ) : (
                          <Verdict value={verdict} variant="inline" detail={site.status === "À VÉRIFIER" ? "à vérifier" : undefined} />
                        )}
                      </td>
                      <td className="px-3 py-2 text-right text-ink-2 tnum">—</td>
                      <td className="px-3 py-2 text-right text-ink-2 tnum">—</td>
                      <td className="px-3 py-2 text-right text-ink-2 tnum">—</td>
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
