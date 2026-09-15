"use client";

import { Download, Share, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";

import { usePwa } from "@/lib/pwa-context";

import { Button } from "./ui/button";
import { BottomSheet } from "./ui/bottom-sheet";

export function PwaInstallSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { promptInstall, memoriserRefus } = usePwa();
  const [vue, setVue] = useState<"intro" | "ios" | "generique">("intro");

  useEffect(() => {
    // IIFE async : le lint interdit un setState synchrone dans le corps d'effet.
    (async () => {
      if (open) setVue("intro");
    })();
  }, [open]);

  const plusTard = () => {
    memoriserRefus();
    onClose();
  };

  const installer = async () => {
    const r = await promptInstall();
    if (r === "accepted" || r === "dismissed") {
      onClose();
    } else if (r === "ios") {
      setVue("ios");
    } else {
      setVue("generique");
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} ariaLabel="Installer l'application">
      {vue === "intro" ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent-strong">
              <Smartphone className="h-5 w-5" strokeWidth={2} aria-hidden />
            </span>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">Installez l&apos;application</p>
              <p className="text-sm text-muted">
                Installez l&apos;application sur votre téléphone pour y accéder rapidement, même
                lorsque votre connexion Internet est faible ou indisponible.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Button onClick={installer} className="w-full">
              <Download className="h-4 w-4" strokeWidth={2} aria-hidden />
              Installer l&apos;application
            </Button>
            <Button variant="ghost" onClick={plusTard} className="w-full">
              Plus tard
            </Button>
          </div>
        </div>
      ) : null}

      {vue === "ios" ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent-strong">
              <Share className="h-5 w-5" strokeWidth={2} aria-hidden />
            </span>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">Ajouter à l&apos;écran d&apos;accueil</p>
              <p className="text-sm text-muted">
                Dans Safari, appuyez sur le bouton <span className="font-medium text-foreground">Partager</span>{" "}
                <Share className="inline h-3.5 w-3.5 align-text-bottom" aria-hidden /> puis sur{" "}
                <span className="font-medium text-foreground">« Sur l&apos;écran d&apos;accueil »</span>.
              </p>
            </div>
          </div>
          <Button variant="secondary" onClick={plusTard} className="w-full">
            J&apos;ai compris
          </Button>
        </div>
      ) : null}

      {vue === "generique" ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent-strong">
              <Download className="h-5 w-5" strokeWidth={2} aria-hidden />
            </span>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">Installer depuis le navigateur</p>
              <p className="text-sm text-muted">
                Ouvrez le menu de votre navigateur puis choisissez{" "}
                <span className="font-medium text-foreground">
                  « Installer l&apos;application »
                </span>{" "}
                ou « Ajouter à l&apos;écran d&apos;accueil ».
              </p>
            </div>
          </div>
          <Button variant="secondary" onClick={plusTard} className="w-full">
            J&apos;ai compris
          </Button>
        </div>
      ) : null}
    </BottomSheet>
  );
}
