"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Download, PackageMinus, Plus } from "lucide-react";
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

interface Client {
  id: string;
  code: string;
  nom: string;
}

type StatutSortie = "BROUILLON" | "VALIDEE" | "ANNULEE";

interface Sortie {
  id: string;
  reference: string;
  client: string;
  client_nom: string;
  projet: string;
  trd: string;
  date_sortie: string;
  statut: StatutSortie;
  nb_unites: number;
}

const STATUT_LABELS: Record<StatutSortie, string> = {
  BROUILLON: "Brouillon",
  VALIDEE: "Validée",
  ANNULEE: "Annulée",
};

const STATUT_TONES: Record<StatutSortie, "ok" | "warn" | "neutral"> = {
  BROUILLON: "warn",
  VALIDEE: "ok",
  ANNULEE: "neutral",
};

export default function SortiesPage() {
  const { authFetch, user } = useAuth();
  const { etat } = useConnectivity();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<Sortie[] | null>(null);
  const [count, setCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [clientId, setClientId] = useState("");
  // Initialisé depuis l'URL (ex. /sorties?statut=BROUILLON, lien depuis le
  // tableau de bord) — l'utilisateur peut ensuite changer le filtre librement.
  const [statut, setStatut] = useState(() => searchParams.get("statut") ?? "");
  const [filtresOuverts, setFiltresOuverts] = useState(false);
  const [exportEnCours, setExportEnCours] = useState(false);
  const { mode, preference, setPreference } = useViewMode("sorties");
  const nbFiltresActifs = [search, clientId, statut].filter(Boolean).length;

  const peutEcrire = user?.role === "ADMIN" || user?.role === "MAGASINIER";

  function paramsFiltres() {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (clientId) params.set("client", clientId);
    if (statut) params.set("statut", statut);
    return params;
  }

  async function exporterCsv() {
    setExportEnCours(true);
    setError(null);
    try {
      const erreur = await telechargerFichier(
        authFetch,
        `/sorties/export/?${paramsFiltres().toString()}`,
        nomFichierDateDuJour("sorties", "csv"),
      );
      if (erreur) setError(erreur);
    } finally {
      setExportEnCours(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await authFetch("/clients/?ordering=nom&actif=true");
      if (cancelled || !res.ok) return;
      const data = (await res.json()) as { results: Client[] };
      setClients(data.results);
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
      params.set("ordering", "-date_sortie");
      const res = await authFetch(`/sorties/?${params.toString()}`);
      if (cancelled) return;
      if (!res.ok) {
        setError(
          res.status === 503
            ? "Hors connexion — cette page n'a pas encore été consultée en ligne."
            : `Erreur ${res.status} lors du chargement des sorties.`,
        );
        return;
      }
      const data = (await res.json()) as { count: number; results: Sortie[] };
      setError(null);
      setItems(data.results);
      setCount(data.count);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authFetch, search, clientId, statut, reloadKey]);

  return (
    <div className="oa-rise flex flex-col gap-5">
      <PageHeader
        icon={PackageMinus}
        eyebrow="Opérations"
        title="Sorties"
        subtitle={`${count} sortie${count > 1 ? "s" : ""} pour ce filtre.`}
      >
        {peutEcrire ? (
          <LinkButton href="/sorties/nouvelle">
            <Plus className="h-4 w-4" strokeWidth={2} /> Nouvelle sortie
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
            <span className="font-medium text-foreground">Référence, projet, TRD</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher…"
              className="px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-foreground">Client</span>
            <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="px-3 py-2 text-sm">
              <option value="">Tous les clients</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom}
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
                setClientId("");
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
        ressourceType="sortie"
        titre={(a) => String(a.client_nom ?? a.projet ?? "Nouvelle sortie")}
        sousTitre={(a) => [a.projet, a.trd].filter(Boolean).join(" · ") || null}
      />

      {!items && !error ? <ListSkeleton /> : null}

      {items && mode === "liste" ? (
        <TableCard minWidth={720}>
          <THead
            columns={["Référence", "Client", "Projet", "TRD", "Date", "Unités", "Statut"]}
          />
          <tbody>
            {items.map((s) => (
              <tr key={s.id} className={TABLE_ROW_CLASS}>
                <td className={TABLE_CELL_CLASS}>
                  <Link href={`/sorties/${s.id}`} className="font-mono text-xs text-accent-strong hover:underline">
                    {s.reference}
                  </Link>
                </td>
                <td className={`${TABLE_CELL_CLASS} font-medium text-foreground`}>{s.client_nom}</td>
                <td className={`${TABLE_CELL_CLASS} text-muted`}>{s.projet}</td>
                <td className={`${TABLE_CELL_CLASS} font-mono text-xs text-muted`}>{s.trd}</td>
                <td className={`${TABLE_CELL_CLASS} text-muted`}>
                  {new Date(s.date_sortie).toLocaleDateString("fr-FR")}
                </td>
                <td className={`${TABLE_CELL_CLASS} tabular-nums text-muted`}>{s.nb_unites}</td>
                <td className={TABLE_CELL_CLASS}>
                  <Badge tone={STATUT_TONES[s.statut]}>{STATUT_LABELS[s.statut]}</Badge>
                </td>
              </tr>
            ))}
            {items.length === 0 ? (
              <TableEmptyRow colSpan={7}>Aucune sortie pour ce filtre.</TableEmptyRow>
            ) : null}
          </tbody>
        </TableCard>
      ) : null}

      {items && mode === "cartes" ? (
        items.length === 0 ? (
          <InlineEmpty icon={PackageMinus} title="Aucune sortie pour ce filtre." />
        ) : (
          <div className="oa-stagger grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((s) => (
              <Link key={s.id} href={`/sorties/${s.id}`} className="block">
                <GlassCard className="oa-lift flex h-full flex-col gap-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-xs text-accent-strong">{s.reference}</p>
                      <p className="truncate font-medium text-foreground">{s.client_nom}</p>
                    </div>
                    <Badge tone={STATUT_TONES[s.statut]}>{STATUT_LABELS[s.statut]}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 border-t border-line/70 pt-3">
                    <CardField label="Projet">{s.projet}</CardField>
                    <CardField label="TRD">
                      <span className="font-mono text-xs">{s.trd}</span>
                    </CardField>
                    <CardField label="Date">{new Date(s.date_sortie).toLocaleDateString("fr-FR")}</CardField>
                    <CardField label="Unités">{s.nb_unites}</CardField>
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
