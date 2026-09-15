import type { AuthFetch } from "./auth-context";
import { serviceWorkerActif } from "./sw-register";

export type EtatPush = "indisponible" | "inactif" | "actif";

/** Le web push exige un contexte sécurisé : OK sur localhost et en HTTPS,
 *  KO sur une IP LAN en HTTP simple (comme la caméra du scan). */
export function pushDisponible(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window &&
    window.isSecureContext
  );
}

function base64UrlVersBuffer(base64: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normal = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const brut = window.atob(normal);
  const buffer = new ArrayBuffer(brut.length);
  const vue = new Uint8Array(buffer);
  for (let i = 0; i < brut.length; i += 1) vue[i] = brut.charCodeAt(i);
  return buffer;
}

export async function enregistrerServiceWorker(): Promise<ServiceWorkerRegistration> {
  // Délègue au singleton partagé (sw-register.ts) : le SW est déjà enregistré
  // au chargement par PwaProvider, on ne veut pas d'un second register concurrent.
  const reg = await serviceWorkerActif();
  if (!reg) throw new Error("Service worker indisponible");
  return reg;
}

export async function etatPush(): Promise<EtatPush> {
  if (!pushDisponible()) return "indisponible";
  if (Notification.permission !== "granted") return "inactif";
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    return sub ? "actif" : "inactif";
  } catch {
    return "inactif";
  }
}

export async function activerPush(authFetch: AuthFetch): Promise<EtatPush> {
  if (!pushDisponible()) return "indisponible";

  const reg = await enregistrerServiceWorker();

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return "inactif";

  const cleRes = await authFetch("/notifications/cle-vapid-publique/");
  if (!cleRes.ok) return "inactif";
  const { cle } = (await cleRes.json()) as { cle: string };
  if (!cle) return "inactif";

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlVersBuffer(cle),
    });
  }

  const json = sub.toJSON();
  await authFetch("/notifications/abonnements/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys, user_agent: navigator.userAgent }),
  });
  return "actif";
}

export async function desactiverPush(authFetch: AuthFetch): Promise<EtatPush> {
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await authFetch(`/notifications/abonnements/?endpoint=${encodeURIComponent(sub.endpoint)}`, {
        method: "DELETE",
      });
      await sub.unsubscribe();
    }
  } catch {
    // best-effort : on repasse « inactif » quoi qu'il arrive
  }
  return "inactif";
}
