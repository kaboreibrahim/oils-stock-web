"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLiveQuery } from "dexie-react-hooks";

import { API_URL } from "./api";
import { db } from "./offline-db";

export type EtatConnexion = "en_ligne" | "hors_ligne" | "verification";

interface ConnectivityState {
  etat: EtatConnexion;
  /** Faux uniquement quand on est certain d'être hors connexion. */
  enLigne: boolean;
  verifierMaintenant: () => void;
  /** Opérations d'écriture hors-ligne en attente/en cours/en échec (Phase 2). */
  operationsEnAttente: number;
  synchronisation: boolean;
}

const ConnectivityContext = createContext<ConnectivityState | null>(null);

const INTERVALLE_SONDE_MS = 25_000;
const TIMEOUT_SONDE_MS = 2500;
const URL_SONDE = `${API_URL}/api/health/`;

/** Un GET rapide sur /api/health/ : le service worker le laisse passer, donc
 *  le résultat reflète le vrai état du réseau (et pas un cache). */
async function sonder(): Promise<boolean> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_SONDE_MS);
  try {
    const res = await fetch(URL_SONDE, { cache: "no-store", signal: ctrl.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}

export function ConnectivityProvider({ children }: { children: ReactNode }) {
  const [etat, setEtat] = useState<EtatConnexion>("en_ligne");
  const etatRef = useRef<EtatConnexion>("en_ligne");
  const echecsRef = useRef(0);
  const sondeEnCoursRef = useRef(false);

  const majEtat = useCallback((suivant: EtatConnexion) => {
    const precedent = etatRef.current;
    etatRef.current = suivant;
    setEtat(suivant);
    if (precedent === "hors_ligne" && suivant === "en_ligne") {
      window.dispatchEvent(new CustomEvent("oa:reconnecte"));
    }
  }, []);

  const lancerSonde = useCallback(async () => {
    if (sondeEnCoursRef.current) return;
    sondeEnCoursRef.current = true;
    try {
      const ok = await sonder();
      if (ok) {
        echecsRef.current = 0;
        majEtat("en_ligne");
        return;
      }
      echecsRef.current += 1;
      // Depuis « en ligne », il faut 2 échecs d'affilée pour basculer
      // (anti-clignotement) ; le 1er échec ne fait que passer en « vérification ».
      if (etatRef.current === "en_ligne" && echecsRef.current < 2) {
        majEtat("verification");
      } else {
        majEtat("hors_ligne");
      }
    } finally {
      sondeEnCoursRef.current = false;
    }
  }, [majEtat]);

  const verifierMaintenant = useCallback(() => {
    void lancerSonde();
  }, [lancerSonde]);

  useEffect(() => {
    // Correction de l'état initial après hydratation.
    (async () => {
      if (!navigator.onLine) {
        majEtat("hors_ligne");
      } else {
        await lancerSonde();
      }
    })();

    const surOnline = () => {
      majEtat("verification");
      void lancerSonde();
    };
    const surOffline = () => {
      echecsRef.current = 2;
      majEtat("hors_ligne");
    };
    const surTick = () => {
      if (document.visibilityState === "visible") void lancerSonde();
    };

    window.addEventListener("online", surOnline);
    window.addEventListener("offline", surOffline);
    const timer = setInterval(surTick, INTERVALLE_SONDE_MS);
    document.addEventListener("visibilitychange", surTick);

    return () => {
      window.removeEventListener("online", surOnline);
      window.removeEventListener("offline", surOffline);
      clearInterval(timer);
      document.removeEventListener("visibilitychange", surTick);
    };
  }, [lancerSonde, majEtat]);

  const operationsEnAttente =
    useLiveQuery(
      () => db.operations.where("statut").anyOf(["en_attente", "en_cours", "echec"]).count(),
      [],
      0,
    ) ?? 0;
  const synchronisation =
    (useLiveQuery(() => db.operations.where("statut").equals("en_cours").count(), [], 0) ?? 0) > 0;

  return (
    <ConnectivityContext.Provider
      value={{ etat, enLigne: etat !== "hors_ligne", verifierMaintenant, operationsEnAttente, synchronisation }}
    >
      {children}
    </ConnectivityContext.Provider>
  );
}

export function useConnectivity(): ConnectivityState {
  const ctx = useContext(ConnectivityContext);
  if (!ctx) throw new Error("useConnectivity() doit être appelé sous <ConnectivityProvider>.");
  return ctx;
}
