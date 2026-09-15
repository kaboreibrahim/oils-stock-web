/* Service worker — notifications web push + cache hors-ligne (lecture seule).
   Étendu à la main, sans dépendance (pas de Serwist / next-pwa).
   - `push` / `notificationclick` : notifications web push.
   - `fetch` : coquille + assets en cache-first, GET API en network-first avec
     repli sur le cache. Aucune écriture (POST/PATCH/DELETE) n'est interceptée —
     la Phase 2 gère la file de synchronisation côté application. */

const CACHE_VERSION = "v2"; // doit suivre SW_VERSION dans src/lib/sw-register.ts
const SHELL_CACHE = `oa-shell-${CACHE_VERSION}`;
const API_CACHE = `oa-api-${CACHE_VERSION}`;
const API_MAX_ENTRIES = 64;
const NET_TIMEOUT_MS = 3500;

// Origine de l'API : passée à l'enregistrement (`/sw.js?api=…`), surchargeable
// à chaud par un message SET_API_BASE.
const REG_API_ORIGIN = (() => {
  try {
    const passe = new URL(self.location.href).searchParams.get("api");
    return passe ? new URL(passe).origin : self.location.origin;
  } catch {
    return self.location.origin;
  }
})();
let apiOriginOverride = null;
const apiOrigin = () => apiOriginOverride || REG_API_ORIGIN;

const PRECACHE = [
  "/",
  "/offline",
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-maskable-192.png",
  "/icon-maskable-512.png",
  "/apple-icon.png",
  "/oils-of-africa-logo.png",
];

// Jamais mis en cache (authentification + réponses binaires / volumineuses).
const API_BYPASS = [
  "/api/v1/auth/token/",
  "/api/v1/auth/token/refresh/",
  "/api/v1/auth/logout/",
  "/api/v1/notifications/cle-vapid-publique/",
];
const API_BYPASS_SUFFIX = ["/fichier/", "/export/"];
const HEALTH_PATH = "/api/health/";

// ------------------------------------------------------------------ install

self.addEventListener("install", (event) => {
  // Pas de skipWaiting() : une mise à jour attend le clic « Recharger »
  // (géré par PwaProvider). addEventListener échoue en bloc si une URL 404 —
  // le .catch garde l'installation fonctionnelle en mode dégradé.
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .catch(() => {}),
  );
});

// ----------------------------------------------------------------- activate

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cles = await caches.keys();
      await Promise.all(
        cles
          .filter((c) => c.startsWith("oa-") && !c.endsWith(CACHE_VERSION))
          .map((c) => caches.delete(c)),
      );
      await self.clients.claim();
    })(),
  );
});

// ------------------------------------------------------------------ message

self.addEventListener("message", (event) => {
  const d = event.data || {};
  if (d.type === "SKIP_WAITING") {
    self.skipWaiting();
  } else if (d.type === "CLEAR_API_CACHE") {
    event.waitUntil(caches.delete(API_CACHE));
  } else if (d.type === "SET_API_BASE" && d.base) {
    try {
      apiOriginOverride = new URL(d.base).origin;
    } catch {
      /* ignoré */
    }
  }
});

