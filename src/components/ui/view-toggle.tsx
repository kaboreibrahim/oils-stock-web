import { LayoutGrid, List } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ViewMode } from "@/lib/use-view-mode";

interface ViewToggleProps {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
  className?: string;
}

/** Bascule liste/cartes pour un tableau — masqué sous le breakpoint mobile
 * (là où la vue cartes est de toute façon forcée, voir useViewMode). */
export function ViewToggle({ mode, onChange, className }: ViewToggleProps) {
  return (
    <div className={cn("hidden items-center gap-0.5 rounded-lg border border-line bg-surface p-0.5 sm:flex", className)}>
      <button
        type="button"
        aria-label="Vue en liste"
        aria-pressed={mode === "liste"}
        onClick={() => onChange("liste")}
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
          mode === "liste" ? "bg-accent-soft text-accent-strong" : "text-muted hover:text-foreground",
        )}
      >
        <List className="h-4 w-4" strokeWidth={2} />
      </button>
      <button
        type="button"
        aria-label="Vue en cartes"
        aria-pressed={mode === "cartes"}
        onClick={() => onChange("cartes")}
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
          mode === "cartes" ? "bg-accent-soft text-accent-strong" : "text-muted hover:text-foreground",
        )}
      >
        <LayoutGrid className="h-4 w-4" strokeWidth={2} />
      </button>
    </div>
  );
}
