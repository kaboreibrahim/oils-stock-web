import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Paire libellé/valeur des fiches détail (vue lecture) — libellé mono en
 * majuscules, valeur en dessous. Pendant lecture seule de <CardField>. */
export function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="font-mono text-[11px] uppercase tracking-wide text-muted">{label}</p>
      <div className="mt-0.5 text-sm font-medium text-foreground">{children}</div>
    </div>
  );
}
