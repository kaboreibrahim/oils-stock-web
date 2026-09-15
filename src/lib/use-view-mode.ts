"use client";

import { useEffect, useState } from "react";

export type ViewMode = "liste" | "cartes";

// Correspond au breakpoint `sm:` de Tailwind (utilisé partout ailleurs dans
// le projet pour distinguer mobile/desktop) — sous cette largeur, un tableau
// large ne rentre de toute façon pas, la vue cartes est donc forcée.
const LARGEUR_MOBILE_MAX = 639;

/**
 * Préférence liste/cartes persistée par écran (`localStorage`), qui bascule
 * automatiquement sur cartes en dessous du breakpoint mobile — quelle que
 * soit la préférence enregistrée, un tableau large ne convient pas à un
 * téléphone. `mode` est la valeur EFFECTIVE à afficher ; `preference` reste
 * la valeur choisie par l'utilisateur (utile pour ne griser/activer le bon
 * bouton du bascule que sur desktop).
 *
 * Comme `useTheme` (lib/theme.ts) : l'état initial reste "liste"/desktop au
 * premier rendu (identique serveur/client) pour éviter tout décalage
 * d'hydratation, la vraie valeur stockée n'étant lue qu'après le montage.
 */
export function useViewMode(cle: string, defaut: ViewMode = "liste") {
  const [preference, setPreferenceState] = useState<ViewMode>(defaut);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // IIFE async : même contrainte ESLint (react-hooks/set-state-in-effect)
    // résolue ailleurs dans le projet (lib/theme.ts, stock/page.tsx).
    (async () => {
      let stocke: string | null = null;
      try {
        stocke = window.localStorage.getItem(`oils-stock-vue-${cle}`);
      } catch {
        // localStorage indisponible (navigation privée...) — reste sur le défaut.
      }
      if (stocke === "liste" || stocke === "cartes") setPreferenceState(stocke);
    })();
  }, [cle]);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${LARGEUR_MOBILE_MAX}px)`);
    const maj = () => setIsMobile(mq.matches);
    maj();
    mq.addEventListener("change", maj);
    return () => mq.removeEventListener("change", maj);
  }, []);

  function setPreference(mode: ViewMode) {
    setPreferenceState(mode);
    try {
      window.localStorage.setItem(`oils-stock-vue-${cle}`, mode);
    } catch {
      // ignoré volontairement — la préférence s'applique quand même pour la session en cours.
    }
  }

  return { mode: isMobile ? "cartes" : preference, preference, isMobile, setPreference } as const;
}
