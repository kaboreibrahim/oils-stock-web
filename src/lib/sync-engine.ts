import type { AuthFetch } from "./auth-context";
import { estErreurReseau } from "./api";
import { db, type OperationEnAttente } from "./offline-db";

// Vidange strictement séquentielle — jamais Promise.all sur des appels
// réseau, même convention que authFetch() (voir le commentaire dans
// clients/[id]/page.tsx et fournisseurs/[id]/page.tsx à propos du refresh de
// jeton concurrent).
let drainageEnCours = false;

export async function drainer(authFetch: AuthFetch, utilisateurId: string): Promise<void> {
  if (drainageEnCours) return;
  drainageEnCours = true;
  try {
    let operation = await prochaineOperation(utilisateurId);
    while (operation) {
      await db.operations.update(operation.id, { statut: "en_cours", dateMaj: Date.now() });
      try {
        const res = await authFetch(operation.chemin, {
          method: operation.methode,
          headers: {
            ...(operation.corps !== undefined ? { "Content-Type": "application/json" } : {}),
            "Idempotency-Key": operation.id,
          },
          body: operation.corps !== undefined ? JSON.stringify(operation.corps) : undefined,
        });
        if (res.ok) {
          await db.operations.update(operation.id, { statut: "synchronise", dateMaj: Date.now() });
          diffuserChangement(operation);
        } else {
          const data = await res.json().catch(() => null);
          const message = Array.isArray(data?.detail) ? data.detail[0] : `Erreur ${res.status}`;
          await db.operations.update(operation.id, {
            statut: "echec",
            erreurType: "serveur",
            erreur: message,
            tentatives: operation.tentatives + 1,
            dateMaj: Date.now(),
          });
          // Échec MÉTIER (400/403/404) : ne bloque pas la file — les opérations
          // suivantes (une autre sortie, un autre client…) sont indépendantes.
        }
      } catch (e) {
        await db.operations.update(operation.id, {
          statut: "echec",
          erreurType: "reseau",
          erreur: estErreurReseau(e) ? "Hors connexion" : String(e),
          tentatives: operation.tentatives + 1,
          dateMaj: Date.now(),
        });
        break; // panne réseau en cours de vidage : on s'arrête, la prochaine reconnexion reprendra
      }
      operation = await prochaineOperation(utilisateurId);
    }
  } finally {
    drainageEnCours = false;
  }
}

async function prochaineOperation(utilisateurId: string): Promise<OperationEnAttente | undefined> {
  // Seules "en_attente" sont reprises automatiquement — un échec "serveur" est
  // définitif tant que l'utilisateur ne relance pas manuellement (voir UI),
  // pour ne jamais boucler à chaud sur un 400 permanent.
  const ops = await db.operations
    .where({ utilisateurId })
    .and((op) => op.statut === "en_attente")
    .sortBy("dateCreation");
  return ops[0];
}

/** Filet de sécurité périodique : ne remet en file que les échecs RÉSEAU. */
export async function relancerEchecsReseau(utilisateurId: string): Promise<void> {
  const echecs = await db.operations
    .where({ utilisateurId })
    .and((op) => op.statut === "echec" && op.erreurType === "reseau")
    .toArray();
  // Promise.all ici = écritures Dexie locales, pas des authFetch — sans
  // rapport avec la contrainte de séquentialité réseau ci-dessus.
  await Promise.all(echecs.map((op) => db.operations.update(op.id, { statut: "en_attente" })));
}

export async function enfiler(
  op: Omit<OperationEnAttente, "statut" | "tentatives" | "dateCreation" | "dateMaj" | "deviceId" | "id"> & {
    id?: string;
  },
): Promise<string> {
  const id = op.id ?? crypto.randomUUID();
  await db.operations.put({
    ...op,
    id,
    statut: "en_attente",
    tentatives: 0,
    deviceId: obtenirDeviceId(),
    dateCreation: Date.now(),
    dateMaj: Date.now(),
  });
  return id;
}

function obtenirDeviceId(): string {
  const cle = "oils-stock-device-id";
  try {
    let v = localStorage.getItem(cle);
    if (!v) {
      v = crypto.randomUUID();
      localStorage.setItem(cle, v);
    }
    return v;
  } catch {
    return "inconnu";
  }
}

/** Pub/sub minimal — même convention que "oa:reconnecte" (CustomEvent sur window). */
function diffuserChangement(op: OperationEnAttente) {
  window.dispatchEvent(
    new CustomEvent("oa:operation-synchronisee", {
      detail: { ressourceType: op.ressourceType, parentId: op.parentId, type: op.type },
    }),
  );
}
