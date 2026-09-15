// Types et libellés partagés des mouvements de stock — utilisés par le tableau
// de bord ((app)/page.tsx) et la fiche fournisseur ((app)/fournisseurs/[id]).

export type TypeMouvement =
  | "ENTREE"
  | "SORTIE"
  | "RETOUR"
  | "ANNULATION_ENTREE"
  | "ANNULATION_SORTIE";

export interface Mouvement {
  id: string;
  numero_serie: string;
  type_mouvement: TypeMouvement;
  date_mouvement: string;
  sortie_reference: string | null;
  reception_reference: string | null;
}

export const MOUVEMENT_LABELS: Record<TypeMouvement, string> = {
  ENTREE: "Entrée",
  SORTIE: "Sortie",
  RETOUR: "Retour",
  ANNULATION_ENTREE: "Annulation d'entrée",
  ANNULATION_SORTIE: "Annulation de sortie",
};

// Rouge = sortie de stock, vert = unité disponible/de retour — voir la palette
// sémantique documentée dans le README (§ Direction visuelle).
export const MOUVEMENT_TONES: Record<TypeMouvement, "ok" | "crit" | "neutral"> = {
  ENTREE: "ok",
  SORTIE: "crit",
  RETOUR: "ok",
  ANNULATION_ENTREE: "neutral",
  ANNULATION_SORTIE: "neutral",
};
