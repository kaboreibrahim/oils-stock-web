"use client";

import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";

import { useTheme, type ThemePreference } from "@/lib/theme";
import { cn } from "@/lib/utils";

const NEXT: Record<ThemePreference, ThemePreference> = {
  system: "light",
  light: "dark",
  dark: "system",
};

const META: Record<ThemePreference, { icon: LucideIcon; label: string }> = {
  system: { icon: Monitor, label: "Thème : système — cliquer pour passer en clair" },
  light: { icon: Sun, label: "Thème : clair — cliquer pour passer en sombre" },
  dark: { icon: Moon, label: "Thème : sombre — cliquer pour revenir au système" },
};

/** Bouton rond qui fait défiler la préférence de thème : système → clair →
 * sombre → système. Rien n'est affiché avant le montage (la vraie préférence
 * vient de localStorage, indisponible pendant le rendu serveur) — évite un
 * décalage d'hydratation ; voir lib/theme.ts. */
export function ThemeToggle({ className }: { className?: string }) {
  const { preference, setPreference, mounted } = useTheme();

  if (!mounted) {
    return <span className={cn("h-9 w-9 shrink-0", className)} aria-hidden />;
  }

  const { icon: Icon, label } = META[preference];

  return (
    <button
      type="button"
      onClick={() => setPreference(NEXT[preference])}
      aria-label={label}
      title={label}
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-foreground/[0.04] hover:text-foreground",
        className,
      )}
    >
      <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
    </button>
  );
}
