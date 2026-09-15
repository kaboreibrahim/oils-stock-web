"use client";

import { Coins, Container, Package, PackagePlus, Pencil, Thermometer, Truck, X } from "lucide-react";
import { use, useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { GlassCard } from "@/components/ui/glass-card";
import { KpiCard } from "@/components/ui/kpi-card";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusPill } from "@/components/ui/status-pill";
import { Timeline, type TimelineItem } from "@/components/ui/timeline";
import { useAuth } from "@/lib/auth-context";
import { useConnectivity } from "@/lib/connectivity-context";
import { MOUVEMENT_LABELS, MOUVEMENT_TONES, type Mouvement } from "@/lib/mouvements";
import { enfiler } from "@/lib/sync-engine";

interface Fournisseur {
  id: string;
  code: string;
  nom: string;
  pays: string;
  contact_nom: string;
  contact_email: string;
  contact_tel: string;
  actif: boolean;
  notes: string;
  a_un_profil_extraction: boolean;
  nb_flexitanks: number;
  nb_heating_pads: number;
  seuil_reappro_flexitank: number | null;
  seuil_reappro_heating_pad: number | null;
  delai_livraison_jours: number | null;
  stock_securite_flexitank: number | null;
  stock_securite_heating_pad: number | null;
  cout_unitaire_flexitank: string | null;
  cout_unitaire_heating_pad: string | null;
}

interface ProfilExtraction {
  mode_extraction: "" | "TABLEAU" | "GRILLE" | "TEXTE";
  regex_numero_serie: string;
  type_article_defaut: "" | "FLEXITANK" | "HEATING_PAD";
}

interface Stats {
  enStock: number;
  sorties: number;
  receptions: number;
  receptionsValidees: number;
}

function mouvementToTimelineItem(m: Mouvement): TimelineItem {
  return {
    id: m.id,
    tone: MOUVEMENT_TONES[m.type_mouvement],
    badge: MOUVEMENT_LABELS[m.type_mouvement],
    primary: m.numero_serie,
    secondary: m.sortie_reference ?? m.reception_reference ?? undefined,
    meta: new Date(m.date_mouvement).toLocaleDateString("fr-FR"),
  };
}

async function getCount(authFetch: ReturnType<typeof useAuth>["authFetch"], path: string): Promise<number> {
  const res = await authFetch(path);
  if (!res.ok) throw new Error(`Erreur ${res.status} sur ${path}`);
  const data = (await res.json()) as { count: number };
  return data.count;
}

