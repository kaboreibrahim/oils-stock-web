import Dexie, { type EntityTable } from "dexie";

// Écriture hors-ligne (Phase 2 PWA) — file locale des opérations en attente,
// entièrement séparée du cache de lecture du service worker (Cache Storage,
// voir public/sw.js) : les deux mécanismes coexistent sans conflit.

export type TypeOperation =
  | "sortie.creer"
  | "sortie.ligne.ajouter"
  | "sortie.ligne.retirer"
  | "reception.creer"
  | "reception.ligne.ajouter"
  | "reception.ligne.retirer"
  | "reception.plage.generer"
  | "client.creer"
  | "client.modifier"
  | "fournisseur.creer"
  | "fournisseur.modifier";

export type RessourceType = "sortie" | "reception" | "client" | "fournisseur";
export type StatutOperation = "en_attente" | "en_cours" | "synchronise" | "echec";

export interface OperationEnAttente {
  /** Clé d'idempotence — crypto.randomUUID(), aussi clé primaire Dexie. */
  id: string;
  /** Scope par compte : voir la note multi-compte dans sync-engine.ts. */
  utilisateurId: string;
  type: TypeOperation;
  ressourceType: RessourceType;
  /** Id SERVEUR réel du parent déjà synchronisé (lignes/PATCH) — absent pour une création. */
  parentId?: string;
  methode: "POST" | "PATCH" | "DELETE";
  /** Relatif à API_V1, ex. "/sorties/" ou "/sorties/{id}/lignes/{ligneId}/". */
  chemin: string;
  /** JSON à envoyer (absent pour DELETE). */
  corps?: unknown;
  /** Snapshot d'affichage pour une création en attente (carte de liste). */
  apercu?: Record<string, unknown>;
  statut: StatutOperation;
  /** "reseau" seul est retenté automatiquement par le filet de sécurité périodique. */
  erreurType?: "reseau" | "serveur";
  erreur?: string;
  tentatives: number;
  deviceId: string;
  dateCreation: number;
  dateMaj: number;
}

const db = new Dexie("oils-stock-offline") as Dexie & {
  operations: EntityTable<OperationEnAttente, "id">;
};

db.version(1).stores({
  operations: "id, statut, ressourceType, utilisateurId, dateCreation, [ressourceType+parentId]",
});

export { db };
