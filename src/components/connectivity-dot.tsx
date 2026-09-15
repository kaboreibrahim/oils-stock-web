"use client";

import { useEffect, useState } from "react";

import { useConnectivity } from "@/lib/connectivity-context";
import { cn } from "@/lib/utils";

const LIBELLE: Record<string, string> = {
  en_ligne: "En ligne",
  hors_ligne: "Hors connexion",
  verification: "Vérification de la connexion",
};

/** Pastille d'état de connexion, discrète, pour les en-têtes. Un badge
 *  numérique s'ajoute quand des écritures hors-ligne (Phase 2) sont en
 *  attente/en cours/en échec. */
export function ConnectivityDot({ className }: { className?: string }) {
  const { etat, operationsEnAttente } = useConnectivity();
  const [monte, setMonte] = useState(false);

  useEffect(() => {
    (async () => setMonte(true))();
  }, []);

  if (!monte) {
    return <span className={cn("h-2 w-2 rounded-full bg-line", className)} aria-hidden />;
  }

  const libelle =
    operationsEnAttente > 0
      ? `${LIBELLE[etat]} — ${operationsEnAttente} opération(s) en attente`
      : LIBELLE[etat];

  return (
    <span className="relative inline-flex">
      <span
        role="status"
        aria-label={libelle}
        title={libelle}
        className={cn(
          "h-2 w-2 rounded-full",
          operationsEnAttente > 0
            ? "bg-warn"
            : etat === "en_ligne"
              ? "bg-ok"
              : etat === "hors_ligne"
                ? "bg-crit"
                : "animate-pulse bg-warn",
          className,
        )}
      />
      {operationsEnAttente > 0 ? (
        <span className="absolute -right-1 -top-1.5 flex h-3 min-w-3 items-center justify-center rounded-full bg-warn px-0.5 text-[8px] font-semibold leading-none text-white">
          {operationsEnAttente > 9 ? "9+" : operationsEnAttente}
        </span>
      ) : null}
    </span>
  );
}
