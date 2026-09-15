"use client";

import { useRouter } from "next/navigation";
import { FileSearch, PackagePlus, Rows3, Trash2, X } from "lucide-react";
import { use, useCallback, useEffect, useRef, useState } from "react";
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
import { LinkButton } from "@/components/ui/link-button";
import { InlineEmpty } from "@/components/ui/list-states";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusPill, type StatusPillState } from "@/components/ui/status-pill";
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

interface LigneReception {
  id: string;
  numero_serie: string;
  fournisseur: string | null;
  fournisseur_code: string | null;
  type_article: "FLEXITANK" | "HEATING_PAD";
  statut_ligne: "OK" | "DOUBLON" | "FORMAT_INVALIDE" | "A_VERIFIER";
  source: "EXTRACTION" | "PLAGE" | "MANUEL" | "REPRISE";
}

type NatureReception = "ARRIVAGE" | "SAISIE" | "REPRISE";
type StatutReception = "BROUILLON" | "VALIDEE" | "ANNULEE";

interface ReceptionDetail {
  id: string;
  reference: string;
  nature: NatureReception;
  fournisseur: string | null;
  fournisseur_code: string | null;
  reference_fournisseur: string;
  fichier: string | null;
  date_reception: string;
  statut: StatutReception;
  quantite_annoncee: number | null;
  nb_lignes: number;
  motif_annulation: string;
  lignes: LigneReception[];
}

interface PlageDetectee {
  prefixe: string;
  debut: number;
  fin: number;
  largeur: number;
  complet: boolean;
  nb_trouves: number;
  nb_attendus: number;
}

type StatutLigneAffichee = "confirmee" | "attente" | "syncing" | "erreur" | "retrait_attente";

function pillStatus(statut: StatutLigneAffichee): StatusPillState {
  if (statut === "syncing") return "syncing";
  if (statut === "erreur") return "error";
  return "pending"; // "attente" ou "retrait_attente"
}

type LigneAffichee = Omit<LigneReception, "statut_ligne" | "source"> & {
  statut_ligne: LigneReception["statut_ligne"] | null;
  source: LigneReception["source"] | null;
  _opId?: string;
  _statut: StatutLigneAffichee;
  _erreur?: string;
};

const TYPE_LABELS: Record<LigneReception["type_article"], string> = {
  FLEXITANK: "Flexitank",
  HEATING_PAD: "Heating pad",
};

const STATUT_LIGNE_LABELS: Record<LigneReception["statut_ligne"], string> = {
  OK: "OK",
  DOUBLON: "Doublon",
  FORMAT_INVALIDE: "Format invalide",
  A_VERIFIER: "À vérifier",
};

const STATUT_LIGNE_TONES: Record<LigneReception["statut_ligne"], "ok" | "crit" | "warn"> = {
  OK: "ok",
  DOUBLON: "crit",
  FORMAT_INVALIDE: "crit",
  A_VERIFIER: "warn",
};

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

