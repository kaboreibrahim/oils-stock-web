import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

import { Eyebrow } from "./eyebrow";
import { GlassCard } from "./glass-card";

interface SectionCardProps extends Omit<ComponentProps<typeof GlassCard>, "title"> {
  /** Sur-titre mono optionnel, au-dessus du titre. */
  eyebrow?: ReactNode;
  title?: ReactNode;
  /** Actions alignées à droite du titre. */
  actions?: ReactNode;
  children: ReactNode;
}

/** Panneau de section : GlassCard + en-tête (sur-titre / titre / actions)
 * homogène — remplace les blocs `GlassCard` + `<h2 class="text-sm font-semibold">`. */
export function SectionCard({
  eyebrow,
  title,
  actions,
  children,
  className,
  ...rest
}: SectionCardProps) {
  return (
    <GlassCard className={cn("oa-rise flex flex-col gap-4 p-5", className)} {...rest}>
      {eyebrow || title || actions ? (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <div className="min-w-0">
            {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
            {title ? (
              <h2 className="mt-0.5 text-sm font-semibold text-foreground">{title}</h2>
            ) : null}
          </div>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </GlassCard>
  );
}
