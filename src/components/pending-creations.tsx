"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";

import { useAuth } from "@/lib/auth-context";
import { db, type OperationEnAttente, type RessourceType, type TypeOperation } from "@/lib/offline-db";

import { Button } from "./ui/button";
import { GlassCard } from "./ui/glass-card";
import { Modal } from "./ui/modal";
import { StatusPill, type StatusPillState } from "./ui/status-pill";

const TYPE_CREATION: Record<RessourceType, TypeOperation> = {
  sortie: "sortie.creer",
  reception: "reception.creer",
  client: "client.creer",
  fournisseur: "fournisseur.creer",
};

function statutPill(op: OperationEnAttente): StatusPillState {
  if (op.statut === "en_cours") return "syncing";
  if (op.statut === "echec") return "error";
  return "pending";
}

/** Cartes de créations mises en file hors-ligne (Phase 2), fusionnées au-dessus
 *  de la liste réelle — aucune n'a encore d'ID serveur, donc pas de lien vers
 *  une page détail : un clic ouvre un aperçu en lecture seule (les données
 *  telles que saisies), avec relance/suppression si la synchro a échoué. */
export function PendingCreations({
  ressourceType,
  titre,
  sousTitre,
}: {
  ressourceType: RessourceType;
  titre: (apercu: Record<string, unknown>) => string;
  sousTitre?: (apercu: Record<string, unknown>) => string | null;
}) {
  const { user } = useAuth();
  const [selection, setSelection] = useState<OperationEnAttente | null>(null);

  const operations =
    useLiveQuery<OperationEnAttente[], OperationEnAttente[]>(
      () =>
        user
          ? db.operations
              .where({ ressourceType, type: TYPE_CREATION[ressourceType] })
              .and((op) => op.utilisateurId === user.id && op.statut !== "synchronise")
              .reverse()
              .sortBy("dateCreation")
          : Promise.resolve([]),
      [ressourceType, user?.id],
      [],
    ) ?? [];

  async function relancer(id: string) {
    await db.operations.update(id, { statut: "en_attente", erreur: undefined, erreurType: undefined });
    setSelection(null);
  }

  async function supprimer(id: string) {
    await db.operations.delete(id);
    setSelection(null);
  }

  if (operations.length === 0) return null;

  return (
    <>
      <div className="oa-stagger grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {operations.map((op) => {
          const apercu = op.apercu ?? {};
          return (
            <button key={op.id} type="button" onClick={() => setSelection(op)} className="text-left">
              <GlassCard className="oa-lift flex h-full flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{titre(apercu)}</p>
                    {sousTitre ? <p className="truncate text-xs text-muted">{sousTitre(apercu)}</p> : null}
                  </div>
                  <StatusPill status={statutPill(op)} label={op.statut === "echec" ? op.erreur : undefined} />
                </div>
              </GlassCard>
            </button>
          );
        })}
      </div>

      <Modal
        open={!!selection}
        onClose={() => setSelection(null)}
        title="En attente de synchronisation"
      >
        {selection ? (
          <div className="flex flex-col gap-4">
            <StatusPill status={statutPill(selection)} label={selection.statut === "echec" ? selection.erreur : undefined} />
            <div className="flex flex-col gap-2 text-sm">
              {Object.entries(selection.apercu ?? {}).map(([cle, valeur]) => (
                <div key={cle} className="flex justify-between gap-3 border-b border-line/60 pb-1.5">
                  <span className="text-muted">{cle}</span>
                  <span className="font-medium text-foreground">{valeur == null ? "—" : String(valeur)}</span>
                </div>
              ))}
            </div>
            {selection.statut === "echec" ? (
              <div className="flex justify-end gap-2 border-t border-line/70 pt-4">
                <Button variant="danger" onClick={() => supprimer(selection.id)}>
                  Supprimer
                </Button>
                <Button onClick={() => relancer(selection.id)}>Réessayer</Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </>
  );
}
