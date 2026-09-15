"use client";

import { TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { CardField } from "@/components/ui/card-field";
import { TABLE_CELL_CLASS, TABLE_ROW_CLASS, TableCard, TableEmptyRow, THead } from "@/components/ui/data-table";
import { GlassCard } from "@/components/ui/glass-card";
import { InlineEmpty, ListError, ListSkeleton, StaleNote } from "@/components/ui/list-states";
import { PageHeader } from "@/components/ui/page-header";
import { ThresholdBarList, type ThresholdBarDatum } from "@/components/ui/threshold-bar-list";
import { ViewToggle } from "@/components/ui/view-toggle";
import { useAuth } from "@/lib/auth-context";
import { useConnectivity } from "@/lib/connectivity-context";
import { useViewMode } from "@/lib/use-view-mode";

interface Prevision {
  fournisseur: { id: string; code: string; nom: string };
  type_article: "FLEXITANK" | "HEATING_PAD";
  stock_actuel: number;
  consommation_moyenne_journaliere: number;
  seuil: number | null;
  source_seuil: "MANUEL" | "CALCULE" | null;
  jours_avant_rupture: number | null;
  date_commande_recommandee: string | null;
  en_alerte: boolean;
}

const TYPE_LABELS: Record<Prevision["type_article"], string> = {
  FLEXITANK: "Flexitank",
  HEATING_PAD: "Heating pad",
};

function frDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString("fr-FR") : "—";
}

