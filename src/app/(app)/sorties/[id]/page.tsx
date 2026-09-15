"use client";

import { useRouter } from "next/navigation";
import { Camera, Download, PackageMinus, Trash2, X } from "lucide-react";
import { use, useCallback, useEffect, useState } from "react";

import { useLiveQuery } from "dexie-react-hooks";

import { SerialSearch } from "@/components/serial-search";
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
import { Field } from "@/components/ui/field";
import { GlassCard } from "@/components/ui/glass-card";
import { InlineEmpty } from "@/components/ui/list-states";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusPill } from "@/components/ui/status-pill";
import { ViewToggle } from "@/components/ui/view-toggle";
import { useAuth } from "@/lib/auth-context";
import { useConnectivity } from "@/lib/connectivity-context";
import { db, type OperationEnAttente } from "@/lib/offline-db";
import { enfiler } from "@/lib/sync-engine";
import { useViewMode } from "@/lib/use-view-mode";

interface Fournisseur {
  id: string;
  code: string;
  nom: string;
}

interface LigneSortie {
  id: string;
  unite_stock: string;
  numero_serie: string;
  type_article: "FLEXITANK" | "HEATING_PAD";
  fournisseur_code: string;
  ajoute_le: string;
}

type StatutLigneAffichee = "confirmee" | "attente" | "syncing" | "erreur" | "retrait_attente";

function pillStatus(statut: StatutLigneAffichee): "pending" | "syncing" | "error" {
  if (statut === "syncing") return "syncing";
  if (statut === "erreur") return "error";
  return "pending"; // "attente" ou "retrait_attente"
}

/** Ligne réelle ou opération de ligne encore en file (Phase 2) — le type et
 * le fournisseur d'une ligne en attente ne sont pas forcément connus côté
 * client (résolus par le serveur), affichés "—" le cas échéant plutôt
 * qu'inventés. */
type LigneAffichee = Omit<LigneSortie, "type_article"> & {
  type_article: LigneSortie["type_article"] | null;
  _opId?: string;
  _statut: StatutLigneAffichee;
  _erreur?: string;
};

type StatutSortie = "BROUILLON" | "VALIDEE" | "ANNULEE";

interface SortieDetail {
  id: string;
  reference: string;
  client: string;
  client_nom: string;
  projet: string;
  trd: string;
  date_sortie: string;
  statut: StatutSortie;
  nb_unites: number;
  valide_le: string | null;
  annule_le: string | null;
  motif_annulation: string;
  notes: string;
  lignes: LigneSortie[];
}

const TYPE_LABELS: Record<LigneSortie["type_article"], string> = {
  FLEXITANK: "Flexitank",
  HEATING_PAD: "Heating pad",
};

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

