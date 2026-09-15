"use client";

import { Plus, Undo2, X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

import { SerialSearch } from "@/components/serial-search";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { GlassCard } from "@/components/ui/glass-card";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { useAuth } from "@/lib/auth-context";

interface LigneRetour {
  numeroSerie: string;
  fournisseurId: string;
}

interface Fournisseur {
  id: string;
  code: string;
  nom: string;
}

interface UniteRetournee {
  id: string;
  numero_serie: string;
  type_article: "FLEXITANK" | "HEATING_PAD";
  fournisseur_code: string;
}

const AUJOURD_HUI = new Date().toISOString().slice(0, 10);
const TYPE_LABELS: Record<UniteRetournee["type_article"], string> = {
  FLEXITANK: "Flexitank",
  HEATING_PAD: "Heating pad",
};

function nouvelleLigne(): LigneRetour {
  return { numeroSerie: "", fournisseurId: "" };
}

export default function RetoursPage() {
  const { authFetch, user } = useAuth();
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [lignes, setLignes] = useState<LigneRetour[]>([nouvelleLigne()]);
  const [dateRetour, setDateRetour] = useState(AUJOURD_HUI);
  const [motif, setMotif] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [resultat, setResultat] = useState<UniteRetournee[] | null>(null);

  const peutEcrire = user?.role === "ADMIN" || user?.role === "MAGASINIER";

  useEffect(() => {
    if (!peutEcrire) return;
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
  }, [authFetch, peutEcrire]);

  function majLigne(index: number, champ: keyof LigneRetour, valeur: string) {
    setLignes((prev) => prev.map((l, i) => (i === index ? { ...l, [champ]: valeur } : l)));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setResultat(null);
    setEnvoi(true);
    try {
      const res = await authFetch("/retours/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unites: lignes.map((l) => ({
            numero_serie: l.numeroSerie,
            fournisseur: l.fournisseurId || undefined,
          })),
          date_retour: dateRetour,
          motif,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(Array.isArray(data?.detail) ? data.detail[0] : "Enregistrement impossible.");
        return;
      }
      setResultat(data as UniteRetournee[]);
      setLignes([nouvelleLigne()]);
      setMotif("");
    } finally {
      setEnvoi(false);
    }
  }

  if (!peutEcrire) {
    return (
      <EmptyState
        icon={Undo2}
        title="Retours"
        description="Réservé aux rôles Magasinier et Administrateur — vous êtes en lecture seule."
      />
    );
  }

  const inputClass = "rounded-lg border border-line px-3 py-2 text-sm";

  return (
    <div className="oa-rise flex flex-col gap-5">
      <PageHeader
        icon={Undo2}
        eyebrow="Opérations"
        title="Retours"
        subtitle="Une unité déjà sortie revient en stock — la sortie d'origine reste valide."
      />

      {resultat ? (
        <SectionCard eyebrow="Résultat" title={`${resultat.length} unité${resultat.length > 1 ? "s" : ""} de retour au stock`}>
          <ul className="flex flex-col gap-1.5 text-sm">
            {resultat.map((u) => (
              <li key={u.id} className="flex items-center gap-2">
                <Badge tone="ok">En stock</Badge>
                <span className="font-mono text-xs">{u.numero_serie}</span>
                <span className="text-muted">
                  {TYPE_LABELS[u.type_article]} — {u.fournisseur_code}
                </span>
              </li>
            ))}
          </ul>
        </SectionCard>
      ) : null}

      <GlassCard tone="strong" className="oa-rise p-6">
        <form onSubmit={handleSubmit} className="oa-form flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            <span className="text-sm font-medium text-foreground">Unités retournées</span>
            {lignes.map((ligne, index) => (
              <div key={index} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <SerialSearch
                  required
                  value={ligne.numeroSerie}
                  onChange={(valeur) => majLigne(index, "numeroSerie", valeur)}
                  onSelect={(u) => majLigne(index, "fournisseurId", u.fournisseur)}
                  placeholder="Numéro de série (scan ou saisie)"
                  className="w-full sm:max-w-xs"
                />
                <select
                  value={ligne.fournisseurId}
                  onChange={(e) => majLigne(index, "fournisseurId", e.target.value)}
                  className={inputClass}
                >
                  <option value="">Fournisseur (si ambigu)</option>
                  {fournisseurs.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nom}
                    </option>
                  ))}
                </select>
                {lignes.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => setLignes((prev) => prev.filter((_, i) => i !== index))}
                    aria-label="Retirer cette ligne"
                    className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-crit-soft hover:text-crit"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            ))}
            <Button
              type="button"
              variant="ghost"
              className="w-fit"
              onClick={() => setLignes((prev) => [...prev, nouvelleLigne()])}
            >
              <Plus className="h-4 w-4" /> Ajouter une unité
            </Button>
          </div>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-foreground">Date du retour</span>
            <input
              required
              type="date"
              value={dateRetour}
              onChange={(e) => setDateRetour(e.target.value)}
              className={`${inputClass} sm:max-w-xs`}
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-foreground">Motif</span>
            <textarea
              required
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              rows={2}
              placeholder="Ex. renvoi client, projet annulé…"
              className={inputClass}
            />
          </label>

          {error ? <p className="rounded-lg bg-crit/10 px-3 py-2 text-sm text-crit">{error}</p> : null}

          <div className="mt-2 flex justify-end">
            <Button type="submit" disabled={envoi}>
              {envoi ? "Enregistrement…" : "Enregistrer le retour"}
            </Button>
          </div>
        </form>
      </GlassCard>
    </div>
  );
}
