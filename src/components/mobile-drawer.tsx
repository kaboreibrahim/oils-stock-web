"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Download, LogOut, X } from "lucide-react";
import { useEffect } from "react";

import { useAuth } from "@/lib/auth-context";
import { usePwa } from "@/lib/pwa-context";
import { useOverlayHistory } from "@/lib/use-overlay-history";
import { cn } from "@/lib/utils";

import { NAV_ITEMS, ROLE_LABELS } from "./nav-items";
import { ThemeToggle } from "./theme-toggle";

export function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, logout } = useAuth();
  const { estInstallee } = usePwa();
  const pathname = usePathname();

  useOverlayHistory(open, onClose);

  // Bloque le défilement de la page derrière le tiroir pendant qu'il est ouvert.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!user) return null;
  const items = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(user.role));

  return (
    <div className={cn("fixed inset-0 z-50 overflow-hidden md:hidden", open ? "" : "pointer-events-none")}>
      <div
        onClick={onClose}
        aria-hidden
        className={cn(
          "absolute inset-0 bg-black/30 transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Menu de navigation"
        className={cn(
          "absolute inset-y-0 right-0 flex w-[82%] max-w-xs flex-col border-l border-glass-border bg-glass-strong p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] backdrop-blur-xl transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Image src="/oils-of-africa-logo.png" alt="" width={32} height={32} className="h-8 w-8" />
            <div className="leading-tight">
              <p className="text-sm font-semibold text-foreground">{user.username}</p>
              <p className="text-xs text-muted">{ROLE_LABELS[user.role]}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle className="h-8 w-8" />
            <button
              onClick={onClose}
              aria-label="Fermer le menu"
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-foreground/[0.05]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
          {items.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                  active
                    ? "bg-accent-soft font-medium text-accent-strong"
                    : "text-foreground hover:bg-foreground/[0.04]",
                )}
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {!estInstallee ? (
          <button
            onClick={() => {
              onClose();
              window.dispatchEvent(new CustomEvent("oa:ouvrir-install"));
            }}
            className="mt-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-foreground/[0.04]"
          >
            <Download className="h-[18px] w-[18px]" strokeWidth={2} />
            Installer l&apos;application
          </button>
        ) : null}

        <button
          onClick={() => {
            onClose();
            logout();
          }}
          className="mt-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-crit transition-colors hover:bg-crit-soft"
        >
          <LogOut className="h-[18px] w-[18px]" />
          Se déconnecter
        </button>
      </div>
    </div>
  );
}