export default function SortieDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { authFetch, user } = useAuth();
  const { enLigne } = useConnectivity();
  const router = useRouter();

  const [sortie, setSortie] = useState<SortieDetail | null>(null);
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [numeroSerie, setNumeroSerie] = useState("");
  const [fournisseurId, setFournisseurId] = useState("");
  const [ligneError, setLigneError] = useState<string | null>(null);
  const [ajoutEnCours, setAjoutEnCours] = useState(false);
  const [actionEnCours, setActionEnCours] = useState(false);
  const [annulationOuverte, setAnnulationOuverte] = useState(false);
  const [motif, setMotif] = useState("");
  const { mode, preference, setPreference } = useViewMode("sortie-lignes");

  const peutEcrire = user?.role === "ADMIN" || user?.role === "MAGASINIER";
  const estAdmin = user?.role === "ADMIN";

  const charger = useCallback(async () => {
    const res = await authFetch(`/sorties/${id}/`);
    if (!res.ok) {
      setError(res.status === 404 ? "Sortie introuvable." : `Erreur ${res.status} lors du chargement.`);
      return;
    }
    setSortie((await res.json()) as SortieDetail);
  }, [authFetch, id]);

  useEffect(() => {
    // IIFE async : voir la même contrainte ESLint (react-hooks/set-state-in-effect)
    // résolue ailleurs dans le projet, ex. stock/page.tsx.
    (async () => {
      await charger();
    })();
  }, [charger]);

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

  // Opérations de ligne (ajout/retrait) en attente pour CETTE sortie — jamais
  // de garde « parent pas encore synchronisé » nécessaire ici : cette page
  // n'est atteignable que via un vrai id serveur (les créations en attente
  // n'ont pas de route détail, voir /sorties + <PendingCreations>).
  const operationsLignes =
    useLiveQuery<OperationEnAttente[], OperationEnAttente[]>(
      () =>
        user
          ? db.operations
              .where({ ressourceType: "sortie", parentId: id })
              .and((op) => op.utilisateurId === user.id && op.type !== "sortie.creer" && op.statut !== "synchronise")
              .toArray()
          : Promise.resolve([]),
      [id, user?.id],
      [],
    ) ?? [];

  const ajoutsEnAttente = operationsLignes.filter((op) => op.type === "sortie.ligne.ajouter");
  const idsEnRetrait = new Set(
    operationsLignes
      .filter((op) => op.type === "sortie.ligne.retirer")
      .map((op) => op.chemin.split("/").filter(Boolean).pop()),
  );

  // Recharge le document réel dès qu'une opération de ligne de CETTE sortie
  // a réellement synchronisé (l'ajout optimiste ne remplace jamais la vérité
  // serveur — numéro de série exact, type d'article résolu, etc.).
  useEffect(() => {
    const surSync = (e: Event) => {
      const detail = (e as CustomEvent<{ ressourceType?: string; parentId?: string }>).detail;
      if (detail?.ressourceType === "sortie" && detail?.parentId === id) void charger();
    };
    window.addEventListener("oa:operation-synchronisee", surSync);
    return () => window.removeEventListener("oa:operation-synchronisee", surSync);
  }, [charger, id]);

  async function ajouterLigne() {
    setLigneError(null);

    if (!enLigne) {
      const fournisseurCode = fournisseurs.find((f) => f.id === fournisseurId)?.code ?? "";
      await enfiler({
        type: "sortie.ligne.ajouter", ressourceType: "sortie", utilisateurId: user!.id,
        parentId: id, methode: "POST", chemin: `/sorties/${id}/lignes/`,
        corps: { numero_serie: numeroSerie, fournisseur: fournisseurId || undefined },
        apercu: { numero_serie: numeroSerie, fournisseur_code: fournisseurCode },
      });
      setNumeroSerie("");
      setFournisseurId("");
      return; // pas de charger() : la fusion useLiveQuery met déjà l'UI à jour
    }

    setAjoutEnCours(true);
    try {
      const res = await authFetch(`/sorties/${id}/lignes/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numero_serie: numeroSerie, fournisseur: fournisseurId || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLigneError(Array.isArray(data?.detail) ? data.detail[0] : "Ajout impossible.");
        return;
      }
      setNumeroSerie("");
      setFournisseurId("");
      await charger();
    } finally {
      setAjoutEnCours(false);
    }
  }

  async function retirerLigne(ligne: LigneAffichee) {
    if (ligne._opId) {
      // Ligne encore en file, jamais envoyée : annulation locale, aucun appel réseau.
      await db.operations.delete(ligne._opId);
      return;
    }
    if (!enLigne) {
      await enfiler({
        type: "sortie.ligne.retirer", ressourceType: "sortie", utilisateurId: user!.id,
        parentId: id, methode: "DELETE", chemin: `/sorties/${id}/lignes/${ligne.id}/`,
      });
      return;
    }
    setActionEnCours(true);
    try {
      const res = await authFetch(`/sorties/${id}/lignes/${ligne.id}/`, { method: "DELETE" });
      if (res.ok) await charger();
    } finally {
      setActionEnCours(false);
    }
  }

  async function valider() {
    if (!window.confirm("Valider cette sortie ? Les unités passeront « Sorti » et le bon de sortie sera disponible.")) return;
    setActionEnCours(true);
    setError(null);
    try {
      const res = await authFetch(`/sorties/${id}/valider/`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(Array.isArray(data?.detail) ? data.detail[0] : "Validation impossible.");
        return;
      }
      setSortie(data as SortieDetail);
    } finally {
      setActionEnCours(false);
    }
  }

  async function confirmerAnnulation() {
    setActionEnCours(true);
    setError(null);
    try {
      const res = await authFetch(`/sorties/${id}/annuler/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motif }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(Array.isArray(data?.detail) ? data.detail[0] : "Annulation impossible.");
        return;
      }
      setSortie(data as SortieDetail);
      setAnnulationOuverte(false);
      setMotif("");
    } finally {
      setActionEnCours(false);
    }
  }

  async function supprimer() {
    if (!window.confirm("Supprimer ce brouillon de sortie ?")) return;
    setActionEnCours(true);
    try {
      const res = await authFetch(`/sorties/${id}/`, { method: "DELETE" });
      if (res.ok) router.push("/sorties");
    } finally {
      setActionEnCours(false);
    }
  }

  async function telechargerBonDeSortie() {
    const res = await authFetch(`/sorties/${id}/bon-de-sortie.pdf/`);
    if (!res.ok) {
      setError("Le bon de sortie n'est pas disponible.");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sortie?.reference ?? "bon-de-sortie"}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  if (error && !sortie) {
    return <GlassCard className="oa-rise px-4 py-3 text-sm text-crit">{error}</GlassCard>;
  }

  if (!sortie) {
    return (
      <GlassCard className="oa-rise flex flex-col gap-3 p-5">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </GlassCard>
    );
  }

  const brouillon = sortie.statut === "BROUILLON";
  const validee = sortie.statut === "VALIDEE";
  const annulee = sortie.statut === "ANNULEE";
  const nbFlexitank = sortie.lignes.filter((l) => l.type_article === "FLEXITANK").length;
  const nbHeatingPad = sortie.lignes.filter((l) => l.type_article === "HEATING_PAD").length;

  const lignesAffichees: LigneAffichee[] = [
    ...sortie.lignes.map((l) => ({
      ...l,
      _statut: (idsEnRetrait.has(l.id) ? "retrait_attente" : "confirmee") as StatutLigneAffichee,
    })),
    ...ajoutsEnAttente.map((op) => {
      const corps = (op.corps ?? {}) as { numero_serie?: string };
      const apercu = (op.apercu ?? {}) as { numero_serie?: string; fournisseur_code?: string };
      return {
        id: `local-${op.id}`,
        _opId: op.id,
        unite_stock: "",
        numero_serie: apercu.numero_serie ?? corps.numero_serie ?? "",
        type_article: null,
        fournisseur_code: apercu.fournisseur_code ?? "",
        ajoute_le: new Date(op.dateCreation).toISOString(),
        _statut: (op.statut === "en_cours" ? "syncing" : op.statut === "echec" ? "erreur" : "attente") as StatutLigneAffichee,
        _erreur: op.erreur,
      };
    }),
  ];

  return (
    <div className="oa-rise flex flex-col gap-5">
      <PageHeader
        icon={PackageMinus}
        eyebrow="Bon de sortie"
        title={sortie.reference}
        mono
        subtitle={sortie.client_nom}
        backHref="/sorties"
        backLabel="Retour aux sorties"
      >
        <Badge tone={STATUT_TONES[sortie.statut]}>{STATUT_LABELS[sortie.statut]}</Badge>
      </PageHeader>

      <SectionCard eyebrow="Détails" tone="strong">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Field label="Projet">{sortie.projet}</Field>
          <Field label="TRD">{sortie.trd}</Field>
          <Field label="Date de sortie">{new Date(sortie.date_sortie).toLocaleDateString("fr-FR")}</Field>
          <Field label="Unités">{sortie.nb_unites}</Field>
          <Field label="Flexitanks">{nbFlexitank}</Field>
          <Field label="Heating pads">{nbHeatingPad}</Field>
        </div>

        {annulee ? (
          <p className="rounded-lg bg-crit/10 px-3 py-2 text-sm text-crit">
            Annulée — motif : {sortie.motif_annulation}
          </p>
        ) : null}

        {error ? <p className="rounded-lg bg-crit/10 px-3 py-2 text-sm text-crit">{error}</p> : null}

        {peutEcrire && (brouillon || validee) ? (
          <div className="flex flex-wrap gap-2 border-t border-line/70 pt-4">
            {brouillon ? (
              <>
                <Button onClick={valider} disabled={actionEnCours || sortie.nb_unites === 0}>
                  Valider la sortie
                </Button>
                <Button variant="danger" onClick={supprimer} disabled={actionEnCours}>
                  <Trash2 className="h-4 w-4" /> Supprimer le brouillon
                </Button>
              </>
            ) : null}
            {validee ? (
              <>
                <Button onClick={telechargerBonDeSortie}>
                  <Download className="h-4 w-4" /> Bon de sortie (PDF)
                </Button>
                {/* Annuler une sortie déjà validée est réservé à l'admin (Jalon 6) —
                    opération sensible sur un document déjà répercuté sur le stock réel. */}
                {estAdmin && !annulationOuverte ? (
                  <Button variant="danger" onClick={() => setAnnulationOuverte(true)}>
                    Annuler la sortie
                  </Button>
                ) : null}
              </>
            ) : null}
          </div>
        ) : null}

        {estAdmin && annulationOuverte ? (
          <div className="oa-form flex flex-col gap-2 rounded-xl border border-crit/30 bg-crit-soft/40 p-4">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-foreground">Motif d&apos;annulation</span>
              <textarea
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
                rows={2}
                className="px-3 py-2 text-sm"
                placeholder="Obligatoire — ex. erreur de saisie, commande annulée…"
              />
            </label>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setAnnulationOuverte(false)}>
                <X className="h-4 w-4" /> Annuler
              </Button>
              <Button variant="danger" onClick={confirmerAnnulation} disabled={actionEnCours || !motif.trim()}>
                Confirmer l&apos;annulation
              </Button>
            </div>
          </div>
        ) : null}
      </SectionCard>

      {brouillon && peutEcrire ? (
        <SectionCard eyebrow="Composition" title="Ajouter une unité">
          <div className="oa-form flex flex-col gap-3 sm:flex-row sm:items-center">
            <SerialSearch
              value={numeroSerie}
              onChange={setNumeroSerie}
              onSelect={(u) => setFournisseurId(u.fournisseur)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), ajouterLigne())}
              placeholder="Numéro de série (scan ou saisie)"
              className="w-full sm:max-w-xs"
            />
            <select
              value={fournisseurId}
              onChange={(e) => setFournisseurId(e.target.value)}
              className="px-3 py-2 text-sm"
            >
              <option value="">Fournisseur (si ambigu)</option>
              {fournisseurs.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nom}
                </option>
              ))}
            </select>
            <Button onClick={ajouterLigne} disabled={ajoutEnCours || !numeroSerie.trim()}>
              Ajouter
            </Button>
            <Button variant="secondary" onClick={() => router.push(`/scan?sortie=${id}`)}>
              <Camera className="h-4 w-4" /> Scanner
            </Button>
          </div>
          {ligneError ? <p className="text-sm text-crit">{ligneError}</p> : null}
        </SectionCard>
      ) : null}

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Unités</h2>
        <ViewToggle mode={preference} onChange={setPreference} />
      </div>

      {mode === "liste" ? (
        <TableCard minWidth={560}>
          <THead
            columns={
              brouillon && peutEcrire
                ? ["Numéro de série", "Type", "Fournisseur", "Statut", ""]
                : ["Numéro de série", "Type", "Fournisseur", "Statut"]
            }
          />
          <tbody>
            {lignesAffichees.map((l) => (
              <tr key={l.id} className={TABLE_ROW_CLASS}>
                <td className={`${TABLE_CELL_CLASS} font-mono text-xs ${l._statut === "retrait_attente" ? "text-muted line-through" : ""}`}>
                  {l.numero_serie}
                </td>
                <td className={`${TABLE_CELL_CLASS} text-muted`}>{l.type_article ? TYPE_LABELS[l.type_article] : "—"}</td>
                <td className={`${TABLE_CELL_CLASS} font-mono text-xs text-muted`}>{l.fournisseur_code || "—"}</td>
                <td className={TABLE_CELL_CLASS}>
                  {l._statut !== "confirmee" ? (
                    <StatusPill
                      status={pillStatus(l._statut)}
                      label={l._statut === "retrait_attente" ? "Retrait en attente" : l._erreur}
                    />
                  ) : null}
                </td>
                {brouillon && peutEcrire ? (
                  <td className={`${TABLE_CELL_CLASS} text-right`}>
                    <button
                      onClick={() => retirerLigne(l)}
                      disabled={actionEnCours}
                      aria-label={`Retirer ${l.numero_serie}`}
                      className="text-muted transition-colors hover:text-crit"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </td>
                ) : null}
              </tr>
            ))}
            {lignesAffichees.length === 0 ? (
              <TableEmptyRow colSpan={brouillon && peutEcrire ? 5 : 4}>
                Aucune unité pour l&apos;instant.
              </TableEmptyRow>
            ) : null}
          </tbody>
        </TableCard>
      ) : lignesAffichees.length === 0 ? (
        <InlineEmpty icon={PackageMinus} title="Aucune unité pour l'instant." />
      ) : (
        <div className="oa-stagger grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {lignesAffichees.map((l) => (
            <GlassCard key={l.id} className="flex flex-col gap-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <p className={`truncate font-mono text-sm font-medium text-foreground ${l._statut === "retrait_attente" ? "text-muted line-through" : ""}`}>
                  {l.numero_serie}
                </p>
                {brouillon && peutEcrire ? (
                  <button
                    onClick={() => retirerLigne(l)}
                    disabled={actionEnCours}
                    aria-label={`Retirer ${l.numero_serie}`}
                    className="text-muted transition-colors hover:text-crit"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
              {l._statut !== "confirmee" ? (
                <StatusPill
                  status={pillStatus(l._statut)}
                  label={l._statut === "retrait_attente" ? "Retrait en attente" : l._erreur}
                />
              ) : null}
              <div className="grid grid-cols-2 gap-3">
                <CardField label="Type">{l.type_article ? TYPE_LABELS[l.type_article] : "—"}</CardField>
                <CardField label="Fournisseur">
                  <span className="font-mono text-xs">{l.fournisseur_code || "—"}</span>
                </CardField>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
