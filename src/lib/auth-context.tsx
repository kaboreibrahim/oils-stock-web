"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { Toast, type FlashMessage } from "@/components/toast";

import {
  API_V1,
  estErreurReseau,
  fetchMe,
  login as apiLogin,
  logout as apiLogout,
  refreshAccessToken,
  type Me,
  type Role,
  type Tokens,
} from "./api";

const STORAGE_KEY = "oils-stock-auth";
const USER_KEY = "oils-stock-user";
const FLASH_DURATION_MS = 4000;

type Status = "loading" | "authenticated" | "anonymous";

/** fetch() vers l'API v1 (ex. "/fournisseurs/"), Authorization + rafraîchissement automatique inclus. */
export type AuthFetch = (path: string, init?: RequestInit) => Promise<Response>;

interface AuthState {
  status: Status;
  user: Me | null;
  login: (username: string, password: string) => Promise<void>;
  /** Révoque la session côté serveur en best-effort, puis efface toujours l'état local. */
  logout: () => Promise<void>;
  authFetch: AuthFetch;
}

const AuthContext = createContext<AuthState | null>(null);

function readTokens(): Tokens | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Tokens) : null;
  } catch {
    return null;
  }
}

function writeTokens(tokens: Tokens | null) {
  if (typeof window === "undefined") return;
  if (tokens) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
  else window.localStorage.removeItem(STORAGE_KEY);
}

// Profil mis en cache pour permettre une reprise de session hors connexion :
// au démarrage à froid sans réseau, fetchMe() échoue, on repart alors sur ce
// profil sans effacer les jetons (voir l'effet d'hydratation).
function readCachedUser(): Me | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as Me) : null;
  } catch {
    return null;
  }
}

function writeCachedUser(me: Me | null) {
  if (typeof window === "undefined") return;
  if (me) window.localStorage.setItem(USER_KEY, JSON.stringify(me));
  else window.localStorage.removeItem(USER_KEY);
}

/** Profil minimal reconstruit quand des jetons existent mais qu'aucun profil
 *  n'a jamais été mis en cache (ancienne installation) et que le réseau est
 *  coupé : l'app s'affiche en lecture seule, un re-fetchMe à la reconnexion
 *  remettra le vrai profil. */
function utilisateurMinimal(): Me {
  return {
    id: "",
    username: "",
    email: "",
    first_name: "",
    last_name: "",
    role: "LECTURE" as Role,
    is_staff: false,
    is_superuser: false,
  };
}

/** Demande au service worker de vider le cache des réponses API (par
 *  utilisateur) — à la connexion (autre compte possible) et à la déconnexion. */
