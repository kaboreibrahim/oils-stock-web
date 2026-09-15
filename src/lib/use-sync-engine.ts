"use client";

import { useEffect } from "react";

import { useAuth } from "./auth-context";
import { useConnectivity } from "./connectivity-context";
import { drainer, relancerEchecsReseau } from "./sync-engine";

// Même ordre de grandeur que la sonde de connectivité (25 s) — filet de
// sécurité périodique en plus du déclenchement par "oa:reconnecte".
const INTERVALLE_FILET_MS = 30_000;

/** Monté une fois (sans rendu) dans (app)/layout.tsx — déclenche la vidange
 *  de la file d'écriture hors-ligne au retour de connexion, plus un filet de
 *  sécurité périodique pour les échecs réseau en attente. */
export function useSyncEngine() {
  const { authFetch, user, status } = useAuth();
  const { enLigne } = useConnectivity();

  useEffect(() => {
    if (status !== "authenticated" || !user?.id) return;

    const lancer = () => {
      void drainer(authFetch, user.id);
    };

    // Vidange immédiate si des opérations traînent d'une session précédente.
    if (enLigne) lancer();

    const surReconnexion = () => {
      void relancerEchecsReseau(user.id).then(lancer);
    };
    window.addEventListener("oa:reconnecte", surReconnexion);

    const timer = setInterval(() => {
      if (enLigne) void relancerEchecsReseau(user.id).then(lancer);
    }, INTERVALLE_FILET_MS);

    return () => {
      window.removeEventListener("oa:reconnecte", surReconnexion);
      clearInterval(timer);
    };
  }, [authFetch, user?.id, status, enLigne]);
}
