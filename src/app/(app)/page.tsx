"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  Boxes,
  Container,
  PackageMinus,
  PackagePlus,
  Thermometer,
  Truck,
  Undo2,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useState, type CSSProperties } from "react";

import { BarList, type BarDatum } from "@/components/ui/bar-list";
import { DonutChart, type DonutDatum } from "@/components/ui/donut-chart";
import { Eyebrow } from "@/components/ui/eyebrow";
import { GlassCard } from "@/components/ui/glass-card";
import { LineChart } from "@/components/ui/line-chart";
import { Skeleton } from "@/components/ui/skeleton";
import { Timeline, type TimelineItem } from "@/components/ui/timeline";
import { ThresholdBarList, type ThresholdBarDatum } from "@/components/ui/threshold-bar-list";
import { useAuth } from "@/lib/auth-context";
import type { AuthFetch } from "@/lib/auth-context";
import {
  MOUVEMENT_LABELS,
  MOUVEMENT_TONES,
  type Mouvement,
} from "@/lib/mouvements";
import { cn } from "@/lib/utils";

interface FournisseurLite {
  id: string;
  nom: string;
  nb_flexitanks: number;
  nb_heating_pads: number;
}

interface SortiesMensuelles {
  mois: string[];
  flexitank: number[];
  heating_pad: number[];
  flexitank_moyenne_mobile: (number | null)[];
  heating_pad_moyenne_mobile: (number | null)[];
}

interface SeuilReappro {
  fournisseur: { id: string; code: string; nom: string };
  type_article: "FLEXITANK" | "HEATING_PAD";
  stock_actuel: number;
  seuil: number | null;
  source_seuil: "MANUEL" | "CALCULE" | null;
  en_alerte: boolean;
}

// Palette pour le donut "stock par fournisseur" (nombre de fournisseurs variable,
// contrairement au donut par type qui n'a toujours que 2 valeurs fixes) — cycle
// si plus de fournisseurs que de couleurs disponibles.
const DONUT_PALETTE = ["--accent", "--accent-2", "--ok", "--warn", "--crit"];

const TYPE_ARTICLE_LABELS: Record<SeuilReappro["type_article"], string> = {
  FLEXITANK: "Flexitank",
  HEATING_PAD: "Heating pad",
};

function moisCourt(iso: string): string {
  const [annee, mois] = iso.split("-").map(Number);
  return new Date(annee, mois - 1, 1).toLocaleDateString("fr-FR", { month: "short" });
}

interface Stats {
  totalEnStock: number;
  flexitank: number;
  heatingPad: number;
  fournisseursActifs: number;
  clientsActifs: number;
  sortiesBrouillon: number;
  sortiesValidees: number;
  retoursCount: number;
  receptionsBrouillon: number;
  receptionsValidees: number;
  parFournisseur: BarDatum[];
}

const TONE_TILE = {
  accent: "bg-accent-soft text-accent-strong",
  accent2: "bg-accent-2/15 text-accent-2",
  ok: "bg-ok-soft text-ok",
} as const;

const frNumber = new Intl.NumberFormat("fr-FR");
function formatFr(n: number): string {
  return frNumber.format(n);
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

async function getCount(authFetch: AuthFetch, path: string): Promise<number> {
  const res = await authFetch(path);
  if (!res.ok) throw new Error(`Erreur ${res.status} sur ${path}`);
  const data = (await res.json()) as { count: number };
  return data.count;
}

/* ------------------------------------------------------------------ */
/*  Blocs du tableau de bord.                                          */
/* ------------------------------------------------------------------ */

function StatCard({
  icon: Icon,
  tone,
  label,
  value,
  d,
}: {
  icon: LucideIcon;
  tone: keyof typeof TONE_TILE;
  label: string;
  value: number | undefined;
  d: string;
}) {
  return (
    <GlassCard
      className="oa-dash-in oa-lift flex flex-col gap-3 p-4 sm:p-5"
      style={{ "--d": d } as CSSProperties}
    >
      <span
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-xl",
          TONE_TILE[tone],
        )}
      >
        <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
      </span>
      <div>
        {value === undefined ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <p className="text-2xl font-semibold tracking-tight tabular-nums text-foreground">
            {formatFr(value)}
          </p>
        )}
        <p className="mt-0.5 text-sm text-muted">{label}</p>
      </div>
    </GlassCard>
  );
}

