import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { Eyebrow } from "./eyebrow";

interface PageHeaderProps {
  icon?: LucideIcon;
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Titre en Geist Mono (fiches détail : référence, code…). */
  mono?: boolean;
  backHref?: string;
  backLabel?: string;
  /** Actions alignées à droite (boutons, badges de statut…). */
  children?: ReactNode;
}

/** En-tête de page unifié : lien retour optionnel, pastille d'icône,
 * sur-titre mono, titre, sous-titre, et une zone d'actions à droite. */
export function PageHeader({
  icon: Icon,
  eyebrow,
  title,
  subtitle,
  mono = false,
  backHref,
  backLabel = "Retour",
  children,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4">
      {backHref ? (
        <Link
          href={backHref}
          className="flex w-fit items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2} aria-hidden />
          {backLabel}
        </Link>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 items-start gap-3.5">
          {Icon ? (
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent-strong">
              <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
            </span>
          ) : null}
          <div className="min-w-0">
            {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
            <h1
              className={cn(
                "mt-1 text-2xl font-semibold tracking-tight text-foreground",
                mono && "font-mono text-xl",
              )}
            >
              {title}
            </h1>
            {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
          </div>
        </div>

        {children ? (
          <div className="flex flex-shrink-0 flex-wrap items-center gap-2">{children}</div>
        ) : null}
      </div>
    </div>
  );
}
