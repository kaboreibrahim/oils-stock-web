"use client";

import { useRouter } from "next/navigation";
import { AlertTriangle, Bell, PackageMinus, PackagePlus, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { InlineEmpty } from "@/components/ui/list-states";
import { PageHeader } from "@/components/ui/page-header";
import { useNotifications, type TypeNotification } from "@/lib/notifications-context";
import { tempsRelatif } from "@/lib/temps";
import { cn } from "@/lib/utils";

const ICONE: Record<TypeNotification, LucideIcon> = {
  MOUVEMENT_ENTREE: PackagePlus,
  MOUVEMENT_SORTIE: PackageMinus,
  SEUIL_ATTEINT: AlertTriangle,
  STOCK_EPUISE: AlertTriangle,
};

const TON_ICONE: Record<TypeNotification, string> = {
  MOUVEMENT_ENTREE: "text-ok",
  MOUVEMENT_SORTIE: "text-muted",
  SEUIL_ATTEINT: "text-warn",
  STOCK_EPUISE: "text-crit",
};

export default function NotificationsPage() {
  const { notifications, nonLus, pushEtat, marquerLu, marquerToutLu, activerPush, desactiverPush } = useNotifications();
  const router = useRouter();

  async function ouvrir(id: string, lien: string) {
    await marquerLu(id);
    router.push(lien || "/");
  }

  return (
    <div className="oa-rise flex flex-col gap-5">
      <PageHeader
        icon={Bell}
        eyebrow="Alertes"
        title="Notifications"
        subtitle="Mouvements de stock validés et alertes de réapprovisionnement."
      >
        <Button variant="secondary" onClick={() => marquerToutLu()} disabled={nonLus === 0}>
          Tout marquer comme lu
        </Button>
      </PageHeader>

      <GlassCard className="flex flex-col gap-2 p-4">
        <p className="text-sm font-medium text-foreground">Notifications navigateur</p>
        {pushEtat === "actif" ? (
          <div className="flex items-center gap-3 text-sm text-muted">
            <span className="text-ok">Activées sur cet appareil.</span>
            <button type="button" onClick={() => desactiverPush()} className="text-xs font-medium text-accent-strong hover:underline">
              Désactiver
            </button>
          </div>
        ) : pushEtat === "inactif" ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted">
              Recevez les alertes même quand l&apos;onglet est fermé.
            </p>
            <Button variant="secondary" onClick={() => activerPush()} className="w-fit">
              Activer sur cet appareil
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted">
            Indisponibles sur cet accès (HTTPS requis). Les notifications restent visibles ici et via la cloche.
          </p>
        )}
      </GlassCard>

      {notifications.length === 0 ? (
        <InlineEmpty icon={Bell} title="Aucune notification" description="Les mouvements de stock validés apparaîtront ici." />
      ) : (
        <GlassCard tone="strong" className="flex flex-col divide-y divide-line/70">
          {notifications.map((n) => {
            const Icon = ICONE[n.type];
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => ouvrir(n.id, n.lien)}
                className={cn(
                  "flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-foreground/[0.02]",
                  !n.lu && "border-l-2 border-accent bg-accent-soft/30",
                )}
              >
                <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", TON_ICONE[n.type])} strokeWidth={2} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-foreground">{n.titre}</span>
                  {n.corps ? <span className="mt-0.5 block text-xs text-muted">{n.corps}</span> : null}
                </span>
                <span className="shrink-0 text-[11px] text-muted">{tempsRelatif(n.created_at)}</span>
              </button>
            );
          })}
        </GlassCard>
      )}
    </div>
  );
}
