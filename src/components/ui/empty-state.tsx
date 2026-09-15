import type { LucideIcon } from "lucide-react";

import { GlassCard } from "./glass-card";

/** État vide / écran pas encore construit — remplace l'ancien ComingSoon. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  jalon,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  jalon?: string;
}) {
  return (
    <GlassCard className="oa-rise flex flex-col items-center gap-3 px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent-strong">
        <Icon className="h-7 w-7" strokeWidth={1.75} aria-hidden />
      </div>
      <h1 className="text-lg font-semibold text-foreground">{title}</h1>
      <p className="max-w-sm text-sm text-muted">{description}</p>
      {jalon ? (
        <span className="rounded-full bg-foreground/[0.04] px-3 py-1 font-mono text-xs uppercase tracking-wide text-muted">
          {jalon}
        </span>
      ) : null}
    </GlassCard>
  );
}
