import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

export type StatusPillState =
  | "loading"
  | "success"
  | "error"
  | "offline"
  | "syncing"
  | "pending";

const CONFIG: Record<StatusPillState, { texte: string; texteClasse: string; pointClasse: string }> = {
  loading: { texte: "Chargement…", texteClasse: "text-muted", pointClasse: "bg-muted animate-pulse" },
  success: { texte: "À jour", texteClasse: "text-ok", pointClasse: "bg-ok" },
  error: { texte: "Erreur", texteClasse: "text-crit", pointClasse: "bg-crit" },
  offline: { texte: "Hors connexion", texteClasse: "text-crit", pointClasse: "bg-crit" },
  // syncing / pending : rendus ici, mais utilisés seulement en Phase 2 (écriture hors-ligne).
  syncing: { texte: "Synchronisation…", texteClasse: "text-accent-2", pointClasse: "bg-accent-2" },
  pending: { texte: "En attente", texteClasse: "text-warn", pointClasse: "bg-warn" },
};

export function StatusPill({
  status,
  label,
  className,
}: {
  status: StatusPillState;
  label?: string;
  className?: string;
}) {
  const c = CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium",
        c.texteClasse,
        className,
      )}
    >
      {status === "syncing" ? (
        <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2.5} aria-hidden />
      ) : (
        <span className={cn("h-2 w-2 rounded-full", c.pointClasse)} aria-hidden />
      )}
      {label ?? c.texte}
    </span>
  );
}
