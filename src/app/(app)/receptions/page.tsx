"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Download, History, PackagePlus, Plus } from "lucide-react";
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
import { LinkButton } from "@/components/ui/link-button";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { ViewToggle } from "@/components/ui/view-toggle";
import { PendingCreations } from "@/components/pending-creations";
import { useAuth } from "@/lib/auth-context";
import { useConnectivity } from "@/lib/connectivity-context";
import { nomFichierDateDuJour, telechargerFichier } from "@/lib/download";
import { useViewMode } from "@/lib/use-view-mode";

interface Fournisseur {
  id: string;
  code: string;
  nom: string;
}

type NatureReception = "ARRIVAGE" | "SAISIE" | "REPRISE";
type StatutReception = "BROUILLON" | "VALIDEE" | "ANNULEE";

interface Reception {
  id: string;
  reference: string;
  nature: NatureReception;
  fournisseur: string | null;
  fournisseur_code: string | null;
  date_reception: string;
  statut: StatutReception;
  nb_lignes: number;
}

const NATURE_LABELS: Record<NatureReception, string> = {
  ARRIVAGE: "Arrivage",
  SAISIE: "Saisie manuelle",
  REPRISE: "Reprise",
};

const STATUT_LABELS: Record<StatutReception, string> = {
  BROUILLON: "Brouillon",
  VALIDEE: "Validée",
  ANNULEE: "Annulée",
};

const STATUT_TONES: Record<StatutReception, "ok" | "warn" | "neutral"> = {
  BROUILLON: "warn",
  VALIDEE: "ok",
  ANNULEE: "neutral",
};