export default function ReceptionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { authFetch, user } = useAuth();
  const { enLigne } = useConnectivity();
  const router = useRouter();

  const [reception, setReception] = useState<ReceptionDetail | null>(null);
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [actionEnCours, setActionEnCours] = useState(false);

  // Formulaire "ajouter une unité"
  const [numeroSerie, setNumeroSerie] = useState("");
  const [typeArticle, setTypeArticle] = useState<"FLEXITANK" | "HEATING_PAD">("HEATING_PAD");
  const [fournisseurCode, setFournisseurCode] = useState("");
  const [ligneError, setLigneError] = useState<string | null>(null);
  const [ajoutEnCours, setAjoutEnCours] = useState(false);

  // Formulaire "générer une plage"
  const [plageOuverte, setPlageOuverte] = useState(false);
  const [prefixe, setPrefixe] = useState("");
  const [debut, setDebut] = useState("1");
  const [fin, setFin] = useState("");
  const [largeur, setLargeur] = useState("");
  const [plageError, setPlageError] = useState<string | null>(null);

  const [annulationOuverte, setAnnulationOuverte] = useState(false);
  const [motif, setMotif] = useState("");

  // PDF d'arrivage — chargé en blob (l'endpoint exige un jeton JWT, un <a
  // href> nu ne suffirait pas) puis affiché via une URL d'objet locale.
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const pdfUrlRef = useRef<string | null>(null);

  // Extraction (Jalon 4)
  const [typeArticleExtraction, setTypeArticleExtraction] = useState<"" | "FLEXITANK" | "HEATING_PAD">("");
  const { mode, preference, setPreference } = useViewMode("reception-lignes");
  const [extractionEnCours, setExtractionEnCours] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [plageDetectee, setPlageDetectee] = useState<PlageDetectee | null>(null);
  const [extractionGenerique, setExtractionGenerique] = useState<boolean | null>(null);

  const peutEcrire = user?.role === "ADMIN" || user?.role === "MAGASINIER";
  const estAdmin = user?.role === "ADMIN";

  const charger = useCallback(async () => {
    const res = await authFetch(`/receptions/${id}/`);
    if (!res.ok) {
      setError(res.status === 404 ? "Réception introuvable." : `Erreur ${res.status} lors du chargement.`);
      return;
    }
    setReception((await res.json()) as ReceptionDetail);
  }, [authFetch, id]);

  useEffect(() => {
    (async () => {
      await charger();
    })();
  }, [charger]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await authFetch("/fournisseurs/?ordering=nom");
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
      if (!reception?.fichier) return;
      // Passe par l'API (authFetch), pas l'URL média brute : évite un souci
      // CORS quand le frontend et l'API ne sont pas sur le même hôte (ex.
      // tunnel) — même raison que le bon de sortie des sorties (Jalon 2).
      const res = await authFetch(`/receptions/${id}/fichier/`).catch(() => null);
      if (cancelled || !res?.ok) return;
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      if (cancelled) {
        URL.revokeObjectURL(objectUrl);
        return;
      }
      if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current);
      pdfUrlRef.current = objectUrl;
      setPdfUrl(objectUrl);
    })();
    return () => {
      cancelled = true;
    };
  }, [authFetch, id, reception?.fichier]);

  useEffect(
    () => () => {
      if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current);
    },
    [],
  );

  const estReprise = reception?.nature === "REPRISE";
  const estArrivage = reception?.nature === "ARRIVAGE";

  // Opérations de ligne (ajout/retrait/plage) en attente pour CETTE réception
  // — même principe que sorties/[id] : aucune garde « parent pas encore
  // synchronisé » nécessaire, cette page n'est atteignable que via un vrai id.
  const operationsLignes =
    useLiveQuery<OperationEnAttente[], OperationEnAttente[]>(
      () =>
        user
          ? db.operations
              .where({ ressourceType: "reception", parentId: id })
              .and((op) => op.utilisateurId === user.id && op.type !== "reception.creer" && op.statut !== "synchronise")
              .toArray()
          : Promise.resolve([]),
      [id, user?.id],
      [],
    ) ?? [];

  const ajoutsEnAttente = operationsLignes.filter((op) => op.type === "reception.ligne.ajouter");
  const plagesEnAttente = operationsLignes.filter((op) => op.type === "reception.plage.generer");
  const idsEnRetrait = new Set(
    operationsLignes
      .filter((op) => op.type === "reception.ligne.retirer")
      .map((op) => op.chemin.split("/").filter(Boolean).pop()),
  );

  useEffect(() => {
    const surSync = (e: Event) => {
      const detail = (e as CustomEvent<{ ressourceType?: string; parentId?: string }>).detail;
      if (detail?.ressourceType === "reception" && detail?.parentId === id) void charger();
    };
    window.addEventListener("oa:operation-synchronisee", surSync);
    return () => window.removeEventListener("oa:operation-synchronisee", surSync);
  }, [charger, id]);

  async function ajouterLigne() {
    setLigneError(null);

    if (!enLigne) {
      await enfiler({
        type: "reception.ligne.ajouter", ressourceType: "reception", utilisateurId: user!.id,
        parentId: id, methode: "POST", chemin: `/receptions/${id}/lignes/`,
        corps: { numero_serie: numeroSerie, type_article: typeArticle, fournisseur_code: estReprise ? fournisseurCode : undefined },
        apercu: { numero_serie: numeroSerie, type_article: typeArticle, fournisseur_code: estReprise ? fournisseurCode : (reception?.fournisseur_code ?? "") },
      });
      setNumeroSerie("");
      if (!estReprise) setFournisseurCode("");
      return; // pas de charger() : la fusion useLiveQuery met déjà l'UI à jour
    }

    setAjoutEnCours(true);
    try {
      const res = await authFetch(`/receptions/${id}/lignes/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          numero_serie: numeroSerie, type_article: typeArticle,
          fournisseur_code: estReprise ? fournisseurCode : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLigneError(Array.isArray(data?.detail) ? data.detail[0] : "Ajout impossible.");
        return;
      }
      setNumeroSerie("");
      if (!estReprise) setFournisseurCode("");
      await charger();
    } finally {
      setAjoutEnCours(false);
    }
  }

  async function genererPlage() {
    setPlageError(null);

    if (!enLigne) {
      await enfiler({
        type: "reception.plage.generer", ressourceType: "reception", utilisateurId: user!.id,
        parentId: id, methode: "POST", chemin: `/receptions/${id}/lignes/plage/`,
        corps: {
          prefixe, debut: Number(debut), fin: Number(fin),
          largeur: largeur ? Number(largeur) : undefined,
          type_article: typeArticle,
          fournisseur_code: estReprise ? fournisseurCode : undefined,
        },
        apercu: { prefixe, debut, fin, type_article: typeArticle },
      });
      setPrefixe("");
      setDebut("1");
      setFin("");
      setLargeur("");
      setPlageOuverte(false);
      return;
    }

    setActionEnCours(true);
    try {
      const res = await authFetch(`/receptions/${id}/lignes/plage/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prefixe, debut: Number(debut), fin: Number(fin),
          largeur: largeur ? Number(largeur) : undefined,
          type_article: typeArticle,
          fournisseur_code: estReprise ? fournisseurCode : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPlageError(Array.isArray(data?.detail) ? data.detail[0] : "Génération impossible.");
        return;
      }
      setPrefixe("");
      setDebut("1");
      setFin("");
      setLargeur("");
      setPlageOuverte(false);
      await charger();
    } finally {
      setActionEnCours(false);
    }
  }

  async function lancerExtraction() {
    setExtractionError(null);
    setExtractionEnCours(true);
    try {
      const res = await authFetch(`/receptions/${id}/extraire/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(typeArticleExtraction ? { type_article: typeArticleExtraction } : {}),
      });
      const data = await res.json();
      if (!res.ok) {
        setExtractionError(Array.isArray(data?.detail) ? data.detail[0] : "Extraction impossible.");
        return;
      }
      setPlageDetectee(data.plage_detectee as PlageDetectee | null);
      setExtractionGenerique(data.generique as boolean);
      await charger();
    } finally {
      setExtractionEnCours(false);
    }
  }

  function completerAvecLaPlage() {
    if (!plageDetectee) return;
    setPrefixe(plageDetectee.prefixe);
    setDebut(String(plageDetectee.debut));
    setFin(String(plageDetectee.fin));
    setLargeur(String(plageDetectee.largeur));
    setTypeArticle((reception?.lignes[0]?.type_article as "FLEXITANK" | "HEATING_PAD") ?? "FLEXITANK");
    setPlageOuverte(true);
  }

  async function retirerLigne(ligne: LigneAffichee) {
    if (ligne._opId) {
      // Ligne encore en file, jamais envoyée : annulation locale, aucun appel réseau.
      await db.operations.delete(ligne._opId);
      return;
    }
    if (!enLigne) {
      await enfiler({
        type: "reception.ligne.retirer", ressourceType: "reception", utilisateurId: user!.id,
        parentId: id, methode: "DELETE", chemin: `/receptions/${id}/lignes/${ligne.id}/`,
      });
      return;
    }
    setActionEnCours(true);
    try {
      const res = await authFetch(`/receptions/${id}/lignes/${ligne.id}/`, { method: "DELETE" });
      if (res.ok) await charger();
    } finally {
      setActionEnCours(false);
    }
  }

  async function valider() {
    if (!window.confirm("Valider cette réception ? Chaque unité OK passera en stock.")) return;
    setActionEnCours(true);
    setError(null);
    try {
      const res = await authFetch(`/receptions/${id}/valider/`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(Array.isArray(data?.detail) ? data.detail[0] : "Validation impossible.");
        return;
      }
      setReception(data as ReceptionDetail);
    } finally {
      setActionEnCours(false);
    }
  }

  async function confirmerAnnulation() {
    setActionEnCours(true);
    setError(null);
    try {
      const res = await authFetch(`/receptions/${id}/annuler/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motif }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(Array.isArray(data?.detail) ? data.detail[0] : "Annulation impossible.");
        return;
      }
      setReception(data as ReceptionDetail);
      setAnnulationOuverte(false);
      setMotif("");
    } finally {
      setActionEnCours(false);
    }
  }

  async function supprimer() {
    if (!window.confirm("Supprimer ce brouillon de réception ?")) return;
    setActionEnCours(true);
    try {
      const res = await authFetch(`/receptions/${id}/`, { method: "DELETE" });
      if (res.ok) router.push("/receptions");
    } finally {
      setActionEnCours(false);
    }
  }

  if (error && !reception) {
    return <GlassCard className="oa-rise px-4 py-3 text-sm text-crit">{error}</GlassCard>;
  }

  if (!reception) {
    return (
      <GlassCard className="oa-rise flex flex-col gap-3 p-5">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </GlassCard>
    );
  }

  const brouillon = reception.statut === "BROUILLON";
  const validee = reception.statut === "VALIDEE";
  const annulee = reception.statut === "ANNULEE";
  const lignesProblematiques = reception.lignes.filter((l) => l.statut_ligne !== "OK").length;
  const ecartAnnonce =
    reception.quantite_annoncee != null && reception.quantite_annoncee !== reception.lignes.length;
  const colInput = "min-h-11 px-3 py-2 text-sm";

  const lignesAffichees: LigneAffichee[] = [
    ...reception.lignes.map((l) => ({
      ...l,
      _statut: (idsEnRetrait.has(l.id) ? "retrait_attente" : "confirmee") as StatutLigneAffichee,
    })),
    ...ajoutsEnAttente.map((op) => {
      const apercu = (op.apercu ?? {}) as { numero_serie?: string; type_article?: LigneReception["type_article"]; fournisseur_code?: string };
      return {
        id: `local-${op.id}`,
        _opId: op.id,
        numero_serie: apercu.numero_serie ?? "",
        fournisseur: null,
        fournisseur_code: apercu.fournisseur_code ?? null,
        type_article: apercu.type_article ?? "HEATING_PAD",
        statut_ligne: null,
        source: null,
        _statut: (op.statut === "en_cours" ? "syncing" : op.statut === "echec" ? "erreur" : "attente") as StatutLigneAffichee,
        _erreur: op.erreur,
      };
    }),
  ];

  return (
    <div className="oa-rise flex flex-col gap-5">
      <PageHeader
        icon={PackagePlus}
        eyebrow="Réception"
        title={reception.reference}
        mono
        subtitle={
          NATURE_LABELS[reception.nature] +
          (reception.fournisseur_code ? ` — ${reception.fournisseur_code}` : "")
        }
        backHref="/receptions"
        backLabel="Retour aux réceptions"
      >
        <Badge tone={STATUT_TONES[reception.statut]}>{STATUT_LABELS[reception.statut]}</Badge>
      </PageHeader>

      <SectionCard eyebrow="Détails" tone="strong">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Field label="Référence fournisseur">{reception.reference_fournisseur || "—"}</Field>
          <Field label="Date de réception">
            {new Date(reception.date_reception).toLocaleDateString("fr-FR")}
          </Field>
          <Field label="Quantité annoncée">{reception.quantite_annoncee ?? "—"}</Field>
          <Field label="Unités">{reception.lignes.length}</Field>
        </div>

        {ecartAnnonce ? (
          <p className="rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">
            Écart avec la quantité annoncée : {reception.lignes.length} ligne(s) contre{" "}
            {reception.quantite_annoncee} annoncée(s) — à vérifier avant validation.
          </p>
        ) : null}

        {annulee ? (
          <p className="rounded-lg bg-crit/10 px-3 py-2 text-sm text-crit">
            Annulée — motif : {reception.motif_annulation}
          </p>
        ) : null}

        {error ? <p className="rounded-lg bg-crit/10 px-3 py-2 text-sm text-crit">{error}</p> : null}

        {peutEcrire && (brouillon || (estAdmin && validee)) ? (
          <div className="flex flex-wrap gap-2 border-t border-line/70 pt-4">
            {brouillon ? (
              <>
                <Button onClick={valider} disabled={actionEnCours || reception.lignes.length === 0 || lignesProblematiques > 0}>
                  Valider la réception
                </Button>
                <Button variant="danger" onClick={supprimer} disabled={actionEnCours}>
                  <Trash2 className="h-4 w-4" /> Supprimer le brouillon
                </Button>
              </>
            ) : null}
            {/* Annuler une réception déjà validée est réservé à l'admin (Jalon 6) —
                opération sensible sur un document déjà répercuté sur le stock réel. */}
            {estAdmin && validee && !annulationOuverte ? (
              <Button variant="danger" onClick={() => setAnnulationOuverte(true)}>
                Annuler la réception
              </Button>
            ) : null}
          </div>
        ) : null}

        {brouillon && lignesProblematiques > 0 ? (
          <p className="text-sm text-crit">
            {lignesProblematiques} ligne(s) à corriger (doublon) avant de pouvoir valider.
          </p>
        ) : null}

        {estAdmin && annulationOuverte ? (
          <div className="oa-form flex flex-col gap-2 rounded-xl border border-crit/30 bg-crit-soft/40 p-4">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-foreground">Motif d&apos;annulation</span>
              <textarea
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
                rows={2}
                className={colInput}
                placeholder="Obligatoire — refusé si une unité de cette réception est déjà sortie."
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

      {estArrivage ? (
        <SectionCard eyebrow="Arrivage" title="Document & extraction">
          <div className="flex flex-col gap-4 lg:flex-row">
            <div className="flex min-h-[320px] flex-1 flex-col gap-2">
              <p className="text-xs font-medium text-muted">Document d&apos;arrivage</p>
              {pdfUrl ? (
                <>
                  <iframe
                    src={pdfUrl}
                    title="PDF d'arrivage"
                    className="hidden min-h-[320px] flex-1 rounded-xl border border-line lg:block"
                  />
                  <LinkButton
                    href={pdfUrl}
                    target="_blank"
                    rel="noopener"
                    variant="secondary"
                    className="lg:hidden"
                  >
                    <FileSearch className="h-4 w-4" strokeWidth={2} aria-hidden />
                    Ouvrir le PDF
                  </LinkButton>
                </>
              ) : (
                <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-line text-sm text-muted">
                  Chargement du PDF…
                </div>
              )}
            </div>

            {brouillon && peutEcrire ? (
              <div className="oa-form flex flex-1 flex-col gap-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <FileSearch className="h-4 w-4" /> Extraction automatique
              </h3>
              <p className="text-xs text-muted">
                Relit le document selon le profil du fournisseur (réglable dans Fournisseurs).
                Sans profil, détection générique — chaque ligne est marquée « À vérifier ».
              </p>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-foreground">Type d&apos;article</span>
                <select
                  value={typeArticleExtraction}
                  onChange={(e) => setTypeArticleExtraction(e.target.value as typeof typeArticleExtraction)}
                  className={colInput}
                >
                  <option value="">Type par défaut du fournisseur, si réglé</option>
                  <option value="FLEXITANK">Flexitank</option>
                  <option value="HEATING_PAD">Heating pad</option>
                </select>
              </label>
              <Button onClick={lancerExtraction} disabled={extractionEnCours || !pdfUrl}>
                {extractionEnCours ? "Extraction…" : reception.lignes.some((l) => l.source === "EXTRACTION") ? "Relancer l'extraction" : "Lancer l'extraction"}
              </Button>
              {extractionError ? <p className="text-sm text-crit">{extractionError}</p> : null}
              {extractionGenerique ? (
                <p className="rounded-lg bg-warn-soft px-3 py-2 text-xs text-warn">
                  Aucun profil pour ce fournisseur — détection générique, à vérifier ligne par ligne.
                </p>
              ) : null}
              {plageDetectee && !plageDetectee.complet ? (
                <div className="flex flex-col gap-2 rounded-lg bg-warn-soft px-3 py-2 text-xs text-warn">
                  <span>
                    Séquence {plageDetectee.prefixe}
                    {String(plageDetectee.debut).padStart(plageDetectee.largeur, "0")}…
                    {String(plageDetectee.fin).padStart(plageDetectee.largeur, "0")} détectée, mais seulement{" "}
                    {plageDetectee.nb_trouves}/{plageDetectee.nb_attendus} numéros lus (colonne tronquée ?).
                  </span>
                  <Button variant="secondary" onClick={completerAvecLaPlage} className="w-fit">
                    Compléter avec le générateur de plage
                  </Button>
                </div>
              ) : null}
              </div>
            ) : null}
          </div>
        </SectionCard>
      ) : null}

      {brouillon && peutEcrire ? (
        <SectionCard eyebrow="Composition" title="Ajouter des unités">
          <div className="oa-form flex flex-col gap-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <SerialSearch
                value={numeroSerie}
                onChange={setNumeroSerie}
                onSelect={(u) => setTypeArticle(u.type_article)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), ajouterLigne())}
                placeholder="Numéro de série (scan ou saisie)"
                className="w-full sm:max-w-xs"
              />
              <select
                value={typeArticle}
                onChange={(e) => setTypeArticle(e.target.value as "FLEXITANK" | "HEATING_PAD")}
                className={colInput}
              >
                <option value="HEATING_PAD">Heating pad</option>
                <option value="FLEXITANK">Flexitank</option>
              </select>
              {estReprise ? (
                <>
                  <input
                    list="fournisseurs-existants"
                    value={fournisseurCode}
                    onChange={(e) => setFournisseurCode(e.target.value)}
                    placeholder="Code fournisseur (existant ou nouveau)"
                    className={colInput}
                  />
                  <datalist id="fournisseurs-existants">
                    {fournisseurs.map((f) => (
                      <option key={f.id} value={f.code} />
                    ))}
                  </datalist>
                </>
              ) : null}
              <Button onClick={ajouterLigne} disabled={ajoutEnCours || !numeroSerie.trim()}>
                Ajouter
              </Button>
            </div>
            {ligneError ? <p className="text-sm text-crit">{ligneError}</p> : null}
          </div>

          <div className="oa-form flex flex-col gap-3 border-t border-line/70 pt-4">
            <button
              type="button"
              onClick={() => setPlageOuverte((v) => !v)}
              className="flex w-fit items-center gap-2 text-sm font-semibold text-foreground"
            >
              <Rows3 className="h-4 w-4" /> Générer une plage
            </button>
            {plageOuverte ? (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                  <input
                    value={prefixe}
                    onChange={(e) => setPrefixe(e.target.value)}
                    placeholder="Préfixe (ex. 24E3231260424A)"
                    className={`${colInput} sm:max-w-[220px]`}
                  />
                  <input
                    type="number" min={0} value={debut} onChange={(e) => setDebut(e.target.value)}
                    placeholder="Début" className={`${colInput} w-24`}
                  />
                  <input
                    type="number" min={0} value={fin} onChange={(e) => setFin(e.target.value)}
                    placeholder="Fin" className={`${colInput} w-24`}
                  />
                  <input
                    type="number" min={1} max={10} value={largeur} onChange={(e) => setLargeur(e.target.value)}
                    placeholder="Chiffres (auto)" className={`${colInput} w-32`}
                  />
                  {estReprise ? (
                    <input
                      list="fournisseurs-existants"
                      value={fournisseurCode}
                      onChange={(e) => setFournisseurCode(e.target.value)}
                      placeholder="Code fournisseur"
                      className={colInput}
                    />
                  ) : null}
                  <Button onClick={genererPlage} disabled={actionEnCours || debut.trim() === "" || fin.trim() === ""}>
                    Générer
                  </Button>
                </div>
                {plageError ? <p className="text-sm text-crit">{plageError}</p> : null}
              </div>
            ) : null}
          </div>
        </SectionCard>
      ) : null}

      {plagesEnAttente.length > 0 ? (
        <SectionCard eyebrow="En attente" title="Plages en cours d'envoi">
          <div className="flex flex-col gap-2">
            {plagesEnAttente.map((op) => {
              const a = (op.apercu ?? {}) as { prefixe?: string; debut?: string; fin?: string };
              return (
                <div key={op.id} className="flex items-center justify-between gap-3 rounded-lg border border-line/60 px-3 py-2">
                  <span className="font-mono text-xs text-foreground">
                    {a.prefixe}
                    {a.debut}–{a.fin}
                  </span>
                  <StatusPill
                    status={op.statut === "en_cours" ? "syncing" : op.statut === "echec" ? "error" : "pending"}
                    label={op.statut === "echec" ? op.erreur : undefined}
                  />
                </div>
              );
            })}
          </div>
        </SectionCard>
      ) : null}

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Unités</h2>
        <ViewToggle mode={preference} onChange={setPreference} />
      </div>

      {mode === "liste" ? (
        <TableCard minWidth={640}>
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
                <td className={`${TABLE_CELL_CLASS} text-muted`}>{TYPE_LABELS[l.type_article]}</td>
                <td className={`${TABLE_CELL_CLASS} font-mono text-xs text-muted`}>
                  {l.fournisseur_code ?? reception.fournisseur_code ?? "—"}
                </td>
                <td className={TABLE_CELL_CLASS}>
                  {l._statut === "confirmee" || l._statut === "retrait_attente" ? (
                    l.statut_ligne ? <Badge tone={STATUT_LIGNE_TONES[l.statut_ligne]}>{STATUT_LIGNE_LABELS[l.statut_ligne]}</Badge> : "—"
                  ) : null}
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
        <InlineEmpty icon={PackagePlus} title="Aucune unité pour l'instant." />
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
              <div className="grid grid-cols-2 gap-3">
                <CardField label="Type">{TYPE_LABELS[l.type_article]}</CardField>
                <CardField label="Fournisseur">
                  <span className="font-mono text-xs">{l.fournisseur_code ?? reception.fournisseur_code ?? "—"}</span>
                </CardField>
                <CardField label="Statut">
                  {l._statut === "confirmee" || l._statut === "retrait_attente" ? (
                    l.statut_ligne ? <Badge tone={STATUT_LIGNE_TONES[l.statut_ligne]}>{STATUT_LIGNE_LABELS[l.statut_ligne]}</Badge> : "—"
                  ) : null}
                  {l._statut !== "confirmee" ? (
                    <StatusPill
                      status={pillStatus(l._statut)}
                      label={l._statut === "retrait_attente" ? "Retrait en attente" : l._erreur}
                    />
                  ) : null}
                </CardField>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
