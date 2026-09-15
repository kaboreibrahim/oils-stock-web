"use client";

import { useEffect, useState } from "react";

import { useConnectivity } from "@/lib/connectivity-context";
import { pushDisponible } from "@/lib/push";
import { usePwa } from "@/lib/pwa-context";

import { CLE_REFUS_NOTIF, NotifActivationSheet } from "./notif-activation-sheet";
import { PwaInstallSheet } from "./pwa-install-sheet";

type Feuille = "install" | "notif" | null;

const CLE_SESSIONS = "oils-stock-sessions";
const DELAI_INSTALL_MS = 25_000;
const DELAI_NOTIF_MS = 60_000;
const REPROPOSER_APRES_MS = 7 * 24 * 60 * 60 * 1000;

function nbSessions(): number {
  try {
    if (!sessionStorage.getItem("oils-stock-session-comptee")) {
      const n = Number(localStorage.getItem(CLE_SESSIONS) || "0") + 1;
      localStorage.setItem(CLE_SESSIONS, String(n));
      sessionStorage.setItem("oils-stock-session-comptee", "1");
      return n;
    }
    return Number(localStorage.getItem(CLE_SESSIONS) || "1");
  } catch {
    return 1;
  }
}

function notifRefuseRecemment(): boolean {
  try {
    const brut = localStorage.getItem(CLE_REFUS_NOTIF);
    if (!brut) return false;
    const { dismissedAt } = JSON.parse(brut) as { dismissedAt: number };
    return dismissedAt === Infinity || Date.now() - dismissedAt < REPROPOSER_APRES_MS;
  } catch {
    return false;
  }
}

/** Orchestre les deux feuilles PWA : jamais les deux en même temps, l'invite
 *  d'installation d'abord, celle des notifications ensuite. Monté dans AppShell
 *  (donc uniquement une fois connecté). */
export function PwaSheets() {
  const { estInstallee, estInstallable, plateforme, refusRecemment } = usePwa();
  const { enLigne } = useConnectivity();
  const [feuille, setFeuille] = useState<Feuille>(null);
  const [installResolu, setInstallResolu] = useState(false);

  // Invite d'installation : (jamais installée) + (pas refusée récemment) + en ligne
  // + (2e session ou 25 s d'usage) + (Chromium installable ou iOS).
  useEffect(() => {
    const ineligible =
      estInstallee || refusRecemment || !enLigne || (!estInstallable && plateforme !== "ios");
    if (ineligible) {
      const id = setTimeout(() => setInstallResolu(true), 0);
      return () => clearTimeout(id);
    }
    const delai = nbSessions() >= 2 ? 0 : DELAI_INSTALL_MS;
    const id = setTimeout(() => setFeuille((f) => (f === null ? "install" : f)), delai);
    return () => clearTimeout(id);
  }, [estInstallee, estInstallable, plateforme, refusRecemment, enLigne]);

  // Invite notifications : après résolution de l'invite d'installation (ou 60 s),
  // si le push est possible, non encore accordé et non refusé récemment.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!pushDisponible() || Notification.permission !== "default" || notifRefuseRecemment()) return;

    const proposer = () => setFeuille((f) => (f === null && installResolu ? "notif" : f));
    const delai = installResolu ? 0 : DELAI_NOTIF_MS;
    const id = setTimeout(proposer, delai);
    return () => clearTimeout(id);
  }, [installResolu]);

  // Ouverture manuelle depuis le tiroir / les paramètres.
  useEffect(() => {
    const surOuvrir = () => setFeuille("install");
    window.addEventListener("oa:ouvrir-install", surOuvrir);
    return () => window.removeEventListener("oa:ouvrir-install", surOuvrir);
  }, []);

  const fermerInstall = () => {
    setInstallResolu(true);
    setFeuille(null);
  };

  return (
    <>
      <PwaInstallSheet open={feuille === "install"} onClose={fermerInstall} />
      <NotifActivationSheet open={feuille === "notif"} onClose={() => setFeuille(null)} />
    </>
  );
}