function viderCacheApiSW() {
  if (typeof navigator === "undefined") return;
  navigator.serviceWorker?.controller?.postMessage({ type: "CLEAR_API_CACHE" });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [tokens, setTokens] = useState<Tokens | null>(null);
  const [user, setUser] = useState<Me | null>(null);
  // "anonymous" d'emblée s'il n'y a rien à reprendre — évite un setState
  // synchrone dans l'effet ci-dessous pour ce cas.
  const [status, setStatus] = useState<Status>(() => (readTokens() ? "loading" : "anonymous"));
  const [flash, setFlash] = useState<FlashMessage | null>(null);

  // Disparaît tout seul après quelques secondes.
  useEffect(() => {
    if (!flash) return;
    const timer = setTimeout(() => setFlash(null), FLASH_DURATION_MS);
    return () => clearTimeout(timer);
  }, [flash]);

  // Vrai quand la session a été reprise depuis le cache sans que fetchMe ait pu
  // aboutir (réseau coupé au démarrage) : on retente une vérification dès le
  // retour de la connexion.
  const sessionNonVerifiee = useRef(false);

  // Hydratation au chargement : reprend une session depuis le localStorage,
  // rafraîchit le token si besoin. Une panne réseau ne déconnecte JAMAIS — on
  // repart sur le profil mis en cache. Seule une erreur d'authentification
  // réelle (401/403) efface la session. Pas de message de bienvenue ici.
  useEffect(() => {
    const stored = readTokens();
    if (!stored) return;
    const cachedUser = readCachedUser();
    let cancelled = false;

    const appliquer = (t: Tokens, me: Me, nonVerifiee = false) => {
      if (cancelled) return;
      sessionNonVerifiee.current = nonVerifiee;
      setTokens(t);
      setUser(me);
      setStatus("authenticated");
      if (!nonVerifiee) writeCachedUser(me);
    };

    (async () => {
      try {
        const me = await fetchMe(stored.access);
        appliquer(stored, me);
      } catch (e1) {
        if (estErreurReseau(e1)) {
          appliquer(stored, cachedUser ?? utilisateurMinimal(), true);
          return;
        }
        try {
          const next = await refreshAccessToken(stored.refresh);
          const me = await fetchMe(next.access);
          if (cancelled) return;
          writeTokens(next);
          appliquer(next, me);
        } catch (e2) {
          if (estErreurReseau(e2)) {
            if (cachedUser) appliquer(stored, cachedUser, true);
            return;
          }
          if (cancelled) return;
          writeTokens(null);
          writeCachedUser(null);
          setStatus("anonymous");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Au retour de la connexion, si la session n'a pas encore été vérifiée
  // côté serveur, on retente fetchMe pour récupérer le vrai profil.
  useEffect(() => {
    const surReconnexion = () => {
      if (!sessionNonVerifiee.current) return;
      const stored = readTokens();
      if (!stored) return;
      (async () => {
        try {
          const me = await fetchMe(stored.access);
          sessionNonVerifiee.current = false;
          setUser(me);
          writeCachedUser(me);
        } catch {
          /* toujours hors ligne ou jeton expiré — on laisse authFetch gérer */
        }
      })();
    };
    window.addEventListener("online", surReconnexion);
    window.addEventListener("oa:reconnecte", surReconnexion);
    return () => {
      window.removeEventListener("online", surReconnexion);
      window.removeEventListener("oa:reconnecte", surReconnexion);
    };
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const t = await apiLogin(username, password);
    const me = await fetchMe(t.access);
    // Compte potentiellement différent du précédent : on purge le cache API du SW.
    viderCacheApiSW();
    writeTokens(t);
    writeCachedUser(me);
    sessionNonVerifiee.current = false;
    setTokens(t);
    setUser(me);
    setStatus("authenticated");
    setFlash({ type: "success", text: `Bienvenue, ${me.username} !` });
  }, []);

  const logout = useCallback(async () => {
    const username = user?.username;
    viderCacheApiSW();
    // Révocation best-effort : la session doit se fermer côté client même si
    // l'appel réseau échoue (backend injoignable, jeton déjà expiré...).
    if (tokens) {
      try {
        await apiLogout(tokens.access, tokens.refresh);
      } catch {
        // ignoré volontairement
      }
    }
    writeTokens(null);
    writeCachedUser(null);
    sessionNonVerifiee.current = false;
    setTokens(null);
    setUser(null);
    setStatus("anonymous");
    setFlash({ type: "info", text: username ? `À bientôt, ${username} !` : "Vous êtes déconnecté." });
  }, [tokens, user]);

  const authFetch = useCallback(
    async (path: string, init: RequestInit = {}) => {
      if (!tokens) {
        return fetch(`${API_V1}${path}`, init);
      }
      const withAuth = (accessToken: string) =>
        fetch(`${API_V1}${path}`, {
          ...init,
          headers: { ...(init.headers ?? {}), Authorization: `Bearer ${accessToken}` },
        });

      let res = await withAuth(tokens.access);
      if (res.status === 401) {
        try {
          const next = await refreshAccessToken(tokens.refresh);
          writeTokens(next);
          setTokens(next);
          res = await withAuth(next.access);
        } catch (e) {
          // Réseau coupé pendant le rafraîchissement : on garde la session
          // (le SW sert souvent une réponse en cache de toute façon). Seul un
          // refus réel du serveur ferme la session.
          if (!estErreurReseau(e)) logout();
        }
      }
      return res;
    },
    [tokens, logout],
  );

  const value = useMemo<AuthState>(
    () => ({ status, user, login, logout, authFetch }),
    [status, user, login, logout, authFetch],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      <Toast message={flash} onDismiss={() => setFlash(null)} />
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth() doit être appelé sous <AuthProvider>.");
  return ctx;
}