function MoveTile({
  href,
  icon: Icon,
  label,
  value,
  d,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  value: number | undefined;
  d: string;
}) {
  return (
    <Link
      href={href}
      className="oa-dash-in group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      style={{ "--d": d } as CSSProperties}
    >
      <GlassCard className="oa-lift flex h-full flex-col gap-3 p-4">
        <div className="flex items-start justify-between">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft text-accent-strong">
            <Icon className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />
          </span>
          <ArrowUpRight
            className="h-4 w-4 text-muted transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            aria-hidden
          />
        </div>
        <div>
          {value === undefined ? (
            <Skeleton className="h-6 w-10" />
          ) : (
            <p className="text-xl font-semibold tabular-nums text-foreground">{formatFr(value)}</p>
          )}
          <p className="mt-0.5 text-xs text-muted">{label}</p>
        </div>
      </GlassCard>
    </Link>
  );
}

/** Barre segmentée flexitanks / heating pads. Largeurs réelles rendues
 *  d'emblée ; l'essuyage d'entrée est purement CSS (.oa-dash-wipe). */
function CompositionBar({ flexitank, heatingPad }: { flexitank: number; heatingPad: number }) {
  const total = flexitank + heatingPad;
  const flexPct = total > 0 ? (flexitank / total) * 100 : 0;
  const heatPct = total > 0 ? (heatingPad / total) * 100 : 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="oa-dash-wipe flex h-2.5 w-full gap-[3px] overflow-hidden rounded-full bg-foreground/[0.06]">
        <span
          className="block h-full rounded-full"
          style={{ width: `${flexPct}%`, background: "var(--accent)" }}
        />
        <span
          className="block h-full rounded-full"
          style={{ width: `${heatPct}%`, background: "var(--accent-2)" }}
        />
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <LegendDot color="var(--accent)" label="Flexitanks" value={flexitank} />
        <LegendDot color="var(--accent-2)" label="Heating pads" value={heatingPad} />
      </div>
    </div>
  );
}

function LegendDot({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <span className="flex items-center gap-2">
      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} aria-hidden />
      <span className="text-muted">{label}</span>
      <span className="font-semibold tabular-nums text-foreground">{formatFr(value)}</span>
    </span>
  );
}

/* ------------------------------------------------------------------ */

