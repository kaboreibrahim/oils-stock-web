"use client";

import { useEffect, useRef } from "react";

/** Fait fermer un overlay (tiroir, modale, bottom-sheet, popover) par le bouton
 *  retour d'Android / le geste de retour d'iOS, au lieu de quitter l'écran.
 *
 *  Empile une entrée d'historique sentinelle à l'ouverture ; `popstate` la
 *  consomme et appelle `onClose`. À la fermeture programmatique (croix, fond,
 *  Échap), on retire notre entrée si elle est encore au sommet.
 *
 *  `onClose` est lu via une ref : l'effet ne dépend que de `open`, donc un
 *  callback non mémoïsé ne relance pas le cycle empiler/dépiler. Les overlays
 *  imbriqués empilent/dépilent chacun leur sentinelle en LIFO. */
export function useOverlayHistory(open: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  const empileeRef = useRef(false);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    window.history.pushState({ __oaOverlay: true }, "");
    empileeRef.current = true;

    const surPop = () => {
      empileeRef.current = false;
      onCloseRef.current();
    };
    window.addEventListener("popstate", surPop);

    return () => {
      window.removeEventListener("popstate", surPop);
      if (empileeRef.current) {
        empileeRef.current = false;
        window.history.back();
      }
    };
  }, [open]);
}
