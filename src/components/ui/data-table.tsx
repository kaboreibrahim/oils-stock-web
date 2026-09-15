import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { GlassCard } from "./glass-card";

/** Classe des `<tr>` du corps — filet fin, survol discret. */
export const TABLE_ROW_CLASS =
  "border-b border-line/60 transition-colors last:border-0 hover:bg-foreground/[0.03]";
/** Classe des cellules `<td>`/`<th>` — padding homogène. */
export const TABLE_CELL_CLASS = "px-4 py-3";

/** Carte translucide + défilement horizontal + `<table>` prête à l'emploi. */
export function TableCard({
  minWidth = 560,
  className,
  children,
}: {
  minWidth?: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <GlassCard tone="strong" className={cn("oa-rise overflow-hidden", className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ minWidth }}>
          {children}
        </table>
      </div>
    </GlassCard>
  );
}

type Column = string | { label: string; align?: "left" | "right" | "center" };

/** En-tête de tableau — mono, majuscules, collant en haut au défilement.
 * `position: sticky` posé sur les `<th>` (fiable même en border-collapse,
 * contrairement à sticky sur `<thead>`/`<tr>`). */
export function THead({ columns }: { columns: Column[] }) {
  return (
    <thead>
      <tr className="text-left font-mono text-xs uppercase tracking-wide text-muted">
        {columns.map((col, i) => {
          const label = typeof col === "string" ? col : col.label;
          const align = typeof col === "string" ? "left" : (col.align ?? "left");
          return (
            <th
              key={i}
              className={cn(
                TABLE_CELL_CLASS,
                "sticky top-0 z-10 bg-surface font-medium shadow-[inset_0_-1px_0_var(--line)]",
                align === "right" && "text-right",
                align === "center" && "text-center",
              )}
            >
              {label}
            </th>
          );
        })}
      </tr>
    </thead>
  );
}

/** Ligne unique "aucun résultat", centrée sur toute la largeur. */
export function TableEmptyRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-12 text-center text-sm text-muted">
        {children}
      </td>
    </tr>
  );
}
