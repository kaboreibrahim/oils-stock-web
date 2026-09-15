import type { ReactNode } from "react";

/** Paire libellé/valeur réutilisée dans les vues "cartes" des tableaux
 * (bascule liste/cartes) — même style que les fiches détail (ex.
 * fournisseurs/[id]). */
export function CardField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="font-mono text-[10px] uppercase tracking-wide text-muted">{label}</p>
      <div className="truncate text-sm text-foreground">{children}</div>
    </div>
  );
}
