"use client";

import { useCallback, useEffect, useState } from "react";

export type ThemePreference = "system" | "light" | "dark";

/** Doit rester identique à la clé utilisée par le script anti-flash inline
 * dans app/layout.tsx (exécuté avant hydratation, il ne peut pas importer ce
 * module — la clé y est donc dupliquée en dur). */
export const THEME_STORAGE_KEY = "oils-stock-theme";

function applyTheme(preference: ThemePreference) {
  const root = document.documentElement;
  if (preference === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", preference);
}

/**
 * Préférence de thème (système / clair / sombre), persistée dans
 * localStorage et posée sur `<html data-theme>` (voir globals.css).
 *
 * L'état initial reste "system" au premier rendu (identique côté serveur et
 * côté client) pour éviter tout décalage d'hydratation ; la vraie valeur
 * stockée n'est lue qu'après le montage, dans l'effet ci-dessous — `mounted`
 * permet à l'appelant (ThemeToggle) de ne rien afficher avant ça. Le flash
 * visuel est déjà évité indépendamment par le script inline de layout.tsx,
 * qui pose l'attribut avant la première peinture.
 */
export function useTheme() {
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // IIFE async : lit localStorage (indisponible côté serveur) une fois monté,
    // sans court-circuiter le rendu initial (identique client/serveur) — voir
    // la même contrainte résolue ailleurs dans stock/page.tsx.
    (async () => {
      let stored: string | null = null;
      try {
        stored = window.localStorage.getItem(THEME_STORAGE_KEY);
      } catch {
        // localStorage indisponible (navigation privée...) : on reste en "system".
      }
      setPreferenceState(stored === "light" || stored === "dark" ? stored : "system");
      setMounted(true);
    })();
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // ignoré volontairement — le thème s'applique quand même pour la session en cours.
    }
    applyTheme(next);
    setPreferenceState(next);
  }, []);

  return { preference, setPreference, mounted };
}
