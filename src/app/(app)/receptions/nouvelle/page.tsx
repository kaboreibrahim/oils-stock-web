"use client";

import { useRouter } from "next/navigation";
import { CheckCircle2, FileText, PackagePlus, PenLine } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { LinkButton } from "@/components/ui/link-button";
import { PageHeader } from "@/components/ui/page-header";
import { useAuth } from "@/lib/auth-context";
import { useConnectivity } from "@/lib/connectivity-context";
import { enfiler } from "@/lib/sync-engine";
import { cn } from "@/lib/utils";

interface Fournisseur {
  id: string;
  code: string;
  nom: string;
}

type Mode = "SAISIE" | "ARRIVAGE";

const AUJOURD_HUI = new Date().toISOString().slice(0, 10);

export default function NouvelleReceptionPage() {
  const { authFetch, user } = useAuth();
  const { enLigne } = useConnectivity();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("SAISIE");
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[] | null>(null);
  const [fournisseurId, setFournisseurId] = useState("");
  const [referenceFournisseur, setReferenceFournisseur] = useState("");
  const [dateReception, setDateReception] = useState(AUJOURD_HUI);
  const [quantiteAnnoncee, setQuantiteAnnoncee] = useState("");
  const [fichier, setFichier] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [misEnAttente, setMisEnAttente] = useState(false);

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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode === "SAISIE" && !enLigne) {
      const fournisseurNom = fournisseurs?.find((f) => f.id === fournisseurId)?.nom;
      const corps = {
        nature: "SAISIE",
        fournisseur: fournisseurId,
        reference_fournisseur: referenceFournisseur,
        date_reception: dateReception,
        quantite_annoncee: quantiteAnnoncee ? Number(quantiteAnnoncee) : null,
      };
      await enfiler({
        type: "reception.creer",
        ressourceType: "reception",
        utilisateurId: user!.id,
        methode: "POST",
        chemin: "/receptions/",
        corps,
        apercu: { fournisseur_nom: fournisseurNom, reference_fournisseur: referenceFournisseur, date_reception: dateReception },
      });
      // Pas de redirection automatique : voir la note dans sorties/nouvelle/page.tsx
      // sur l'échec réseau d'une navigation client-side hors ligne.
      setMisEnAttente(true);
      return;
    }

    setEnvoi(true);
    try {
      let res: Response;
      if (mode === "ARRIVAGE") {
        const form = new FormData();
        form.set("nature", "ARRIVAGE");
        form.set("fournisseur", fournisseurId);
        form.set("reference_fournisseur", referenceFournisseur);
        form.set("date_reception", dateReception);
        if (quantiteAnnoncee) form.set("quantite_annoncee", quantiteAnnoncee);
        if (fichier) form.set("fichier", fichier);
        res = await authFetch("/receptions/", { method: "POST", body: form });
      } else {
        res = await authFetch("/receptions/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nature: "SAISIE",
            fournisseur: fournisseurId,
            reference_fournisseur: referenceFournisseur,
            date_reception: dateReception,
            quantite_annoncee: quantiteAnnoncee ? Number(quantiteAnnoncee) : null,
          }),
        });
      }
      const data = await res.json();
      if (!res.ok) {
        const detail = Array.isArray(data?.detail) ? data.detail[0] : "Création impossible.";
        setError(detail);
        setEnvoi(false);
        return;
      }
      router.push(`/receptions/${data.id}`);
    } catch {
      setError("Impossible de contacter le serveur.");
      setEnvoi(false);
    }
  }

  const inputClass = "rounded-lg border border-line px-3 py-2 text-sm";

  return (
    <div className="oa-rise flex flex-col gap-5">
      <PageHeader
        icon={PackagePlus}
        eyebrow="Opérations"
        title="Nouvelle réception"
        subtitle="Les unités s'ajoutent à l'étape suivante — à l'unité, par plage, ou extraites automatiquement d'un PDF."
        backHref="/receptions"
        backLabel="Retour aux réceptions"
      />

      {misEnAttente ? (
        <GlassCard tone="strong" className="oa-rise flex flex-col items-start gap-4 p-6">
          <div className="flex items-center gap-2 text-ok">
            <CheckCircle2 className="h-5 w-5" />
            <p className="font-medium text-foreground">Réception mise en attente.</p>
          </div>
          <p className="text-sm text-muted">
            Elle apparaîtra dans la liste des réceptions et sera envoyée automatiquement au retour du réseau.
          </p>
          <LinkButton href="/receptions" variant="secondary">
            Retour aux réceptions
          </LinkButton>
        </GlassCard>
      ) : (
      <>
      <div className="flex w-fit gap-1 rounded-xl border border-line bg-surface p-1">
        {(
          [
            { value: "SAISIE" as const, label: "Saisie manuelle", icon: PenLine },
            { value: "ARRIVAGE" as const, label: "Arrivage (PDF)", icon: FileText },
          ]
        ).map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => setMode(value)}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
              mode === value ? "bg-accent-soft text-accent-strong" : "text-muted hover:bg-foreground/[0.04]",
            )}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      <GlassCard tone="strong" className="oa-rise p-6">
        <form onSubmit={handleSubmit} className="oa-form flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-foreground">Fournisseur</span>
            <select required value={fournisseurId} onChange={(e) => setFournisseurId(e.target.value)} className={inputClass}>
              <option value="" disabled>
                {fournisseurs ? "Sélectionner un fournisseur…" : "Chargement…"}
              </option>
              {fournisseurs?.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nom} ({f.code})
                </option>
              ))}
            </select>
          </label>

          {mode === "ARRIVAGE" ? (
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-foreground">Fichier PDF</span>
              <input
                required
                type="file"
                accept="application/pdf"
                onChange={(e) => setFichier(e.target.files?.[0] ?? null)}
                className={`${inputClass} file:mr-3 file:rounded-md file:border-0 file:bg-accent-soft file:px-3 file:py-1.5 file:text-accent-strong`}
              />
            </label>
          ) : null}

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-foreground">Référence fournisseur</span>
            <input
              value={referenceFournisseur}
              onChange={(e) => setReferenceFournisseur(e.target.value)}
              placeholder="Optionnel — ex. EBT260407"
              className={inputClass}
            />
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-foreground">Date de réception</span>
              <input required type="date" value={dateReception} onChange={(e) => setDateReception(e.target.value)} className={inputClass} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-foreground">Quantité annoncée</span>
              <input
                type="number"
                min={0}
                value={quantiteAnnoncee}
                onChange={(e) => setQuantiteAnnoncee(e.target.value)}
                placeholder="Optionnel — ex. 26"
                className={inputClass}
              />
            </label>
          </div>

          {error ? <p className="rounded-lg bg-crit/10 px-3 py-2 text-sm text-crit">{error}</p> : null}

          {!enLigne && mode === "SAISIE" ? (
            <p className="rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">
              Hors connexion — ce brouillon sera mis en attente et synchronisé au retour du réseau.
            </p>
          ) : null}
          {!enLigne && mode === "ARRIVAGE" ? (
            <p className="rounded-lg bg-crit-soft px-3 py-2 text-sm text-crit">
              L&apos;arrivage (avec PDF) nécessite une connexion — passez en « Saisie manuelle » pour continuer hors-ligne.
            </p>
          ) : null}

          <div className="mt-2 flex justify-end">
            <Button
              type="submit"
              disabled={envoi || !fournisseurs || (mode === "ARRIVAGE" && (!fichier || !enLigne))}
            >
              {envoi ? "Création…" : enLigne || mode === "ARRIVAGE" ? "Créer le brouillon" : "Mettre en attente"}
            </Button>
          </div>
        </form>
      </GlassCard>
      </>
      )}
    </div>
  );
}
