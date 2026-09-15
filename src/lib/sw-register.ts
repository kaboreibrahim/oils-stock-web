import { API_URL } from "./api";

// ⇧ Incrémenter à chaque changement de logique dans public/sw.js. La valeur est
// injectée dans l'URL du script (`/sw.js?v=…`), ce qui force le navigateur à
// réinstaller le service worker au déploiement. Doit rester synchronisé avec
// CACHE_VERSION dans public/sw.js.
export const SW_VERSION = "2";

let regPromise: Promise<ServiceWorkerRegistration | null> | null = null;

/** URL du script SW, avec la version et l'origine de l'API en query string : le
 *  fichier statique ne peut pas lire process.env, on la lui passe donc ici. */
export function swScriptUrl(): string {
  let apiOrigin = "";
  try {
    apiOrigin = new URL(API_URL).origin;
  } catch {
    apiOrigin = "";
  }
  return `/sw.js?v=${SW_VERSION}&api=${encodeURIComponent(apiOrigin)}`;
}

/** Enregistre le service worker une seule fois par page (promesse mémoïsée).
 *  Renvoie null quand le SW est indisponible (SSR, pas de contexte sécurisé —
 *  ex. IP LAN en HTTP pour /scan). */
export function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (regPromise) return regPromise;
  regPromise = (async () => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
    if (typeof window === "undefined" || !window.isSecureContext) return null;
    try {
      return await navigator.serviceWorker.register(swScriptUrl(), {
        scope: "/",
        updateViaCache: "none",
      });
    } catch {
      return null;
    }
  })();
  return regPromise;
}

/** Comme registerServiceWorker() mais attend l'activation — sans passer par
 *  navigator.serviceWorker.ready (indisponible en contexte worker / headless).
 *  Repli à 3 s pour ne jamais bloquer indéfiniment. */
export async function serviceWorkerActif(): Promise<ServiceWorkerRegistration | null> {
  const reg = await registerServiceWorker();
  if (!reg || reg.active) return reg;
  await new Promise<void>((resolve) => {
    const sw = reg.installing ?? reg.waiting;
    if (!sw) {
      resolve();
      return;
    }
    const surChangement = () => {
      if (sw.state === "activated") {
        sw.removeEventListener("statechange", surChangement);
        resolve();
      }
    };
    sw.addEventListener("statechange", surChangement);
    setTimeout(resolve, 3000);
  });
  return reg;
}
