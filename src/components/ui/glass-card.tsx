import { cn } from "@/lib/utils";
import type { ComponentPropsWithoutRef, ElementType } from "react";

interface GlassCardProps extends ComponentPropsWithoutRef<"div"> {
  /** "strong" = plus opaque, pour le contenu dense (tableaux) ou le header. */
  tone?: "default" | "strong";
  as?: ElementType;
}

/** Panneau Glassmorphism réutilisable : fond translucide + flou + bordure fine. */
export function GlassCard({
  tone = "default",
  as: Component = "div",
  className,
  ...props
}: GlassCardProps) {
  return (
    <Component
      className={cn(
        "rounded-2xl border shadow-[0_1px_2px_var(--shadow-1),0_12px_32px_-16px_var(--shadow-2)] backdrop-blur-xl",
        tone === "strong" ? "bg-glass-strong border-glass-border" : "bg-glass border-glass-border",
        className,
      )}
      {...props}
    />
  );
}
