"use client";

import { PackageMinus, Pencil, Users, X } from "lucide-react";
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
import { useAuth } from "@/lib/auth-context";
import { useConnectivity } from "@/lib/connectivity-context";
import { enfiler } from "@/lib/sync-engine";

interface Client {
  id: string;
  code: string;
  nom: string;
  pays: string;
  adresse: string;
  contact_nom: string;
  contact_email: string;
  contact_tel: string;
  actif: boolean;
  notes: string;
}

interface Stats {
  total: number;
  brouillon: number;
  validees: number;
}

async function getCount(authFetch: ReturnType<typeof useAuth>["authFetch"], path: string): Promise<number> {
  const res = await authFetch(path);
  if (!res.ok) throw new Error(`Erreur ${res.status} sur ${path}`);
  const data = (await res.json()) as { count: number };
  return data.count;
}

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { authFetch, user } = useAuth();
  const { enLigne } = useConnectivity();

  const [client, setClient] = useState<Client | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [edition, setEdition] = useState(false);
  const [form, setForm] = useState<Client | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [modifEnAttente, setModifEnAttente] = useState(false);

  const peutEcrire = user?.role === "ADMIN" || user?.role === "MAGASINIER";

  const charger = useCallback(async () => {
    const res = await authFetch(`/clients/${id}/`);
    if (!res.ok) {
      setError(res.status === 404 ? "Client introuvable." : `Erreur ${res.status} lors du chargement.`);
      return;
    }
    const data = (await res.json()) as Client;
    setClient(data);
    setForm(data);
  }, [authFetch, id]);

  useEffect(() => {
    (async () => {
      await charger();
    })();
  }, [charger]);

  // Le PATCH mis en file n'a pas de corps de réponse serveur à réutiliser
  // (contrairement au chemin en ligne, qui fait setClient(data)) — recharger
  // depuis le serveur dès que le moteur de synchro confirme l'envoi réel.
  useEffect(() => {
    const surSync = (e: Event) => {
      const detail = (e as CustomEvent<{ ressourceType?: string; parentId?: string }>).detail;
      if (detail?.ressourceType === "client" && detail?.parentId === id) {
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
        const total = await getCount(authFetch, `/sorties/?client=${id}`);
        const brouillon = await getCount(authFetch, `/sorties/?client=${id}&statut=BROUILLON`);
        const validees = await getCount(authFetch, `/sorties/?client=${id}&statut=VALIDEE`);
        if (!cancelled) setStats({ total, brouillon, validees });
      } catch {
        // Les stats sont un bonus d'affichage — une erreur ici ne doit pas
        // empêcher de voir/modifier la fiche elle-même.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authFetch, id]);

  async function enregistrer() {
    if (!form) return;
    setError(null);

    const corps = {
      code: form.code, nom: form.nom, pays: form.pays, adresse: form.adresse,
      contact_nom: form.contact_nom, contact_email: form.contact_email, contact_tel: form.contact_tel,
      notes: form.notes, actif: form.actif,
    };

    if (!enLigne) {
      await enfiler({
        type: "client.modifier", ressourceType: "client", utilisateurId: user!.id,
        parentId: id, methode: "PATCH", chemin: `/clients/${id}/`, corps,
      });
      setClient((c) => (c ? { ...c, ...corps } : c)); // optimiste
      setForm((f) => (f ? { ...f, ...corps } : f));
      setModifEnAttente(true);
      setEdition(false);
      return;
    }

    setEnvoi(true);
    try {
      const res = await authFetch(`/clients/${id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corps),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(Array.isArray(data?.detail) ? data.detail[0] : (data?.code?.[0] ?? "Modification impossible."));
        return;
      }
      setClient(data as Client);
      setForm(data as Client);
      setEdition(false);
    } finally {
      setEnvoi(false);
    }
  }

  if (error && !client) {
    return <GlassCard className="oa-rise px-4 py-3 text-sm text-crit">{error}</GlassCard>;
  }

  if (!client || !form) {
    return (
      <GlassCard className="oa-rise flex flex-col gap-3 p-5">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </GlassCard>
    );
  }

  const inputClass = "min-h-11 rounded-lg border border-line px-3 py-2 text-sm";

  return (
    <div className="oa-rise flex flex-col gap-5">
      <PageHeader
        icon={Users}
        eyebrow="Fiche client"
        title={client.code}
        mono
        subtitle={client.nom}
        backHref="/clients"
        backLabel="Retour aux clients"
      >
        <Badge tone={client.actif ? "ok" : "neutral"}>{client.actif ? "Actif" : "Inactif"}</Badge>
        {modifEnAttente ? <StatusPill status="pending" label="Modification en attente" /> : null}
        {peutEcrire && !edition ? (
          <Button variant="secondary" onClick={() => setEdition(true)}>
            <Pencil className="h-4 w-4" /> Modifier
          </Button>
        ) : null}
      </PageHeader>

      <SectionCard eyebrow="Coordonnées" tone="strong">
        {error ? <p className="rounded-lg bg-crit/10 px-3 py-2 text-sm text-crit">{error}</p> : null}

        {!edition ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Field label="Pays">{client.pays || "—"}</Field>
            <Field label="Adresse">{client.adresse || "—"}</Field>
            <Field label="Contact">{client.contact_nom || "—"}</Field>
            <Field label="E-mail">{client.contact_email || "—"}</Field>
            <Field label="Téléphone">{client.contact_tel || "—"}</Field>
            {client.notes ? (
              <p className="col-span-2 text-sm text-muted sm:col-span-4">{client.notes}</p>
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
                <span className="font-medium text-foreground">Adresse</span>
                <input value={form.adresse} onChange={(e) => setForm({ ...form, adresse: e.target.value })} className={inputClass} />
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
                  setForm(client);
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

      <div className="oa-stagger grid grid-cols-2 gap-4 sm:grid-cols-3">
        <KpiCard icon={PackageMinus} tone="accent" label="Sorties au total" value={stats?.total} />
        <KpiCard icon={PackageMinus} tone="warn" label="Sorties en brouillon" value={stats?.brouillon} />
        <KpiCard icon={PackageMinus} tone="ok" label="Sorties validées" value={stats?.validees} />
      </div>
    </div>
  );
}