export default function DashboardPage() {
  const { user, authFetch } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [activite, setActivite] = useState<Mouvement[] | null>(null);
  const [sortiesMensuelles, setSortiesMensuelles] = useState<SortiesMensuelles | null>(null);
  const [seuilsReappro, setSeuilsReappro] = useState<SeuilReappro[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Requêtes volontairement séquentielles (pas Promise.all) : authFetch
        // rafraîchit le jeton tout seul sur un 401, et plusieurs rafraîchissements
        // concurrents avec le même refresh token se marcheraient dessus
        // (rotation + liste noire côté API — voir apps/users côté backend).
        const totalEnStock = await getCount(authFetch, "/unites/?statut=EN_STOCK");
        const flexitank = await getCount(authFetch, "/unites/?statut=EN_STOCK&type_article=FLEXITANK");
        const heatingPad = await getCount(authFetch, "/unites/?statut=EN_STOCK&type_article=HEATING_PAD");
        const fournisseursActifs = await getCount(authFetch, "/fournisseurs/?actif=true");
        const clientsActifs = await getCount(authFetch, "/clients/?actif=true");
        const sortiesBrouillon = await getCount(authFetch, "/sorties/?statut=BROUILLON");
        const sortiesValidees = await getCount(authFetch, "/sorties/?statut=VALIDEE");
        const retoursCount = await getCount(authFetch, "/mouvements/?type_mouvement=RETOUR");
        const receptionsBrouillon = await getCount(authFetch, "/receptions/?statut=BROUILLON");
        const receptionsValidees = await getCount(authFetch, "/receptions/?statut=VALIDEE");

        // nb_flexitanks/nb_heating_pads sont déjà annotés par le backend sur
        // chaque fournisseur (voir FournisseurRepository.get_all()) — plus
        // besoin d'un getCount() par fournisseur (l'ancienne boucle N+1).
        const fournisseursRes = await authFetch("/fournisseurs/?ordering=nom&actif=true");
        let parFournisseur: BarDatum[] = [];
        if (fournisseursRes.ok) {
          const data = (await fournisseursRes.json()) as { results: FournisseurLite[] };
          const top = data.results.slice(0, 6);
          parFournisseur = top.map((f) => ({ label: f.nom, value: f.nb_flexitanks + f.nb_heating_pads }));
        }

        const activiteRes = await authFetch("/mouvements/?ordering=-date_mouvement");
        if (activiteRes.ok) {
          const data = (await activiteRes.json()) as { results: Mouvement[] };
          if (!cancelled) setActivite(data.results.slice(0, 6));
        }

        if (cancelled) return;
        setStats({
          totalEnStock, flexitank, heatingPad, fournisseursActifs, clientsActifs,
          sortiesBrouillon, sortiesValidees, retoursCount,
          receptionsBrouillon, receptionsValidees, parFournisseur,
        });
      } catch {
        if (!cancelled) setError("Impossible de charger les indicateurs du tableau de bord.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authFetch]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await authFetch("/dashboard/sorties-mensuelles/");
      if (cancelled || !res.ok) return;
      setSortiesMensuelles((await res.json()) as SortiesMensuelles);
    })();
    return () => {
      cancelled = true;
    };
  }, [authFetch]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await authFetch("/dashboard/seuils-reappro/");
      if (cancelled || !res.ok) return;
      setSeuilsReappro((await res.json()) as SeuilReappro[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [authFetch]);

  const dateLabel = new Date()
    .toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })
    .replace(/^\w/, (c) => c.toUpperCase());

  const parFournisseurDonut: DonutDatum[] = stats
    ? stats.parFournisseur.map((d, i) => ({ ...d, colorVar: DONUT_PALETTE[i % DONUT_PALETTE.length] }))
    : [];

  // Seuils configurés uniquement (un seuil null n'a rien à comparer) — en
  // alerte d'abord, pour repérer les articles à commander d'un coup d'œil.
  const seuilsAffiches: ThresholdBarDatum[] = seuilsReappro
    ? [...seuilsReappro]
        .filter((s): s is SeuilReappro & { seuil: number } => s.seuil !== null)
        .sort((a, b) => Number(b.en_alerte) - Number(a.en_alerte))
        .slice(0, 6)
        .map((s) => ({
          label: `${s.fournisseur.code} · ${TYPE_ARTICLE_LABELS[s.type_article]}`,
          value: s.stock_actuel,
          threshold: s.seuil,
        }))
    : [];

  return (
    <div className="flex flex-col gap-6">
      <header className="oa-dash-in" style={{ "--d": "0ms" } as CSSProperties}>
        <Eyebrow>Tableau de bord · {dateLabel}</Eyebrow>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          Bonjour, {user?.username}
        </h1>
        <p className="mt-1.5 text-sm text-muted">
          Voici un aperçu de l&apos;activité de votre stock aujourd&apos;hui.
        </p>
      </header>

      {error ? (
        <GlassCard
          className="oa-dash-in px-4 py-3 text-sm text-crit"
          style={{ "--d": "60ms" } as CSSProperties}
        >
          {error}
        </GlassCard>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-12">
        <GlassCard
          tone="strong"
          className="oa-dash-in oa-dash-hero flex min-h-[220px] flex-col justify-center gap-7 p-6 md:p-8 lg:col-span-7"
          style={{ "--d": "70ms" } as CSSProperties}
        >
          <span className="oa-dash-halo" aria-hidden />

          <div className="relative z-10 flex items-start justify-between gap-4">
            <div>
              <Eyebrow>Unités en stock</Eyebrow>
              {stats ? (
                <p className="oa-dash-figure mt-3 text-6xl font-semibold leading-none tracking-tight tabular-nums text-foreground md:text-7xl">
                  {formatFr(stats.totalEnStock)}
                </p>
              ) : (
                <Skeleton className="mt-3 h-14 w-44 md:h-[72px]" />
              )}
              <p className="mt-3 max-w-sm text-sm text-muted">
                Flexitanks et heating pads confondus, tous fournisseurs.
              </p>
            </div>
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent-strong">
              <Boxes className="h-6 w-6" strokeWidth={2} aria-hidden />
            </span>
          </div>

          <div className="relative z-10">
            {stats ? (
              <CompositionBar flexitank={stats.flexitank} heatingPad={stats.heatingPad} />
            ) : (
              <Skeleton className="h-2.5 w-full" />
            )}
          </div>
        </GlassCard>

        <div className="grid grid-cols-2 gap-4 lg:col-span-5">
          <StatCard icon={Container} tone="accent2" label="Flexitanks en stock" value={stats?.flexitank} d="120ms" />
          <StatCard icon={Thermometer} tone="accent2" label="Heating pads en stock" value={stats?.heatingPad} d="160ms" />
          <StatCard icon={Truck} tone="ok" label="Fournisseurs actifs" value={stats?.fournisseursActifs} d="200ms" />
          <StatCard icon={Users} tone="ok" label="Clients actifs" value={stats?.clientsActifs} d="240ms" />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <GlassCard
          className="oa-dash-in flex flex-col gap-4 p-5"
          style={{ "--d": "150ms" } as CSSProperties}
        >
          <Eyebrow>Répartition par type</Eyebrow>
          {stats ? (
            <DonutChart
              data={[
                { label: "Flexitanks", value: stats.flexitank, colorVar: "--accent" },
                { label: "Heating pads", value: stats.heatingPad, colorVar: "--accent-2" },
              ]}
            />
          ) : (
            <Skeleton className="h-32 w-full" />
          )}
        </GlassCard>

        <GlassCard
          className="oa-dash-in flex flex-col gap-4 p-5 lg:col-span-2"
          style={{ "--d": "190ms" } as CSSProperties}
        >
          <Eyebrow>Stock par fournisseur</Eyebrow>
          {stats ? (
            stats.parFournisseur.length > 0 ? (
              <BarList data={stats.parFournisseur} />
            ) : (
              <p className="text-sm text-muted">Aucun fournisseur actif.</p>
            )
          ) : (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          )}
        </GlassCard>
      </div>

      <GlassCard
        className="oa-dash-in flex flex-col gap-4 p-5"
        style={{ "--d": "210ms" } as CSSProperties}
      >
        <Eyebrow>Sorties mensuelles par type</Eyebrow>
        {sortiesMensuelles ? (
          <LineChart
            xLabels={sortiesMensuelles.mois.map(moisCourt)}
            series={[
              { label: "Flexitank", colorVar: "--accent", data: sortiesMensuelles.flexitank },
              { label: "Heating pad", colorVar: "--accent-2", data: sortiesMensuelles.heating_pad },
              {
                label: "Flexitank (moy. mobile 3 mois)",
                colorVar: "--accent",
                dashed: true,
                data: sortiesMensuelles.flexitank_moyenne_mobile,
              },
              {
                label: "Heating pad (moy. mobile 3 mois)",
                colorVar: "--accent-2",
                dashed: true,
                data: sortiesMensuelles.heating_pad_moyenne_mobile,
              },
            ]}
          />
        ) : (
          <Skeleton className="h-48 w-full" />
        )}
      </GlassCard>

      <div className="grid gap-4 lg:grid-cols-3">
        <GlassCard
          className="oa-dash-in flex flex-col gap-4 p-5"
          style={{ "--d": "220ms" } as CSSProperties}
        >
          <Eyebrow>Stock actuel par fournisseur</Eyebrow>
          {stats ? (
            parFournisseurDonut.length > 0 ? (
              <DonutChart data={parFournisseurDonut} />
            ) : (
              <p className="text-sm text-muted">Aucun fournisseur actif.</p>
            )
          ) : (
            <Skeleton className="h-32 w-full" />
          )}
        </GlassCard>

        <GlassCard
          className="oa-dash-in flex flex-col gap-4 p-5 lg:col-span-2"
          style={{ "--d": "230ms" } as CSSProperties}
        >
          <div className="flex items-center justify-between gap-3">
            <Eyebrow>Stock actuel vs seuil de réapprovisionnement</Eyebrow>
            <Link href="/previsions" className="text-xs font-medium text-accent-strong hover:underline">
              Voir tout
            </Link>
          </div>
          {seuilsReappro ? (
            seuilsAffiches.length > 0 ? (
              <ThresholdBarList data={seuilsAffiches} />
            ) : (
              <p className="text-sm text-muted">Aucun seuil configuré pour l&apos;instant.</p>
            )
          ) : (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          )}
        </GlassCard>
      </div>

      <section
        className="oa-dash-in flex flex-col gap-3"
        style={{ "--d": "250ms" } as CSSProperties}
      >
        <Eyebrow>Mouvements de stock</Eyebrow>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <MoveTile href="/receptions?statut=BROUILLON" icon={PackagePlus} label="Réceptions en attente" value={stats?.receptionsBrouillon} d="0ms" />
          <MoveTile href="/receptions?statut=VALIDEE" icon={PackagePlus} label="Réceptions validées" value={stats?.receptionsValidees} d="40ms" />
          <MoveTile href="/sorties?statut=BROUILLON" icon={PackageMinus} label="Sorties en attente" value={stats?.sortiesBrouillon} d="80ms" />
          <MoveTile href="/sorties?statut=VALIDEE" icon={PackageMinus} label="Sorties validées" value={stats?.sortiesValidees} d="120ms" />
          <MoveTile href="/retours" icon={Undo2} label="Retours enregistrés" value={stats?.retoursCount} d="160ms" />
        </div>
      </section>

      <GlassCard
        className="oa-dash-in flex flex-col gap-4 p-5"
        style={{ "--d": "270ms" } as CSSProperties}
      >
        <Eyebrow>Activité récente</Eyebrow>
        {!activite ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : activite.length === 0 ? (
          <p className="text-sm text-muted">
            Aucun mouvement pour l&apos;instant — arrive avec la première réception, sortie ou retour.
          </p>
        ) : (
          <Timeline items={activite.map(mouvementToTimelineItem)} />
        )}
      </GlassCard>
    </div>
  );
}
