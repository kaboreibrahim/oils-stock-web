import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

type BadgeTone = "ok" | "warn" | "crit" | "info" | "neutral";

const TONE_CLASSES: Record<BadgeTone, string> = {
  ok: "bg-ok-soft text-ok",
  warn: "bg-warn-soft text-warn",
  crit: "bg-crit-soft text-crit",
  info: "bg-accent-soft text-accent-strong",
  neutral: "bg-foreground/[0.04] text-muted",
};

interface BadgeProps extends ComponentPropsWithoutRef<"span"> {
  tone?: BadgeTone;
}

/** Étiquette de statut colorée (réception/sortie/retour, actif/inactif...). */
export function Badge({ tone = "neutral", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium leading-none",
        TONE_CLASSES[tone],
        className,
      )}
      {...props}
    />
  );
}