export default function ReceptionsPage() {
  const { authFetch, user } = useAuth();
  const { etat } = useConnectivity();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<Reception[] | null>(null);
  const [count, setCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [search, setSearch] = useState("");
  const [nature, setNature] = useState("");
  const [statut, setStatut] = useState(() => searchParams.get("statut") ?? "");
  const [fournisseurId, setFournisseurId] = useState("");
  const [filtresOuverts, setFiltresOuverts] = useState(false);
  const [exportEnCours, setExportEnCours] = useState(false);
  const { mode, preference, setPreference } = useViewMode("receptions");
  const nbFiltresActifs = [search, nature, fournisseurId, statut].filter(Boolean).length;

  const peutEcrire = user?.role === "ADMIN" || user?.role === "MAGASINIER";
  const estAdmin = user?.role === "ADMIN";

  function paramsFiltres() {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (nature) params.set("nature", nature);
    if (statut) params.set("statut", statut);
    if (fournisseurId) params.set("fournisseur", fournisseurId);
    return params;
  }

  async function exporterCsv() {
    setExportEnCours(true);
    setError(null);
    try {
      const erreur = await telechargerFichier(
        authFetch,
        `/receptions/export/?${paramsFiltres().toString()}`,
        nomFichierDateDuJour("receptions", "csv"),
      );
      if (erreur) setError(erreur);
    } finally {
      setExportEnCours(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await authFetch("/fournisseurs/?ordering=nom&actif=true");
      if (cancelled || !res.ok) return;
      const data = (await res.json()) as { results: Fournisseur[] };
      setFournisseurs(data.results);
    })();
    return () => {
      cancelled = true;
    };
  }, [authFetch]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setItems(null);
      const params = paramsFiltres();
      params.set("ordering", "-date_reception");
      const res = await authFetch(`/receptions/?${params.toString()}`);
      if (cancelled) return;
      if (!res.ok) {
        setError(
          res.status === 503
            ? "Hors connexion — cette page n'a pas encore été consultée en ligne."
            : `Erreur ${res.status} lors du chargement des réceptions.`,
        );
        return;
      }
      const data = (await res.json()) as { count: number; results: Reception[] };
      setError(null);
      setItems(data.results);
      setCount(data.count);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authFetch, search, nature, statut, fournisseurId, reloadKey]);

  return (
    <div className="oa-rise flex flex-col gap-5">
      <PageHeader
        icon={PackagePlus}
        eyebrow="Opérations"
        title="Réceptions"
        subtitle={`${count} réception${count > 1 ? "s" : ""} pour ce filtre.`}
      >
        {estAdmin ? (
          <LinkButton href="/receptions/reprise" variant="secondary">
            <History className="h-4 w-4" /> Reprise de l&apos;existant
          </LinkButton>
        ) : null}
        {peutEcrire ? (
          <LinkButton href="/receptions/nouvelle">
            <Plus className="h-4 w-4" strokeWidth={2} /> Nouvelle réception
          </LinkButton>
        ) : null}
        <Button variant="secondary" onClick={exporterCsv} disabled={exportEnCours}>
          <Download className="h-4 w-4" /> Exporter
        </Button>
        <FilterButton count={nbFiltresActifs} onClick={() => setFiltresOuverts(true)} />
        <ViewToggle mode={preference} onChange={setPreference} />
      </PageHeader>

      <Modal open={filtresOuverts} onClose={() => setFiltresOuverts(false)} title="Filtres">
        <div className="oa-form flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-foreground">Référence, référence fournisseur</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher…"
              className="px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-foreground">Nature</span>
            <select value={nature} onChange={(e) => setNature(e.target.value)} className="px-3 py-2 text-sm">
              <option value="">Toutes natures</option>
              <option value="SAISIE">Saisie manuelle</option>
              <option value="REPRISE">Reprise</option>
              <option value="ARRIVAGE">Arrivage</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-foreground">Fournisseur</span>
            <select
              value={fournisseurId}
              onChange={(e) => setFournisseurId(e.target.value)}
              className="px-3 py-2 text-sm"
            >
              <option value="">Tous les fournisseurs</option>
              {fournisseurs.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nom}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-foreground">Statut</span>
            <select value={statut} onChange={(e) => setStatut(e.target.value)} className="px-3 py-2 text-sm">
              <option value="">Tous les statuts</option>
              <option value="BROUILLON">Brouillon</option>
              <option value="VALIDEE">Validée</option>
              <option value="ANNULEE">Annulée</option>
            </select>
          </label>
          {nbFiltresActifs > 0 ? (
            <Button
              variant="ghost"
              onClick={() => {
                setSearch("");
                setNature("");
                setFournisseurId("");
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

      <PendingCreations
        ressourceType="reception"
        titre={(a) => String(a.fournisseur_nom ?? "Nouvelle réception")}
        sousTitre={(a) => [a.reference_fournisseur, a.date_reception].filter(Boolean).join(" · ") || null}
      />

      {!items && !error ? <ListSkeleton /> : null}

      {items && mode === "liste" ? (
        <TableCard minWidth={640}>
          <THead columns={["Référence", "Nature", "Fournisseur", "Date", "Unités", "Statut"]} />
          <tbody>
            {items.map((r) => (
              <tr key={r.id} className={TABLE_ROW_CLASS}>
                <td className={TABLE_CELL_CLASS}>
                  <Link href={`/receptions/${r.id}`} className="font-mono text-xs text-accent-strong hover:underline">
                    {r.reference}
                  </Link>
                </td>
                <td className={`${TABLE_CELL_CLASS} text-muted`}>{NATURE_LABELS[r.nature]}</td>
                <td className={`${TABLE_CELL_CLASS} font-mono text-xs text-muted`}>{r.fournisseur_code ?? "—"}</td>
                <td className={`${TABLE_CELL_CLASS} text-muted`}>
                  {new Date(r.date_reception).toLocaleDateString("fr-FR")}
                </td>
                <td className={`${TABLE_CELL_CLASS} tabular-nums text-muted`}>{r.nb_lignes}</td>
                <td className={TABLE_CELL_CLASS}>
                  <Badge tone={STATUT_TONES[r.statut]}>{STATUT_LABELS[r.statut]}</Badge>
                </td>
              </tr>
            ))}
            {items.length === 0 ? (
              <TableEmptyRow colSpan={6}>Aucune réception pour ce filtre.</TableEmptyRow>
            ) : null}
          </tbody>
        </TableCard>
      ) : null}

      {items && mode === "cartes" ? (
        items.length === 0 ? (
          <InlineEmpty icon={PackagePlus} title="Aucune réception pour ce filtre." />
        ) : (
          <div className="oa-stagger grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((r) => (
              <Link key={r.id} href={`/receptions/${r.id}`} className="block">
                <GlassCard className="oa-lift flex h-full flex-col gap-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-xs text-accent-strong">{r.reference}</p>
                      <p className="truncate font-medium text-foreground">{NATURE_LABELS[r.nature]}</p>
                    </div>
                    <Badge tone={STATUT_TONES[r.statut]}>{STATUT_LABELS[r.statut]}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 border-t border-line/70 pt-3">
                    <CardField label="Fournisseur">
                      <span className="font-mono text-xs">{r.fournisseur_code ?? "—"}</span>
                    </CardField>
                    <CardField label="Date">{new Date(r.date_reception).toLocaleDateString("fr-FR")}</CardField>
                    <CardField label="Unités">{r.nb_lignes}</CardField>
                  </div>
                </GlassCard>
              </Link>
            ))}
          </div>
        )
      ) : null}
    </div>
  );
}
