import type { AuthFetch } from "./auth-context";

/** Télécharge un fichier binaire via `authFetch` (l'endpoint exige un jeton
 * JWT, un simple `<a href>` ne suffit pas) — même pattern que le bon de
 * sortie PDF (sorties/[id]/page.tsx). Renvoie un message d'erreur (à afficher
 * par l'appelant) ou `null` si le téléchargement a réussi. */
export async function telechargerFichier(
  authFetch: AuthFetch,
  chemin: string,
  nomFichier: string,
): Promise<string | null> {
  const res = await authFetch(chemin);
  if (!res.ok) return `Erreur ${res.status} lors du téléchargement.`;
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomFichier;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return null;
}

/** Nom de fichier daté du jour, cohérent avec celui posé côté API
 * (apps.common.exports.exporter_csv). */
export function nomFichierDateDuJour(prefixe: string, extension: string): string {
  const aujourdhui = new Date().toISOString().slice(0, 10);
  return `${prefixe}-${aujourdhui}.${extension}`;
}
