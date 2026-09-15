"use client";

import { Bell } from "lucide-react";

import { useNotifications } from "@/lib/notifications-context";

import { Button } from "./ui/button";
import { BottomSheet } from "./ui/bottom-sheet";

export const CLE_REFUS_NOTIF = "oils-stock-notif-prompt";

export function memoriserRefusNotif() {
  try {
    window.localStorage.setItem(
      CLE_REFUS_NOTIF,
      JSON.stringify({ dismissedAt: Date.now(), count: 1 }),
    );
  } catch {
    /* stockage indisponible */
  }
}

export function NotifActivationSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { activerPush } = useNotifications();

  const plusTard = () => {
    memoriserRefusNotif();
    onClose();
  };

  const activer = async () => {
    await activerPush(); // gère lui-même le toast de résultat
    memoriserRefusNotif(); // ne pas re-proposer, quel que soit le choix natif
    onClose();
  };

  return (
    <BottomSheet open={open} onClose={onClose} ariaLabel="Activer les notifications">
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent-strong">
            <Bell className="h-5 w-5" strokeWidth={2} aria-hidden />
          </span>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">Activez les notifications</p>
            <p className="text-sm text-muted">
              Recevez instantanément les alertes importantes concernant votre stock : les entrées,
              les sorties et les seuils de réapprovisionnement.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Button onClick={activer} className="w-full">
            <Bell className="h-4 w-4" strokeWidth={2} aria-hidden />
            Activer les notifications
          </Button>
          <Button variant="ghost" onClick={plusTard} className="w-full">
            Plus tard
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}
