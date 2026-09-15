import type { ReactNode } from "react";

import { Badge } from "./badge";

const NODE_COLOR: Record<"ok" | "crit" | "neutral", string> = {
  ok: "var(--ok)",
  crit: "var(--crit)",
  neutral: "var(--muted)",
};

export interface TimelineItem {
  id: string;
  tone: "ok" | "crit" | "neutral";
  /** Étiquette colorée (type de mouvement…). */
  badge: string;
  /** Valeur principale, rendue en mono (numéro de série…). */
  primary: string;
  /** Complément en mono discret (référence…). */
  secondary?: string;
  /** Méta alignée à droite (date…). */
  meta: ReactNode;
}

/** Fil vertical à nœuds colorés — activité récente, dernières transactions. */
export function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <ol className="flex flex-col">
      {items.map((item, i) => (
        <li key={item.id} className="relative flex gap-4 pb-4 last:pb-0">
          {i < items.length - 1 ? (
            <span className="absolute bottom-0 left-[5px] top-3.5 w-px bg-line" aria-hidden />
          ) : null}
          <span
            className="relative z-10 mt-1.5 h-[11px] w-[11px] shrink-0 rounded-full"
            style={{ background: NODE_COLOR[item.tone] }}
            aria-hidden
          />
          <div className="flex flex-1 flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <Badge tone={item.tone}>{item.badge}</Badge>
              <span className="font-mono text-xs text-foreground">{item.primary}</span>
              {item.secondary ? (
                <span className="font-mono text-xs text-muted">{item.secondary}</span>
              ) : null}
            </div>
            <span className="text-xs text-muted">{item.meta}</span>
          </div>
        </li>
      ))}
    </ol>
  );
}
