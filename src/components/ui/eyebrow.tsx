import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

/** Sur-titre mono, majuscules espacées — même traitement que l'en-tête
 * ("STOCK / MANAGEMENT") et le tableau de bord. Donne une vraie hiérarchie
 * au-dessus des titres de page et de section. */
export function Eyebrow({ className, ...props }: ComponentPropsWithoutRef<"p">) {
  return (
    <p
      className={cn(
        "font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-muted",
        className,
      )}
      {...props}
    />
  );
}
