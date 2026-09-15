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

import { registerServiceWorker } from "./sw-register";

// `beforeinstallprompt` n'est pas dans la lib DOM standard (Chromium seulement).
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt: () => Promise<void>;
}

type Plateforme = "ios" | "autre";
export type ResultatInstall = "accepted" | "dismissed" | "indisponible" | "ios";

interface MemoireRefus {
  dismissedAt: number;
  count: number;
}

const CLE_REFUS = "oils-stock-install";
const REPROPOSER_APRES_MS = 7 * 24 * 60 * 60 * 1000;

interface PwaState {
  /** Un `beforeinstallprompt` a été capturé (Chromium) : l'invite native est jouable. */
  estInstallable: boolean;
  /** L'app tourne déjà en mode autonome (installée). */
  estInstallee: boolean;
  plateforme: Plateforme;
  promptInstall: () => Promise<ResultatInstall>;
  /** L'utilisateur a-t-il refusé récemment (moins de 7 jours) ? */
  refusRecemment: boolean;
  memoriserRefus: () => void;
  majDisponible: boolean;
  appliquerMaj: () => void;
}

const PwaContext = createContext<PwaState | null>(null);

function lireMemoire(): MemoireRefus | null {
  if (typeof window === "undefined") return null;
  try {
    const brut = window.localStorage.getItem(CLE_REFUS);
    return brut ? (JSON.parse(brut) as MemoireRefus) : null;
  } catch {
    return null;
  }
}

function ecrireMemoire(m: MemoireRefus) {
  try {
    window.localStorage.setItem(CLE_REFUS, JSON.stringify(m));
  } catch {
    /* stockage indisponible — sans gravité */
  }
}

export function PwaProvider({ children }: { children: ReactNode }) {
  const [estInstallable, setEstInstallable] = useState(false);
  const [estInstallee, setEstInstallee] = useState(false);
  const [plateforme, setPlateforme] = useState<Plateforme>("autre");
  const [refusRecemment, setRefusRecemment] = useState(false);
  const [majDisponible, setMajDisponible] = useState(false);
  const deferredRef = useRef<BeforeInstallPromptEvent | null>(null);
  const regRef = useRef<ServiceWorkerRegistration | null>(null);

  // Détection plateforme / mode autonome + mémoire de refus (une fois au montage).
  useEffect(() => {
    (async () => {
      const ua = navigator.userAgent || "";
      const ios =
        /iPad|iPhone|iPod/.test(ua) &&
        !(window as unknown as { MSStream?: unknown }).MSStream;
      setPlateforme(ios ? "ios" : "autre");

      const autonome =
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as unknown as { standalone?: boolean }).standalone === true;
      setEstInstallee(autonome);

      const m = lireMemoire();
      if (m && m.dismissedAt !== Infinity && Date.now() - m.dismissedAt < REPROPOSER_APRES_MS) {
        setRefusRecemment(true);
      }
    })();
  }, []);

  // Capture beforeinstallprompt / appinstalled.
  useEffect(() => {
    const surPrompt = (e: Event) => {
      e.preventDefault();
      deferredRef.current = e as BeforeInstallPromptEvent;
      setEstInstallable(true);
    };
    const surInstalle = () => {
      deferredRef.current = null;
      setEstInstallable(false);
      setEstInstallee(true);
      ecrireMemoire({ dismissedAt: Infinity, count: 0 });
    };
    window.addEventListener("beforeinstallprompt", surPrompt);
    window.addEventListener("appinstalled", surInstalle);
    return () => {
      window.removeEventListener("beforeinstallprompt", surPrompt);
      window.removeEventListener("appinstalled", surInstalle);
    };
  }, []);

  // Enregistrement du SW + flux de mise à jour.
  useEffect(() => {
    let recharge = false;
    const surControllerChange = () => {
      if (recharge) return;
      recharge = true;
      window.location.reload();
    };

    (async () => {
      const reg = await registerServiceWorker();
      if (!reg) return;
      regRef.current = reg;

      if (reg.waiting && navigator.serviceWorker.controller) setMajDisponible(true);

      reg.addEventListener("updatefound", () => {
        const sw = reg.installing;
        if (!sw) return;
        sw.addEventListener("statechange", () => {
          if (sw.state === "installed" && navigator.serviceWorker.controller) {
            setMajDisponible(true);
          }
        });
      });

      navigator.serviceWorker.addEventListener("controllerchange", surControllerChange);
    })();

    return () => {
      navigator.serviceWorker?.removeEventListener?.("controllerchange", surControllerChange);
    };
  }, []);

  const memoriserRefus = useCallback(() => {
    const precedent = lireMemoire();
    ecrireMemoire({
      dismissedAt: Date.now(),
      count: (precedent?.count ?? 0) + 1,
    });
    setRefusRecemment(true);
  }, []);

  const promptInstall = useCallback(async (): Promise<ResultatInstall> => {
    const evt = deferredRef.current;
    if (evt) {
      await evt.prompt();
      const { outcome } = await evt.userChoice;
      deferredRef.current = null;
      setEstInstallable(false);
      if (outcome === "accepted") {
        ecrireMemoire({ dismissedAt: Infinity, count: 0 });
      } else {
        memoriserRefus();
      }
      return outcome;
    }
    return plateforme === "ios" ? "ios" : "indisponible";
  }, [plateforme, memoriserRefus]);

  const appliquerMaj = useCallback(() => {
    regRef.current?.waiting?.postMessage({ type: "SKIP_WAITING" });
  }, []);

  return (
    <PwaContext.Provider
      value={{
        estInstallable,
        estInstallee,
        plateforme,
        promptInstall,
        refusRecemment,
        memoriserRefus,
        majDisponible,
        appliquerMaj,
      }}
    >
      {children}
    </PwaContext.Provider>
  );
}

export function usePwa(): PwaState {
  const ctx = useContext(PwaContext);
  if (!ctx) throw new Error("usePwa() doit être appelé sous <PwaProvider>.");
  return ctx;
}
