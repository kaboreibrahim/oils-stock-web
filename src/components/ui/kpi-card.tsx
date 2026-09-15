import type { CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

import { GlassCard } from "./glass-card";
import { Skeleton } from "./skeleton";

type KpiTone = "accent" | "accent2" | "ok" | "warn" | "crit";

const TONE_CLASSES: Record<KpiTone, string> = {
  accent: "bg-accent-soft text-accent-strong",
  accent2: "bg-accent-2/15 text-accent-2",
  ok: "bg-ok-soft text-ok",
  warn: "bg-warn-soft text-warn",
  crit: "bg-crit-soft text-crit",
};

interface KpiCardProps {
  icon: LucideIcon;
  label: string;
  /** undefined/null = en cours de chargement (skeleton). */
  value?: string | number | null;
  hint?: string;
  tone?: KpiTone;
  /** Donnée pas encore disponible (fonctionnalité à venir) : affiche "—" plutôt qu'un skeleton indéfini. */
  soon?: boolean;
  className?: string;
  style?: CSSProperties;
}

/** Carte KPI Glassmorphism — icône, valeur, libellé, note courte. */
export function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "accent",
  soon = false,
  className,
  style,
}: KpiCardProps) {
  return (
    <GlassCard className={cn("oa-rise flex flex-col gap-3 p-5", className)} style={style}>
      <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", TONE_CLASSES[tone])}>
        <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
      </div>
      <div>
        {soon ? (
          <p className="text-2xl font-semibold tracking-tight text-muted">—</p>
        ) : value === undefined || value === null ? (
          <Skeleton className="h-8 w-14" />
        ) : (
          <p className="text-2xl font-semibold tracking-tight text-foreground">{value}</p>
        )}
        <p className="mt-0.5 text-sm text-muted">{label}</p>
      </div>
      {hint ? <p className="text-xs font-medium text-muted">{hint}</p> : null}
    </GlassCard>
  );
}