export default function PrevisionsPage() {
  const { authFetch } = useAuth();
  const { etat } = useConnectivity();
  const { mode, preference, setPreference } = useViewMode("previsions");
  const [previsions, setPrevisions] = useState<Prevision[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await authFetch("/dashboard/previsions/");
      if (cancelled) return;
      if (!res.ok) {
        setError(
          res.status === 503
            ? "Hors connexion — cette page n'a pas encore été consultée en ligne."
            : `Erreur ${res.status} lors du chargement.`,
        );
        return;
      }
      setError(null);
      setPrevisions((await res.json()) as Prevision[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [authFetch, reloadKey]);

  const seuilsAffiches: ThresholdBarDatum[] = previsions
    ? previsions
        .filter((p): p is Prevision & { seuil: number } => p.seuil !== null)
        .map((p) => ({
          label: `${p.fournisseur.code} · ${TYPE_LABELS[p.type_article]}`,
          value: p.stock_actuel,
          threshold: p.seuil,
        }))
    : [];

  return (
    <div className="oa-rise flex flex-col gap-5">
      <PageHeader
        icon={TrendingUp}
        eyebrow="Diagnostic"
        title="Prévisions"
        subtitle="Rythme de sortie récent, jours avant rupture estimée, et articles à commander en priorité."
      >
        <ViewToggle mode={preference} onChange={setPreference} />
      </PageHeader>

      {error ? (
        <ListError
          message={error}
          onRetry={() => {
            setError(null);
            setReloadKey((k) => k + 1);
          }}
        />
      ) : null}

      <GlassCard className="flex flex-col gap-4 p-5">
        <p className="text-sm font-semibold text-foreground">Stock actuel vs seuil de réapprovisionnement</p>
        {!previsions && !error ? (
          <div className="flex flex-col gap-3">
            <div className="h-4 w-full animate-pulse rounded-lg bg-foreground/[0.06]" />
            <div className="h-4 w-full animate-pulse rounded-lg bg-foreground/[0.06]" />
          </div>
        ) : seuilsAffiches.length > 0 ? (
          <ThresholdBarList data={seuilsAffiches} />
        ) : (
          <p className="text-sm text-muted">Aucun seuil configuré pour l&apos;instant.</p>
        )}
      </GlassCard>

      {previsions && previsions.length > 0 && etat === "hors_ligne" ? <StaleNote /> : null}

      {!previsions && !error ? <ListSkeleton /> : null}

      {previsions && previsions.length === 0 ? (
        <InlineEmpty icon={TrendingUp} title="Aucune donnée" description="Aucun fournisseur avec du stock pour l'instant." />
      ) : null}

      {previsions && previsions.length > 0 && mode === "liste" ? (
        <TableCard minWidth={880}>
          <THead
            columns={[
              "Fournisseur", "Type", "Stock actuel", "Conso. moy./jour", "Seuil",
              "Jours avant rupture", "Commande recommandée", "",
            ]}
          />
          <tbody>
            {previsions.map((p) => (
              <tr key={`${p.fournisseur.id}-${p.type_article}`} className={TABLE_ROW_CLASS}>
                <td className={TABLE_CELL_CLASS}>
                  {p.fournisseur.code} — {p.fournisseur.nom}
                </td>
                <td className={TABLE_CELL_CLASS}>{TYPE_LABELS[p.type_article]}</td>
                <td className={`${TABLE_CELL_CLASS} tabular-nums`}>{p.stock_actuel}</td>
                <td className={`${TABLE_CELL_CLASS} tabular-nums`}>{p.consommation_moyenne_journaliere.toFixed(2)}</td>
                <td className={TABLE_CELL_CLASS}>
                  {p.seuil ?? "—"}
                  {p.source_seuil ? (
                    <Badge tone={p.source_seuil === "MANUEL" ? "neutral" : "info"} className="ml-2">
                      {p.source_seuil === "MANUEL" ? "Manuel" : "Calculé"}
                    </Badge>
                  ) : null}
                </td>
                <td className={`${TABLE_CELL_CLASS} tabular-nums`}>
                  {p.jours_avant_rupture !== null ? Math.round(p.jours_avant_rupture) : "—"}
                </td>
                <td className={TABLE_CELL_CLASS}>{frDate(p.date_commande_recommandee)}</td>
                <td className={TABLE_CELL_CLASS}>
                  {p.en_alerte ? <Badge tone="crit">À commander</Badge> : null}
                </td>
              </tr>
            ))}
            {previsions.length === 0 ? <TableEmptyRow colSpan={8}>Aucune donnée.</TableEmptyRow> : null}
          </tbody>
        </TableCard>
      ) : null}

      {previsions && previsions.length > 0 && mode === "cartes" ? (
        <div className="oa-stagger grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {previsions.map((p) => (
            <GlassCard key={`${p.fournisseur.id}-${p.type_article}`} className="flex h-full flex-col gap-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">
                    {p.fournisseur.code} — {p.fournisseur.nom}
                  </p>
                  <p className="text-xs text-muted">{TYPE_LABELS[p.type_article]}</p>
                </div>
                {p.en_alerte ? <Badge tone="crit">À commander</Badge> : null}
              </div>
              <div className="grid grid-cols-2 gap-3 border-t border-line/70 pt-3">
                <CardField label="Stock actuel">
                  <span className="tabular-nums">{p.stock_actuel}</span>
                </CardField>
                <CardField label="Seuil">
                  <span className="tabular-nums">{p.seuil ?? "—"}</span>
                  {p.source_seuil ? (
                    <Badge tone={p.source_seuil === "MANUEL" ? "neutral" : "info"} className="ml-1.5">
                      {p.source_seuil === "MANUEL" ? "Manuel" : "Calculé"}
                    </Badge>
                  ) : null}
                </CardField>
                <CardField label="Jours avant rupture">
                  <span className="tabular-nums">
                    {p.jours_avant_rupture !== null ? Math.round(p.jours_avant_rupture) : "—"}
                  </span>
                </CardField>
                <CardField label="Commande recommandée">{frDate(p.date_commande_recommandee)}</CardField>
              </div>
              <p className="border-t border-line/70 pt-2 text-xs text-muted">
                Conso. moy./jour&nbsp;: {p.consommation_moyenne_journaliere.toFixed(2)}
              </p>
            </GlassCard>
          ))}
        </div>
      ) : null}
    </div>
  );
}
