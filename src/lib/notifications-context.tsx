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

import { Toast, type FlashMessage } from "@/components/toast";

import { useAuth } from "./auth-context";
import { activerPush as activerPushImpl, desactiverPush as desactiverPushImpl, etatPush, type EtatPush } from "./push";

export type TypeNotification =
  | "MOUVEMENT_ENTREE"
  | "MOUVEMENT_SORTIE"
  | "SEUIL_ATTEINT"
  | "STOCK_EPUISE";

export interface NotificationApi {
  id: string;
  type: TypeNotification;
  titre: string;
  corps: string;
  lien: string;
  lu: boolean;
  lu_le: string | null;
  created_at: string;
}

interface NotificationsState {
  notifications: NotificationApi[];
  nonLus: number;
  pushEtat: EtatPush;
  rafraichir: () => Promise<void>;
  marquerLu: (id: string) => Promise<void>;
  marquerToutLu: () => Promise<void>;
  activerPush: () => Promise<void>;
  desactiverPush: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsState | null>(null);

const INTERVALLE_MS = 50_000;
const FLASH_MS = 4000;

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { status, authFetch } = useAuth();
  const [notifications, setNotifications] = useState<NotificationApi[]>([]);
  const [nonLus, setNonLus] = useState(0);
  const [pushEtat, setPushEtat] = useState<EtatPush>("inactif");
  const [flash, setFlash] = useState<FlashMessage | null>(null);
  const nonLusRef = useRef(0);

  useEffect(() => {
    nonLusRef.current = nonLus;
  }, [nonLus]);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), FLASH_MS);
    return () => clearTimeout(t);
  }, [flash]);

  const rafraichir = useCallback(async () => {
    // Séquentiel, jamais Promise.all : deux 401 concurrents feraient deux
    // rafraîchissements de jeton qui se marcheraient dessus (rotation + liste
    // noire côté API) — même raison que la séquence du tableau de bord.
    const liste = await authFetch("/notifications/?page_size=20");
    if (liste.ok) {
      const data = (await liste.json()) as { results: NotificationApi[] };
      setNotifications(data.results);
    }
    const compteur = await authFetch("/notifications/non-lus/");
    if (compteur.ok) {
      const { count } = (await compteur.json()) as { count: number };
      setNonLus(count);
    }
  }, [authFetch]);

  const verifierNonLus = useCallback(async () => {
    if (typeof document !== "undefined" && document.hidden) return;
    const res = await authFetch("/notifications/non-lus/");
    if (!res.ok) return;
    const { count } = (await res.json()) as { count: number };
    if (count > nonLusRef.current) {
      await rafraichir();
      setNotifications((liste) => {
        const derniere = liste.find((n) => !n.lu);
        if (derniere) setFlash({ type: "info", text: derniere.titre });
        return liste;
      });
    } else {
      setNonLus(count);
    }
  }, [authFetch, rafraichir]);

  useEffect(() => {
    if (status !== "authenticated") return;
    let annule = false;

    (async () => {
      await rafraichir();
      if (!annule) setPushEtat(await etatPush());
    })();

    const timer = setInterval(verifierNonLus, INTERVALLE_MS);
    const surFocus = () => verifierNonLus();
    window.addEventListener("focus", surFocus);
    document.addEventListener("visibilitychange", surFocus);

    return () => {
      annule = true;
      clearInterval(timer);
      window.removeEventListener("focus", surFocus);
      document.removeEventListener("visibilitychange", surFocus);
    };
  }, [status, rafraichir, verifierNonLus]);

  const marquerLu = useCallback(
    async (id: string) => {
      setNotifications((liste) => liste.map((n) => (n.id === id ? { ...n, lu: true } : n)));
      setNonLus((n) => Math.max(0, n - 1));
      await authFetch(`/notifications/${id}/marquer-lu/`, { method: "POST" });
    },
    [authFetch],
  );

  const marquerToutLu = useCallback(async () => {
    setNotifications((liste) => liste.map((n) => ({ ...n, lu: true })));
    setNonLus(0);
    await authFetch("/notifications/marquer-tout-lu/", { method: "POST" });
  }, [authFetch]);

  const activerPush = useCallback(async () => {
    const etat = await activerPushImpl(authFetch);
    setPushEtat(etat);
    setFlash({
      type: etat === "actif" ? "success" : "info",
      text:
        etat === "actif"
          ? "Notifications activées sur cet appareil."
          : etat === "indisponible"
            ? "Notifications navigateur indisponibles ici (HTTPS requis)."
            : "Permission refusée — notifications navigateur non activées.",
    });
  }, [authFetch]);

  const desactiverPush = useCallback(async () => {
    setPushEtat(await desactiverPushImpl(authFetch));
    setFlash({ type: "info", text: "Notifications navigateur désactivées sur cet appareil." });
  }, [authFetch]);

  if (status !== "authenticated") return <>{children}</>;

  return (
    <NotificationsContext.Provider
      value={{ notifications, nonLus, pushEtat, rafraichir, marquerLu, marquerToutLu, activerPush, desactiverPush }}
    >
      {children}
      <Toast message={flash} onDismiss={() => setFlash(null)} />
    </NotificationsContext.Provider>
  );
}

export function useNotifications(): NotificationsState {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications() doit être appelé sous <NotificationProvider>.");
  return ctx;
}
