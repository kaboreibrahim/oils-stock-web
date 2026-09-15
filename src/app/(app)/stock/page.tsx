"use client";

import { Download, Package } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardField } from "@/components/ui/card-field";
import {
  TABLE_CELL_CLASS,
  TABLE_ROW_CLASS,
  TableCard,
  TableEmptyRow,
  THead,
} from "@/components/ui/data-table";
import { FilterButton } from "@/components/ui/filter-button";
import { GlassCard } from "@/components/ui/glass-card";
import { InlineEmpty, ListError, ListSkeleton, StaleNote } from "@/components/ui/list-states";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { ViewToggle } from "@/components/ui/view-toggle";
import { useAuth } from "@/lib/auth-context";
import { useConnectivity } from "@/lib/connectivity-context";
import { nomFichierDateDuJour, telechargerFichier } from "@/lib/download";
import { useViewMode } from "@/lib/use-view-mode";

interface UniteStock {
  id: string;
  numero_serie: string;
  code_interne: string | null;
  type_article: "FLEXITANK" | "HEATING_PAD";
  fournisseur_code: string;
  statut: "EN_STOCK" | "SORTIE";
  date_entree: string;
}

const TYPE_LABELS: Record<UniteStock["type_article"], string> = {
  FLEXITANK: "Flexitank",
  HEATING_PAD: "Heating pad",
};

export default function StockPage() {
  const { authFetch } = useAuth();
  const { etat } = useConnectivity();
  const [items, setItems] = useState<UniteStock[] | null>(null);
  const [count, setCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [statut, setStatut] = useState("");
  const [filtresOuverts, setFiltresOuverts] = useState(false);
  const [exportEnCours, setExportEnCours] = useState(false);
  const { mode, preference, setPreference } = useViewMode("stock");
  const nbFiltresActifs = [search, type, statut].filter(Boolean).length;

  function paramsFiltres() {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (type) params.set("type_article", type);
    if (statut) params.set("statut", statut);
    return params;
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setItems(null);
      const params = paramsFiltres();
      params.set("ordering", "-date_entree");
      // NB : pas de pagination affichée pour l'instant (PAGE_SIZE=50 côté API,
      // largement suffisant tant que le volume de stock reste faible).
      const res = await authFetch(`/unites/?${params.toString()}`);
      if (cancelled) return;
      if (!res.ok) {
        setError(
          res.status === 503
            ? "Hors connexion — cette page n'a pas encore été consultée en ligne."
            : `Erreur ${res.status} lors du chargement du stock.`,
        );
        return;
      }
      const data = (await res.json()) as { count: number; results: UniteStock[] };
      setError(null);
      setItems(data.results);
      setCount(data.count);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authFetch, search, type, statut, reloadKey]);

  async function exporterCsv() {
    setExportEnCours(true);
    setError(null);
    try {
      const erreur = await telechargerFichier(
        authFetch,
        `/unites/export/?${paramsFiltres().toString()}`,
        nomFichierDateDuJour("stock", "csv"),
      );
      if (erreur) setError(erreur);
    } finally {
      setExportEnCours(false);
    }
  }

  return (
    <div className="oa-rise flex flex-col gap-5">
      <PageHeader
        icon={Package}
        eyebrow="Inventaire"
        title="Stock"
        subtitle={`${count} unité${count > 1 ? "s" : ""} pour ce filtre.`}
      >
        <Button variant="secondary" onClick={exporterCsv} disabled={exportEnCours}>
          <Download className="h-4 w-4" /> Exporter
        </Button>
        <FilterButton count={nbFiltresActifs} onClick={() => setFiltresOuverts(true)} />
        <ViewToggle mode={preference} onChange={setPreference} />
      </PageHeader>

      <Modal open={filtresOuverts} onClose={() => setFiltresOuverts(false)} title="Filtres">
        <div className="oa-form flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-foreground">Numéro de série</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher…"
              className="px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-foreground">Type</span>
            <select value={type} onChange={(e) => setType(e.target.value)} className="px-3 py-2 text-sm">
              <option value="">Tous les types</option>
              <option value="FLEXITANK">Flexitank</option>
              <option value="HEATING_PAD">Heating pad</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-foreground">Statut</span>
            <select value={statut} onChange={(e) => setStatut(e.target.value)} className="px-3 py-2 text-sm">
              <option value="">Tous les statuts</option>
              <option value="EN_STOCK">En stock</option>
              <option value="SORTIE">Sorti</option>
            </select>
          </label>
          {nbFiltresActifs > 0 ? (
            <Button
              variant="ghost"
              onClick={() => {
                setSearch("");
                setType("");
                setStatut("");
              }}
            >
              Réinitialiser les filtres
            </Button>
          ) : null}
        </div>
      </Modal>

      {error ? (
        <ListError
          message={error}
          onRetry={() => {
            setError(null);
            setReloadKey((k) => k + 1);
          }}
        />
      ) : null}

      {items && items.length > 0 && etat === "hors_ligne" ? <StaleNote /> : null}

      {!items && !error ? <ListSkeleton /> : null}

      {items && mode === "liste" ? (
        <TableCard minWidth={560}>
          <THead columns={["Numéro de série", "Type", "Fournisseur", "Entrée", "Statut"]} />
          <tbody>
            {items.map((u) => (
              <tr key={u.id} className={TABLE_ROW_CLASS}>
                <td className={`${TABLE_CELL_CLASS} font-mono text-xs`}>{u.numero_serie}</td>
                <td className={`${TABLE_CELL_CLASS} text-muted`}>{TYPE_LABELS[u.type_article]}</td>
                <td className={`${TABLE_CELL_CLASS} font-mono text-xs text-muted`}>{u.fournisseur_code}</td>
                <td className={`${TABLE_CELL_CLASS} text-muted`}>
                  {new Date(u.date_entree).toLocaleDateString("fr-FR")}
                </td>
                <td className={TABLE_CELL_CLASS}>
                  <Badge tone={u.statut === "EN_STOCK" ? "ok" : "neutral"}>
                    {u.statut === "EN_STOCK" ? "En stock" : "Sorti"}
                  </Badge>
                </td>
              </tr>
            ))}
            {items.length === 0 ? (
              <TableEmptyRow colSpan={5}>Aucune unité pour ce filtre.</TableEmptyRow>
            ) : null}
          </tbody>
        </TableCard>
      ) : null}

      {items && mode === "cartes" ? (
        items.length === 0 ? (
          <InlineEmpty icon={Package} title="Aucune unité pour ce filtre." />
        ) : (
          <div className="oa-stagger grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((u) => (
              <GlassCard key={u.id} className="oa-lift flex flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate font-mono text-sm font-medium text-foreground">{u.numero_serie}</p>
                  <Badge tone={u.statut === "EN_STOCK" ? "ok" : "neutral"}>
                    {u.statut === "EN_STOCK" ? "En stock" : "Sorti"}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <CardField label="Type">{TYPE_LABELS[u.type_article]}</CardField>
                  <CardField label="Fournisseur">
                    <span className="font-mono text-xs">{u.fournisseur_code}</span>
                  </CardField>
                  <CardField label="Entrée">{new Date(u.date_entree).toLocaleDateString("fr-FR")}</CardField>
                </div>
              </GlassCard>
            ))}
          </div>
        )
      ) : null}
    </div>
  );
}
