"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Bell, PackageMinus, PackagePlus, type LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { useNotifications, type TypeNotification } from "@/lib/notifications-context";
import { tempsRelatif } from "@/lib/temps";
import { useOverlayHistory } from "@/lib/use-overlay-history";
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

const ICON_BUTTON =
  "oa-tap flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-foreground/[0.04] hover:text-foreground";

export function NotificationBell({ className }: { className?: string }) {
  const { notifications, nonLus, pushEtat, marquerLu, marquerToutLu, activerPush, desactiverPush } = useNotifications();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);

  useOverlayHistory(open, () => setOpen(false));

  useEffect(() => {
    // IIFE async : le linter n'accepte pas un setState synchrone en corps
    // d'effet (règle react-hooks/set-state-in-effect) — même contournement
    // que useTheme(). Sert juste à éviter un décalage d'hydratation sur le badge.
    (async () => {
      setMounted(true);
    })();
  }, []);

  if (!mounted) return <span className={cn("h-9 w-9 shrink-0", className)} aria-hidden />;

  const recentes = notifications.slice(0, 8);

  async function ouvrir(id: string, lien: string) {
    setOpen(false);
    await marquerLu(id);
    router.push(lien || "/");
  }

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={nonLus > 0 ? `Notifications (${nonLus} non lue${nonLus > 1 ? "s" : ""})` : "Notifications"}
        className={ICON_BUTTON}
      >
        <Bell className="h-[18px] w-[18px]" strokeWidth={2} />
        {nonLus > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-crit px-1 text-[10px] font-semibold leading-none text-white">
            {nonLus > 9 ? "9+" : nonLus}
          </span>
        ) : null}
      </button>

      {open ? (
        <>
          <div className="fixed inset-0 z-40" aria-hidden onClick={() => setOpen(false)} />
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute right-0 top-11 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col rounded-xl border border-glass-border bg-glass-strong shadow-[0_1px_2px_var(--shadow-1),0_12px_32px_-16px_var(--shadow-2)] backdrop-blur-xl"
          >
            <div className="flex items-center justify-between gap-2 border-b border-line/70 px-3 py-2.5">
              <span className="text-sm font-semibold text-foreground">Notifications</span>
              <button
                type="button"
                onClick={() => marquerToutLu()}
                disabled={nonLus === 0}
                className="text-xs font-medium text-accent-strong transition-opacity hover:underline disabled:opacity-40"
              >
                Tout marquer comme lu
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto py-1">
              {recentes.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-muted">Aucune notification.</p>
              ) : (
                recentes.map((n) => {
                  const Icon = ICONE[n.type];
                  return (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => ouvrir(n.id, n.lien)}
                      className={cn(
                        "flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-foreground/[0.03]",
                        !n.lu && "border-l-2 border-accent bg-accent-soft/40",
                      )}
                    >
                      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", TON_ICONE[n.type])} strokeWidth={2} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-foreground">{n.titre}</span>
                        {n.corps ? (
                          <span className="mt-0.5 block text-xs text-muted line-clamp-2">{n.corps}</span>
                        ) : null}
                        <span className="mt-0.5 block text-[11px] text-muted">{tempsRelatif(n.created_at)}</span>
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            <div className="flex flex-col gap-1.5 border-t border-line/70 px-3 py-2.5">
              <Link
                href="/notifications"
                onClick={() => setOpen(false)}
                className="text-xs font-medium text-accent-strong hover:underline"
              >
                Voir toutes les notifications
              </Link>
              {pushEtat === "inactif" ? (
                <button
                  type="button"
                  onClick={() => activerPush()}
                  className="text-left text-xs font-medium text-foreground hover:underline"
                >
                  Activer les notifications sur cet appareil
                </button>
              ) : pushEtat === "actif" ? (
                <button
                  type="button"
                  onClick={() => desactiverPush()}
                  className="text-left text-[11px] text-muted hover:underline"
                >
                  Notifications activées · désactiver
                </button>
              ) : (
                <p className="text-[11px] text-muted">Notifications navigateur indisponibles ici (HTTPS requis).</p>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