function ProfilExtractionPanel({
  fournisseurId,
  peutEcrire,
  onSaved,
}: {
  fournisseurId: string;
  peutEcrire: boolean;
  onSaved: () => void;
}) {
  const { authFetch } = useAuth();
  const [profil, setProfil] = useState<ProfilExtraction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await authFetch(`/fournisseurs/${fournisseurId}/profil-extraction/`);
      if (cancelled || !res.ok) return;
      setProfil((await res.json()) as ProfilExtraction);
    })();
    return () => {
      cancelled = true;
    };
  }, [authFetch, fournisseurId]);

  async function enregistrer() {
    if (!profil) return;
    setError(null);
    setEnvoi(true);
    try {
      const res = await authFetch(`/fournisseurs/${fournisseurId}/profil-extraction/`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profil),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(Array.isArray(data?.detail) ? data.detail[0] : "Enregistrement impossible.");
        return;
      }
      setProfil(data as ProfilExtraction);
      onSaved();
    } finally {
      setEnvoi(false);
    }
  }

  if (!profil) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  return (
    <div className="oa-form flex flex-col gap-3">
      <p className="text-xs text-muted">
        Pilote l&apos;extraction automatique des PDF d&apos;arrivage de ce fournisseur. Laisser
        l&apos;expression régulière vide retombe sur une détection générique (revue manuelle systématique).
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-foreground">Mode de lecture</span>
          <select
            disabled={!peutEcrire}
            value={profil.mode_extraction}
            onChange={(e) => setProfil({ ...profil, mode_extraction: e.target.value as ProfilExtraction["mode_extraction"] })}
            className="px-3 py-2 text-sm disabled:opacity-60"
          >
            <option value="">— Détection générique —</option>
            <option value="TABLEAU">Tableau (en-têtes)</option>
            <option value="GRILLE">Grille (sans en-tête)</option>
            <option value="TEXTE">Texte libre</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
          <span className="font-medium text-foreground">Expression régulière — numéro de série</span>
          <input
            disabled={!peutEcrire}
            value={profil.regex_numero_serie}
            onChange={(e) => setProfil({ ...profil, regex_numero_serie: e.target.value })}
            placeholder={String.raw`Ex. 24E\d{10}A\d{3} (Ebont), \d{6} (DHL)`}
            className="px-3 py-2 font-mono text-xs disabled:opacity-60"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-foreground">Type d&apos;article par défaut</span>
          <select
            disabled={!peutEcrire}
            value={profil.type_article_defaut}
            onChange={(e) => setProfil({ ...profil, type_article_defaut: e.target.value as ProfilExtraction["type_article_defaut"] })}
            className="px-3 py-2 text-sm disabled:opacity-60"
          >
            <option value="">—</option>
            <option value="FLEXITANK">Flexitank</option>
            <option value="HEATING_PAD">Heating pad</option>
          </select>
        </label>
      </div>
      {error ? <p className="text-sm text-crit">{error}</p> : null}
      {peutEcrire ? (
        <div className="flex justify-end">
          <Button onClick={enregistrer} disabled={envoi}>
            {envoi ? "Enregistrement…" : "Enregistrer le profil"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export default function FournisseurDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { authFetch, user } = useAuth();
  const { enLigne } = useConnectivity();

  const [fournisseur, setFournisseur] = useState<Fournisseur | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [dernieresTransactions, setDernieresTransactions] = useState<Mouvement[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [edition, setEdition] = useState(false);
  const [form, setForm] = useState<Fournisseur | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [modifEnAttente, setModifEnAttente] = useState(false);

  const estAdmin = user?.role === "ADMIN";

  const charger = useCallback(async () => {
    const res = await authFetch(`/fournisseurs/${id}/`);
    if (!res.ok) {
      setError(res.status === 404 ? "Fournisseur introuvable." : `Erreur ${res.status} lors du chargement.`);
      return;
    }
    const data = (await res.json()) as Fournisseur;
    setFournisseur(data);
    setForm(data);
  }, [authFetch, id]);

  useEffect(() => {
    (async () => {
      await charger();
    })();
  }, [charger]);

  useEffect(() => {
    const surSync = (e: Event) => {
      const detail = (e as CustomEvent<{ ressourceType?: string; parentId?: string }>).detail;
      if (detail?.ressourceType === "fournisseur" && detail?.parentId === id) {
        setModifEnAttente(false);
        void charger();
      }
    };
    window.addEventListener("oa:operation-synchronisee", surSync);
    return () => window.removeEventListener("oa:operation-synchronisee", surSync);
  }, [charger, id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Séquentiel, pas Promise.all — voir la note dans (app)/page.tsx sur le
        // refresh de jeton concurrent.
        const enStock = await getCount(authFetch, `/unites/?fournisseur=${id}&statut=EN_STOCK`);
        const sorties = await getCount(authFetch, `/unites/?fournisseur=${id}&statut=SORTIE`);
        const receptions = await getCount(authFetch, `/receptions/?fournisseur=${id}`);
        const receptionsValidees = await getCount(authFetch, `/receptions/?fournisseur=${id}&statut=VALIDEE`);
        if (!cancelled) setStats({ enStock, sorties, receptions, receptionsValidees });
      } catch {
        // Les stats sont un bonus d'affichage — une erreur ici ne doit pas
        // empêcher de voir/modifier la fiche elle-même.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authFetch, id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await authFetch(`/mouvements/?unite_stock__fournisseur=${id}&ordering=-date_mouvement`);
      if (cancelled || !res.ok) return;
      const data = (await res.json()) as { results: Mouvement[] };
      setDernieresTransactions(data.results.slice(0, 5));
    })();
    return () => {
      cancelled = true;
    };
  }, [authFetch, id]);

  async function enregistrer() {
    if (!form) return;
    setError(null);

    const corps = {
      code: form.code, nom: form.nom, pays: form.pays,
      contact_nom: form.contact_nom, contact_email: form.contact_email, contact_tel: form.contact_tel,
      notes: form.notes, actif: form.actif,
      seuil_reappro_flexitank: form.seuil_reappro_flexitank,
      seuil_reappro_heating_pad: form.seuil_reappro_heating_pad,
      delai_livraison_jours: form.delai_livraison_jours,
      stock_securite_flexitank: form.stock_securite_flexitank,
      stock_securite_heating_pad: form.stock_securite_heating_pad,
      cout_unitaire_flexitank: form.cout_unitaire_flexitank,
      cout_unitaire_heating_pad: form.cout_unitaire_heating_pad,
    };

    if (!enLigne) {
      await enfiler({
        type: "fournisseur.modifier", ressourceType: "fournisseur", utilisateurId: user!.id,
        parentId: id, methode: "PATCH", chemin: `/fournisseurs/${id}/`, corps,
      });
      setFournisseur((f) => (f ? { ...f, ...corps } : f)); // optimiste
      setForm((f) => (f ? { ...f, ...corps } : f));
      setModifEnAttente(true);
      setEdition(false);
      return;
    }

    setEnvoi(true);
    try {
      const res = await authFetch(`/fournisseurs/${id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corps),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(Array.isArray(data?.detail) ? data.detail[0] : (data?.code?.[0] ?? "Modification impossible."));
        return;
      }
      setFournisseur(data as Fournisseur);
      setForm(data as Fournisseur);
      setEdition(false);
    } finally {
      setEnvoi(false);
    }
  }

  if (error && !fournisseur) {
    return <GlassCard className="oa-rise px-4 py-3 text-sm text-crit">{error}</GlassCard>;
  }

  if (!fournisseur || !form) {
    return (
      <GlassCard className="oa-rise flex flex-col gap-3 p-5">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </GlassCard>
    );
  }

  const inputClass = "min-h-11 rounded-lg border border-line px-3 py-2 text-sm";
  const flexAlerte =
    fournisseur.seuil_reappro_flexitank !== null && fournisseur.nb_flexitanks <= fournisseur.seuil_reappro_flexitank;
  const heatAlerte =
    fournisseur.seuil_reappro_heating_pad !== null && fournisseur.nb_heating_pads <= fournisseur.seuil_reappro_heating_pad;

  return (
    <div className="oa-rise flex flex-col gap-5">
      <PageHeader
        icon={Truck}
        eyebrow="Fiche fournisseur"
        title={fournisseur.code}
        mono
        subtitle={fournisseur.nom}
        backHref="/fournisseurs"
        backLabel="Retour aux fournisseurs"
      >
        <Badge tone={fournisseur.actif ? "ok" : "neutral"}>{fournisseur.actif ? "Actif" : "Inactif"}</Badge>
        {modifEnAttente ? <StatusPill status="pending" label="Modification en attente" /> : null}
        {estAdmin && !edition ? (
          <Button variant="secondary" onClick={() => setEdition(true)}>
            <Pencil className="h-4 w-4" /> Modifier
          </Button>
        ) : null}
      </PageHeader>

      <SectionCard eyebrow="Coordonnées" tone="strong">
        {error ? <p className="rounded-lg bg-crit/10 px-3 py-2 text-sm text-crit">{error}</p> : null}

        {!edition ? (
          <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 sm:grid-cols-4">
            <Field label="Pays">{fournisseur.pays || "—"}</Field>
            <Field label="Contact">{fournisseur.contact_nom || "—"}</Field>
            <Field label="E-mail">{fournisseur.contact_email || "—"}</Field>
            <Field label="Téléphone">{fournisseur.contact_tel || "—"}</Field>
            <Field label="Seuil réappro Flexitank">{fournisseur.seuil_reappro_flexitank ?? "—"}</Field>
            <Field label="Seuil réappro Heating pad">{fournisseur.seuil_reappro_heating_pad ?? "—"}</Field>
            <Field label="Délai de livraison">
              {fournisseur.delai_livraison_jours !== null ? `${fournisseur.delai_livraison_jours} j` : "—"}
            </Field>
            <Field label="Stock sécurité Flexitank">{fournisseur.stock_securite_flexitank ?? "—"}</Field>
            <Field label="Stock sécurité Heating pad">{fournisseur.stock_securite_heating_pad ?? "—"}</Field>
            <Field label="Coût unitaire Flexitank">{fournisseur.cout_unitaire_flexitank ?? "—"}</Field>
            <Field label="Coût unitaire Heating pad">{fournisseur.cout_unitaire_heating_pad ?? "—"}</Field>
            {fournisseur.notes ? (
              <p className="col-span-full text-sm text-muted">{fournisseur.notes}</p>
            ) : null}
          </div>
        ) : (
          <div className="oa-form flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-foreground">Code</span>
                <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className={`${inputClass} font-mono`} />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-foreground">Nom</span>
                <input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} className={inputClass} />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-foreground">Pays</span>
                <input value={form.pays} onChange={(e) => setForm({ ...form, pays: e.target.value })} className={inputClass} />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-foreground">Contact</span>
                <input value={form.contact_nom} onChange={(e) => setForm({ ...form, contact_nom: e.target.value })} className={inputClass} />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-foreground">E-mail</span>
                <input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} className={inputClass} />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-foreground">Téléphone</span>
                <input value={form.contact_tel} onChange={(e) => setForm({ ...form, contact_tel: e.target.value })} className={inputClass} />
              </label>
            </div>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-foreground">Notes</span>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} className={inputClass} />
            </label>
            <div className="flex flex-col gap-3 border-t border-line/70 pt-4">
              <div>
                <p className="text-sm font-medium text-foreground">Seuils de réapprovisionnement</p>
                <p className="text-xs text-muted">
                  Optionnel. Une alerte s&apos;affiche quand le nombre d&apos;unités en stock de ce
                  type descend à ce niveau ou en dessous.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="flex items-center gap-1.5 font-medium text-foreground">
                    <Container className="h-4 w-4" strokeWidth={2} /> Seuil Flexitank
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={form.seuil_reappro_flexitank ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        seuil_reappro_flexitank: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                    placeholder="Ex. 5"
                    className={inputClass}
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="flex items-center gap-1.5 font-medium text-foreground">
                    <Thermometer className="h-4 w-4" strokeWidth={2} /> Seuil Heating pad
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={form.seuil_reappro_heating_pad ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        seuil_reappro_heating_pad: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                    placeholder="Ex. 10"
                    className={inputClass}
                  />
                </label>
              </div>
            </div>
            <div className="flex flex-col gap-3 border-t border-line/70 pt-4">
              <div>
                <p className="text-sm font-medium text-foreground">Réapprovisionnement dynamique</p>
                <p className="text-xs text-muted">
                  Optionnel. Sert à calculer un point de commande automatique quand aucun seuil
                  manuel ci-dessus n&apos;est renseigné pour ce type.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="flex items-center gap-1.5 font-medium text-foreground">
                    <Truck className="h-4 w-4" strokeWidth={2} /> Délai de livraison (jours)
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={form.delai_livraison_jours ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        delai_livraison_jours: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                    placeholder="Ex. 30"
                    className={inputClass}
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="flex items-center gap-1.5 font-medium text-foreground">
                    <Container className="h-4 w-4" strokeWidth={2} /> Stock sécurité Flexitank
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={form.stock_securite_flexitank ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        stock_securite_flexitank: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                    placeholder="Ex. 2"
                    className={inputClass}
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="flex items-center gap-1.5 font-medium text-foreground">
                    <Thermometer className="h-4 w-4" strokeWidth={2} /> Stock sécurité Heating pad
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={form.stock_securite_heating_pad ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        stock_securite_heating_pad: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                    placeholder="Ex. 4"
                    className={inputClass}
                  />
                </label>
              </div>
            </div>
            <div className="flex flex-col gap-3 border-t border-line/70 pt-4">
              <div>
                <p className="text-sm font-medium text-foreground">Valorisation du stock</p>
                <p className="text-xs text-muted">
                  Optionnel. Sert à estimer la valeur immobilisée du stock dormant. Laisser vide
                  si non applicable — aucune valeur n&apos;est inventée.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="flex items-center gap-1.5 font-medium text-foreground">
                    <Coins className="h-4 w-4" strokeWidth={2} /> Coût unitaire Flexitank
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.cout_unitaire_flexitank ?? ""}
                    onChange={(e) => setForm({ ...form, cout_unitaire_flexitank: e.target.value === "" ? null : e.target.value })}
                    placeholder="Ex. 12.50"
                    className={inputClass}
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="flex items-center gap-1.5 font-medium text-foreground">
                    <Coins className="h-4 w-4" strokeWidth={2} /> Coût unitaire Heating pad
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.cout_unitaire_heating_pad ?? ""}
                    onChange={(e) => setForm({ ...form, cout_unitaire_heating_pad: e.target.value === "" ? null : e.target.value })}
                    placeholder="Ex. 8.00"
                    className={inputClass}
                  />
                </label>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.actif}
                onChange={(e) => setForm({ ...form, actif: e.target.checked })}
                className="h-4 w-4 rounded border-line accent-accent"
              />
              <span className="font-medium text-foreground">Actif</span>
            </label>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setForm(fournisseur);
                  setEdition(false);
                  setError(null);
                }}
              >
                <X className="h-4 w-4" /> Annuler
              </Button>
              <Button onClick={enregistrer} disabled={envoi || !form.code.trim() || !form.nom.trim()}>
                {envoi ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </div>
          </div>
        )}
      </SectionCard>

      <div className="oa-stagger grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard icon={Container} tone="accent" label="Unités en stock" value={stats?.enStock} />
        <KpiCard icon={Package} tone="accent2" label="Unités sorties" value={stats?.sorties} />
        <KpiCard
          icon={Container}
          tone={flexAlerte ? "crit" : "ok"}
          label="Flexitanks en stock"
          value={fournisseur.nb_flexitanks}
          hint={
            fournisseur.seuil_reappro_flexitank === null
              ? undefined
              : flexAlerte
                ? `⚠ Sous le seuil (${fournisseur.seuil_reappro_flexitank})`
                : `Seuil : ${fournisseur.seuil_reappro_flexitank}`
          }
        />
        <KpiCard
          icon={Thermometer}
          tone={heatAlerte ? "crit" : "ok"}
          label="Heating pads en stock"
          value={fournisseur.nb_heating_pads}
          hint={
            fournisseur.seuil_reappro_heating_pad === null
              ? undefined
              : heatAlerte
                ? `⚠ Sous le seuil (${fournisseur.seuil_reappro_heating_pad})`
                : `Seuil : ${fournisseur.seuil_reappro_heating_pad}`
          }
        />
        <KpiCard icon={PackagePlus} tone="warn" label="Réceptions" value={stats?.receptions} />
        <KpiCard icon={PackagePlus} tone="warn" label="Réceptions validées" value={stats?.receptionsValidees} />
      </div>

      <SectionCard eyebrow="Historique" title="Dernières transactions">
        {!dernieresTransactions ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : dernieresTransactions.length === 0 ? (
          <p className="text-sm text-muted">Aucune transaction pour l&apos;instant.</p>
        ) : (
          <Timeline items={dernieresTransactions.map(mouvementToTimelineItem)} />
        )}
      </SectionCard>

      <SectionCard eyebrow="Automatisation" title="Profil d'extraction">
        <ProfilExtractionPanel
          fournisseurId={id}
          peutEcrire={estAdmin}
          onSaved={() => setFournisseur({ ...fournisseur, a_un_profil_extraction: true })}
        />
      </SectionCard>
    </div>
  );
}
