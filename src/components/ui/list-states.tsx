import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "./button";
import { GlassCard } from "./glass-card";
import { Skeleton } from "./skeleton";

/** Squelette de chargement d'une liste/tableau. */
export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <GlassCard className="oa-rise flex flex-col gap-2.5 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-9 w-full" />
      ))}
    </GlassCard>
  );
}

/** Bloc "aucun résultat" dans le flux (vue cartes, sous-sections). */
export function InlineEmpty({
  icon: Icon,
  title,
  description,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
}) {
  return (
    <GlassCard className="oa-rise flex flex-col items-center gap-2 px-6 py-12 text-center">
      {Icon ? (
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-foreground/[0.04] text-muted">
          <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
        </span>
      ) : null}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description ? <p className="max-w-sm text-sm text-muted">{description}</p> : null}
    </GlassCard>
  );
}

/** Erreur de chargement d'une liste, avec bouton « Réessayer » optionnel. */
export function ListError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <GlassCard className="oa-rise flex flex-col items-start gap-3 px-4 py-3">
      <p className="text-sm text-crit">{message}</p>
      {onRetry ? (
        <Button variant="secondary" onClick={onRetry}>
          Réessayer
        </Button>
      ) : null}
    </GlassCard>
  );
}

/** Mention discrète « données possiblement anciennes » quand on affiche du
 *  contenu servi par le cache hors connexion. */
export function StaleNote({ children }: { children?: ReactNode }) {
  return (
    <p className="text-xs text-muted">
      {children ?? "Hors connexion — les données affichées peuvent être anciennes."}
    </p>
  );
}
