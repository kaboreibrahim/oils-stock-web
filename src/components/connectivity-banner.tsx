"use client";

import { RotateCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useConnectivity } from "@/lib/connectivity-context";

/** Bandeau plein largeur sous l'en-tête : visible hors connexion, flash vert
 *  bref au retour de la connexion, rien le reste du temps. En flux normal
 *  (pousse le contenu) — l'état permanent est porté par <ConnectivityDot/>. */
export function ConnectivityBanner() {
  const { etat, verifierMaintenant, operationsEnAttente, synchronisation } = useConnectivity();
  const [flashRetour, setFlashRetour] = useState(false);
  const precedentRef = useRef(etat);

  useEffect(() => {
    if (precedentRef.current === "hors_ligne" && etat === "en_ligne") {
      setFlashRetour(true);
      const t = setTimeout(() => setFlashRetour(false), 3000);
      precedentRef.current = etat;
      return () => clearTimeout(t);
    }
    precedentRef.current = etat;
  }, [etat]);

  if (etat === "hors_ligne") {
    return (
      <div className="oa-rise flex items-center justify-between gap-3 border-b border-warn/30 bg-warn-soft px-4 py-2 text-sm text-warn">
        <span>
          Vous êtes hors connexion. Les données affichées peuvent être anciennes.
          {operationsEnAttente > 0 ? ` — ${operationsEnAttente} modification(s) en attente d'envoi.` : null}
        </span>
        <button
          onClick={verifierMaintenant}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1 font-medium transition-colors hover:bg-warn/10"
        >
          <RotateCw className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
          Réessayer
        </button>
      </div>
    );
  }

  if (flashRetour) {
    return (
      <div className="oa-rise border-b border-ok/30 bg-ok-soft px-4 py-2 text-sm text-ok">
        {synchronisation ? "Connexion rétablie — synchronisation en cours…" : "Connexion rétablie."}
      </div>
    );
  }

  return null;
}
