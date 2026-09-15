import Link from "next/link";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

import { BUTTON_BASE, BUTTON_VARIANTS, type ButtonVariant } from "./button";

interface LinkButtonProps extends ComponentProps<typeof Link> {
  variant?: ButtonVariant;
}

/** Lien Next stylé comme un <Button> — pour les CTA de navigation
 * ("Nouvelle sortie", "Retour aux fournisseurs"…). */
export function LinkButton({ variant = "primary", className, ...props }: LinkButtonProps) {
  return <Link className={cn(BUTTON_BASE, BUTTON_VARIANTS[variant], className)} {...props} />;
}
