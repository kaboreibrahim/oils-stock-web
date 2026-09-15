"use client";

import { WifiOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";

// Page de repli servie par le service worker quand une route jamais consultée
// est demandée hors connexion. Volontairement autonome : aucun appel réseau.
export default function OfflinePage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <div className="oa-app-bg" aria-hidden />
      <GlassCard className="oa-rise flex max-w-sm flex-col items-center gap-4 px-6 py-10 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-foreground/[0.04] text-muted">
          <WifiOff className="h-6 w-6" strokeWidth={1.75} aria-hidden />
        </span>
        <div className="space-y-1.5">
          <p className="text-base font-semibold text-foreground">Vous êtes hors connexion</p>
          <p className="text-sm text-muted">
            Cette page n&apos;a pas encore été consultée en ligne, elle n&apos;est donc pas
            disponible localement. Reconnectez-vous puis réessayez.
          </p>
        </div>
        <Button variant="secondary" onClick={() => window.location.reload()}>
          Réessayer
        </Button>
      </GlassCard>
    </div>
  );
}
