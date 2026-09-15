// Client HTTP vers l'API Django (oils-stock-api). Le token JWT est passé
// explicitement par l'appelant — voir lib/auth-context.tsx pour la gestion
// du stockage et du rafraîchissement automatique.

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";
/** Préfixe de l'API versionnée — toutes les ressources métier vivent ici. */
export const API_V1 = `${API_URL}/api/v1`;

export type Role = "ADMIN" | "MAGASINIER" | "LECTURE";

export interface Me {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: Role;
  is_staff: boolean;
  is_superuser: boolean;
}

export interface Tokens {
  access: string;
  refresh: string;
}

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, body: unknown, message?: string) {
    super(message ?? `Erreur API (${status})`);
    this.status = status;
    this.body = body;
  }
}

async function parseBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** Vrai quand l'erreur vient d'une panne réseau (fetch qui échoue) ou d'un
 *  abandon — par opposition à une réponse HTTP d'erreur (ApiError). Sert à
 *  distinguer « hors connexion » de « session invalide » dans auth-context. */
export function estErreurReseau(e: unknown): boolean {
  return e instanceof TypeError || (e instanceof Error && e.name === "AbortError");
}

/** Message lisible à partir d'une erreur DRF/simplejwt classique. */
export function apiErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    const body = err.body;
    if (body && typeof body === "object") {
      const record = body as Record<string, unknown>;
      if (typeof record.detail === "string") return record.detail;
      const firstKey = Object.keys(record)[0];
      const firstVal = firstKey ? record[firstKey] : undefined;
      if (Array.isArray(firstVal) && typeof firstVal[0] === "string") return firstVal[0];
    }
  }
  return fallback;
}

export async function login(username: string, password: string): Promise<Tokens> {
  const res = await fetch(`${API_V1}/auth/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const data = await parseBody(res);
  if (!res.ok) throw new ApiError(res.status, data, "Identifiants incorrects");
  return data as Tokens;
}

export async function refreshAccessToken(refresh: string): Promise<Tokens> {
  const res = await fetch(`${API_V1}/auth/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });
  const data = await parseBody(res);
  if (!res.ok) throw new ApiError(res.status, data, "Session expirée");
  const parsed = data as { access: string; refresh?: string };
  return { access: parsed.access, refresh: parsed.refresh ?? refresh };
}

export async function fetchMe(accessToken: string): Promise<Me> {
  const res = await fetch(`${API_V1}/auth/me/`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await parseBody(res);
  if (!res.ok) throw new ApiError(res.status, data, "Impossible de récupérer l'utilisateur");
  return data as Me;
}

/** Révoque le refresh token côté serveur (liste noire). Best-effort : voir auth-context.tsx. */
export async function logout(accessToken: string, refresh: string): Promise<void> {
  const res = await fetch(`${API_V1}/auth/logout/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ refresh }),
  });
  if (!res.ok) throw new ApiError(res.status, await parseBody(res), "Déconnexion refusée");
}
