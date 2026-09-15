"use client";

import { useRouter } from "next/navigation";
import { CheckCircle2, PackageMinus } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { LinkButton } from "@/components/ui/link-button";
import { PageHeader } from "@/components/ui/page-header";
import { useAuth } from "@/lib/auth-context";
import { useConnectivity } from "@/lib/connectivity-context";
import { enfiler } from "@/lib/sync-engine";

interface Client {
  id: string;
  code: string;
  nom: string;
}

const AUJOURD_HUI = new Date().toISOString().slice(0, 10);

export default function NouvelleSortiePage() {
  const { authFetch, user } = useAuth();
  const { enLigne } = useConnectivity();
  const router = useRouter();
  const [clients, setClients] = useState<Client[] | null>(null);
  const [clientId, setClientId] = useState("");
  const [projet, setProjet] = useState("");
  const [projets, setProjets] = useState<string[]>([]);
  const [trd, setTrd] = useState("");
  const [dateSortie, setDateSortie] = useState(AUJOURD_HUI);
  const [error, setError] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [misEnAttente, setMisEnAttente] = useState(false);

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
    const handle = setTimeout(async () => {
      const res = await authFetch(`/projets/?q=${encodeURIComponent(projet)}`);
      if (cancelled || !res.ok) return;
      setProjets((await res.json()) as string[]);
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [authFetch, projet]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const corps = { client: clientId, projet, trd, date_sortie: dateSortie };

    if (!enLigne) {
      const clientNom = clients?.find((c) => c.id === clientId)?.nom;
      await enfiler({
        type: "sortie.creer",
        ressourceType: "sortie",
        utilisateurId: user!.id,
        methode: "POST",
        chemin: "/sorties/",
        corps,
        apercu: { client_nom: clientNom, projet, trd, date_sortie: dateSortie },
      });
      // Pas de redirection automatique : une navigation client-side hors ligne
      // exigerait un aller-retour réseau pour le RSC de la page cible, qui
      // échoue précisément dans le cas visé ici et laisserait l'utilisateur
      // bloqué sur un état de chargement. On affiche plutôt une confirmation
      // sur cette page, avec un lien normal (cliqué au moment choisi par
      // l'utilisateur) vers la liste.
      setMisEnAttente(true);
      return;
    }

    setEnvoi(true);
    try {
      const res = await authFetch("/sorties/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corps),
      });
      const data = await res.json();
      if (!res.ok) {
        const detail = Array.isArray(data?.detail) ? data.detail[0] : "Création impossible.";
        setError(detail);
        setEnvoi(false);
        return;
      }
      router.push(`/sorties/${data.id}`);
    } catch {
      setError("Impossible de contacter le serveur.");
      setEnvoi(false);
    }
  }

  const inputClass = "rounded-lg border border-line px-3 py-2 text-sm";

  return (
    <div className="oa-rise flex flex-col gap-5">
      <PageHeader
        icon={PackageMinus}
        eyebrow="Opérations"
        title="Nouvelle sortie"
        subtitle="En-tête du bon de sortie — les unités s'ajoutent à l'étape suivante."
        backHref="/sorties"
        backLabel="Retour aux sorties"
      />

      {misEnAttente ? (
        <GlassCard tone="strong" className="oa-rise flex flex-col items-start gap-4 p-6">
          <div className="flex items-center gap-2 text-ok">
            <CheckCircle2 className="h-5 w-5" />
            <p className="font-medium text-foreground">Sortie mise en attente.</p>
          </div>
          <p className="text-sm text-muted">
            Elle apparaîtra dans la liste des sorties et sera envoyée automatiquement au retour du réseau.
          </p>
          <LinkButton href="/sorties" variant="secondary">
            Retour aux sorties
          </LinkButton>
        </GlassCard>
      ) : (
      <GlassCard tone="strong" className="oa-rise p-6">
        <form onSubmit={handleSubmit} className="oa-form flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-foreground">Client</span>
            <select required value={clientId} onChange={(e) => setClientId(e.target.value)} className={inputClass}>
              <option value="" disabled>
                {clients ? "Sélectionner un client…" : "Chargement…"}
              </option>
              {clients?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom} ({c.code})
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-foreground">Projet</span>
            <input
              required
              list="projets-existants"
              value={projet}
              onChange={(e) => setProjet(e.target.value)}
              placeholder="Ex. Rénovation dépôt Nord"
              className={inputClass}
            />
            <datalist id="projets-existants">
              {projets.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-foreground">TRD</span>
            <input required value={trd} onChange={(e) => setTrd(e.target.value)} placeholder="Référence TRD" className={inputClass} />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-foreground">Date de sortie</span>
            <input required type="date" value={dateSortie} onChange={(e) => setDateSortie(e.target.value)} className={inputClass} />
          </label>

          {error ? <p className="rounded-lg bg-crit/10 px-3 py-2 text-sm text-crit">{error}</p> : null}

          {!enLigne ? (
            <p className="rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">
              Hors connexion — ce brouillon sera mis en attente et synchronisé au retour du réseau.
            </p>
          ) : null}

          <div className="mt-2 flex justify-end">
            <Button type="submit" disabled={envoi || !clients}>
              {envoi ? "Création…" : enLigne ? "Créer le brouillon" : "Mettre en attente"}
            </Button>
          </div>
        </form>
      </GlassCard>
      )}
    </div>
  );
}