// -------------------------------------------------------------------- fetch

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // (1) Écritures : jamais interceptées (Phase 2, côté application).
  if (req.method !== "GET") return;

  // (2) Sonde de connectivité : toujours réseau direct, ni cache ni repli.
  if (url.origin === apiOrigin() && url.pathname === HEALTH_PATH) return;

  // (3) API v1 → network-first + repli cache.
  if (url.origin === apiOrigin() && url.pathname.startsWith("/api/v1/")) {
    if (API_BYPASS.some((p) => url.pathname.startsWith(p))) return;
    if (API_BYPASS_SUFFIX.some((s) => url.pathname.endsWith(s))) return;
    event.respondWith(apiNetworkFirst(req));
    return;
  }

  // (4) Au-delà : origine du front uniquement.
  if (url.origin !== self.location.origin) return;

  // (5) Assets immuables (hashés / stables) → cache-first.
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/_next/image") ||
    url.pathname === "/manifest.webmanifest" ||
    /\.(?:woff2?|ttf|otf|png|jpe?g|svg|webp|gif|ico)$/i.test(url.pathname)
  ) {
    event.respondWith(cacheFirst(req, SHELL_CACHE));
    return;
  }

  // (6) Navigations complètes (document HTML) → network-first, repli route
  // cachée puis /offline. Ne PAS traiter ici les requêtes RSC de navigation
  // client (mêmes URL que la page, réponse non-HTML) : les mettre en cache
  // sous la même clé écraserait le HTML mis en cache par une vraie navigation
  // (bug constaté : rechargement hors-ligne affichant le flux RSC brut). Une
  // requête RSC hors-ligne échoue simplement — acceptable, Next.js gère déjà
  // cet échec côté client (voir plan, "consultation des dernières données vues").
  if (req.mode === "navigate") {
    event.respondWith(navigation(req));
    return;
  }
  const estRSC = req.headers.get("RSC") === "1" || url.searchParams.has("_rsc");
  if (estRSC) return;

  // (7) sinon : fetch navigateur normal.
});

// --------------------------------------------------------------- stratégies

function fetchAvecTimeout(req, ms) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return fetch(req, { signal: ctrl.signal }).finally(() => clearTimeout(t));
}

// On ne peut pas muter les Headers d'une Response cachée → on la reconstruit.
async function avecEntetes(res, extra) {
  const corps = await res.clone().blob();
  const h = new Headers(res.headers);
  for (const cle of Object.keys(extra)) h.set(cle, extra[cle]);
  return new Response(corps, { status: res.status, statusText: res.statusText, headers: h });
}

async function apiNetworkFirst(req) {
  const cache = await caches.open(API_CACHE);
  try {
    const res = await fetchAvecTimeout(req, NET_TIMEOUT_MS);
    if (res && res.ok) {
      const marquee = await avecEntetes(res, { "X-OA-Cached-At": new Date().toISOString() });
      await cache.put(req, marquee);
      await trim(cache, API_MAX_ENTRIES);
      return res;
    }
    return res; // 4xx / 5xx réels passent tels quels
  } catch {
    const hit = await cache.match(req, { ignoreVary: true });
    if (hit) return avecEntetes(hit, { "X-OA-Offline": "1" });
    return new Response(
      JSON.stringify({
        detail: "Hors connexion — donnée non disponible localement.",
        offline: true,
      }),
      { status: 503, headers: { "Content-Type": "application/json", "X-OA-Offline": "1" } },
    );
  }
}

async function cacheFirst(req, nom) {
  const cache = await caches.open(nom);
  const hit = await cache.match(req, { ignoreVary: true });
  if (hit) return hit;
  const res = await fetch(req);
  if (res && res.ok && (res.type === "basic" || res.type === "opaque")) {
    cache.put(req, res.clone()).catch(() => {});
  }
  return res;
}

async function navigation(req) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const res = await fetch(req);
    if (res && res.ok) cache.put(req, res.clone()).catch(() => {});
    return res;
  } catch {
    const exact = await cache.match(req, { ignoreSearch: true, ignoreVary: true });
    if (exact) return exact;
    const offline = await cache.match("/offline");
    return (
      offline ||
      new Response("Hors connexion", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      })
    );
  }
}

async function trim(cache, max) {
  const cles = await cache.keys(); // ordre d'insertion (FIFO)
  for (let i = 0; i < cles.length - max; i += 1) await cache.delete(cles[i]);
}

// -------------------------------------------------------- push (inchangé)

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { titre: "Notification", corps: event.data.text() };
  }
  const titre = payload.titre || "Oils of Africa — Stock";
  event.waitUntil(
    self.registration.showNotification(titre, {
      body: payload.corps || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: payload.type || undefined,
      data: { url: payload.lien || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const cible = event.notification.data && event.notification.data.url ? event.notification.data.url : "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((fenetres) => {
      for (const fenetre of fenetres) {
        let chemin;
        try {
          chemin = new URL(fenetre.url).pathname;
        } catch {
          chemin = null;
        }
        if (chemin === cible && "focus" in fenetre) return fenetre.focus();
      }
      return self.clients.openWindow(cible);
    }),
  );
});
