"use client";

import { Clock } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { CardField } from "@/components/ui/card-field";
import { GlassCard } from "@/components/ui/glass-card";
import { KpiCard } from "@/components/ui/kpi-card";
import { InlineEmpty, ListError, ListSkeleton, StaleNote } from "@/components/ui/list-states";
import { PageHeader } from "@/components/ui/page-header";
import { TABLE_CELL_CLASS, TABLE_ROW_CLASS, TableCard, TableEmptyRow, THead } from "@/components/ui/data-table";
import { ViewToggle } from "@/components/ui/view-toggle";
import { useAuth } from "@/lib/auth-context";
import { useConnectivity } from "@/lib/connectivity-context";
import { useViewMode } from "@/lib/use-view-mode";

interface UniteDormante {
  id: string;
  numero_serie: string;
  code_interne: string | null;
  type_article: "FLEXITANK" | "HEATING_PAD";
  fournisseur: { id: string; code: string; nom: string };
  date_reference: string;
  source_date: "DERNIERE_SORTIE" | "ENTREE";
  jours_ecoules: number;
  valeur_immobilisee: string | null;
}

const TYPE_LABELS: Record<UniteDormante["type_article"], string> = {
  FLEXITANK: "Flexitank",
  HEATING_PAD: "Heating pad",
};

const SEUIL_DEFAUT = 90;

const frMontant = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

function libelleSource(u: UniteDormante): string {
  return u.source_date === "DERNIERE_SORTIE" ? "dernière sortie" : "entrée";
}

export default function StockDormantPage() {
  const { authFetch } = useAuth();
  const { etat } = useConnectivity();
  const { mode, preference, setPreference } = useViewMode("stock-dormant");
  const [seuilJours, setSeuilJours] = useState(String(SEUIL_DEFAUT));
  const [unites, setUnites] = useState<UniteDormante[] | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [tronque, setTronque] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const seuil = Number(seuilJours);
    if (!Number.isFinite(seuil) || seuil <= 0) return;

    let cancelled = false;
    (async () => {
      setUnites(null);
      const res = await authFetch(`/dashboard/stock-dormant/?seuil_jours=${seuil}`);
      if (cancelled) return;
      if (!res.ok) {
        setError(
          res.status === 503
            ? "Hors connexion — cette page n'a pas encore été consultée en ligne."
            : `Erreur ${res.status} lors du chargement.`,
        );
        return;
      }
      const data = (await res.json()) as { count: number; next: string | null; results: UniteDormante[] };
      setError(null);
      setUnites(data.results);
      setTotal(data.count);
      setTronque(data.next !== null);
    })();
    return () => {
      cancelled = true;
    };
  }, [authFetch, seuilJours, reloadKey]);

  const valeurTotale = unites
    ? unites.reduce((somme, u) => somme + (u.valeur_immobilisee ? Number(u.valeur_immobilisee) : 0), 0)
    : null;
  const nbSansValeur = unites ? unites.filter((u) => u.valeur_immobilisee === null).length : 0;

  return (
    <div className="oa-rise flex flex-col gap-5">
      <PageHeader
        icon={Clock}
        eyebrow="Diagnostic"
        title="Stock dormant"
        subtitle="Unités en stock dont la dernière activité remonte à plus de X jours."
      >
        <label className="flex items-center gap-2 text-sm">
          <span className="font-medium text-foreground">Seuil</span>
          <input
            type="number"
            min={1}
            value={seuilJours}
            onChange={(e) => setSeuilJours(e.target.value)}
            className="w-20 min-h-11 rounded-lg border border-line px-3 py-2 text-sm"
          />
          <span className="text-muted">jours</span>
        </label>
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <KpiCard icon={Clock} tone="warn" label="Unités dormantes" value={total ?? undefined} />
        <KpiCard
          icon={Clock}
          tone="crit"
          label="Valeur immobilisée"
          value={valeurTotale !== null ? frMontant.format(valeurTotale) : undefined}
          hint={nbSansValeur > 0 ? `${nbSansValeur} unité(s) sans coût configuré, non comptée(s)` : undefined}
        />
      </div>

      {tronque ? (
        <p className="text-xs text-muted">
          Plus de {unites?.length ?? 0} unités correspondent — seules les {unites?.length ?? 0} premières sont affichées.
        </p>
      ) : null}

      {unites && unites.length > 0 && etat === "hors_ligne" ? <StaleNote /> : null}

      {!unites && !error ? <ListSkeleton /> : null}

      {unites && unites.length === 0 ? (
        <InlineEmpty icon={Clock} title="Aucune unité dormante" description="Rien ne dépasse ce seuil pour l'instant." />
      ) : null}

      {unites && unites.length > 0 && mode === "liste" ? (
        <TableCard minWidth={720}>
          <THead columns={["Numéro de série", "Type", "Fournisseur", "Dernière activité", "Jours écoulés", "Valeur immobilisée"]} />
          <tbody>
            {unites.map((u) => (
              <tr key={u.id} className={TABLE_ROW_CLASS}>
                <td className={`${TABLE_CELL_CLASS} font-mono text-xs`}>{u.numero_serie}</td>
                <td className={TABLE_CELL_CLASS}>{TYPE_LABELS[u.type_article]}</td>
                <td className={TABLE_CELL_CLASS}>
                  {u.fournisseur.code} — {u.fournisseur.nom}
                </td>
                <td className={TABLE_CELL_CLASS}>
                  {new Date(u.date_reference).toLocaleDateString("fr-FR")}{" "}
                  <span className="text-xs text-muted">({libelleSource(u)})</span>
                </td>
                <td className={`${TABLE_CELL_CLASS} tabular-nums`}>{u.jours_ecoules}</td>
                <td className={`${TABLE_CELL_CLASS} tabular-nums`}>
                  {u.valeur_immobilisee !== null ? frMontant.format(Number(u.valeur_immobilisee)) : "—"}
                </td>
              </tr>
            ))}
            {unites.length === 0 ? <TableEmptyRow colSpan={6}>Aucune unité dormante.</TableEmptyRow> : null}
          </tbody>
        </TableCard>
      ) : null}

      {unites && unites.length > 0 && mode === "cartes" ? (
        <div className="oa-stagger grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {unites.map((u) => (
            <GlassCard key={u.id} className="flex h-full flex-col gap-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="truncate font-mono text-xs text-foreground">{u.numero_serie}</p>
                <Badge tone="neutral">{TYPE_LABELS[u.type_article]}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 border-t border-line/70 pt-3">
                <CardField label="Fournisseur">
                  {u.fournisseur.code} — {u.fournisseur.nom}
                </CardField>
                <CardField label="Dernière activité">
                  {new Date(u.date_reference).toLocaleDateString("fr-FR")}{" "}
                  <span className="text-xs text-muted">({libelleSource(u)})</span>
                </CardField>
                <CardField label="Jours écoulés">
                  <span className="tabular-nums">{u.jours_ecoules}</span>
                </CardField>
                <CardField label="Valeur immobilisée">
                  <span className="tabular-nums">
                    {u.valeur_immobilisee !== null ? frMontant.format(Number(u.valeur_immobilisee)) : "—"}
                  </span>
                </CardField>
              </div>
            </GlassCard>
          ))}
        </div>
      ) : null}
    </div>
  );
}
