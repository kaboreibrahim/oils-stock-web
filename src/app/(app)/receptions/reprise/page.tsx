"use client";

import { useRouter } from "next/navigation";
import { History } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { GlassCard } from "@/components/ui/glass-card";
import { PageHeader } from "@/components/ui/page-header";
import { useAuth } from "@/lib/auth-context";

const AUJOURD_HUI = new Date().toISOString().slice(0, 10);

export default function RepriseReceptionPage() {
  const { authFetch, user } = useAuth();
  const router = useRouter();
  const [dateReception, setDateReception] = useState(AUJOURD_HUI);
  const [error, setError] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  if (user?.role !== "ADMIN") {
    return (
      <EmptyState
        icon={History}
        title="Reprise de l'existant"
        description="Réservé au rôle Administrateur — mise en service à faire une seule fois."
      />
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setEnvoi(true);
    try {
      const res = await authFetch("/receptions/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nature: "REPRISE", date_reception: dateReception }),
      });
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

  return (
    <div className="oa-rise flex flex-col gap-5">
      <PageHeader
        icon={History}
        eyebrow="Opérations"
        title="Reprise de l'existant"
        subtitle="Mise en service — à faire une seule fois. Chaque ligne porte son propre fournisseur (l'ancien système n'ayant aucun export, un fournisseur inconnu est créé à la volée)."
        backHref="/receptions"
        backLabel="Retour aux réceptions"
      />

      <GlassCard tone="strong" className="oa-rise p-6">
        <form onSubmit={handleSubmit} className="oa-form flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-foreground">Date de reprise</span>
            <input
              required
              type="date"
              value={dateReception}
              onChange={(e) => setDateReception(e.target.value)}
              className="rounded-lg border border-line px-3 py-2 text-sm sm:max-w-xs"
            />
          </label>

          {error ? <p className="rounded-lg bg-crit/10 px-3 py-2 text-sm text-crit">{error}</p> : null}

          <div className="mt-2 flex justify-end">
            <Button type="submit" disabled={envoi}>
              {envoi ? "Création…" : "Créer le brouillon de reprise"}
            </Button>
          </div>
        </form>
      </GlassCard>
    </div>
  );
}
