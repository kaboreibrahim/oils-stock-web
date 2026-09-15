"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Layers, MoreHorizontal, Package } from "lucide-react";
import { useState } from "react";

import { useOverlayHistory } from "@/lib/use-overlay-history";
import { cn } from "@/lib/utils";

import { OPERATION_ITEMS } from "./nav-items";

const PRIMARY_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/stock", label: "Stock", icon: Package },
];

/** Barre de navigation mobile — 4 raccourcis, dont un fan-out "Opérations"
 * et un "Plus" qui ouvre le tiroir complet (voir app-shell.tsx). */
export function BottomNav({ onOpenMore }: { onOpenMore: () => void }) {
  const pathname = usePathname();
  const [opsOpen, setOpsOpen] = useState(false);

  useOverlayHistory(opsOpen, () => setOpsOpen(false));

  return (
    <>
      {opsOpen ? (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setOpsOpen(false)} aria-hidden>
          <div
            className="absolute inset-x-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] flex flex-col gap-1 rounded-2xl border border-glass-border bg-glass-strong p-2 shadow-xl backdrop-blur-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {OPERATION_ITEMS.map((op) => {
              const Icon = op.icon;
              const active = pathname === op.href;
              return (
                <Link
                  key={op.href}
                  href={op.href}
                  onClick={() => setOpsOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm",
                    active ? "bg-accent-soft font-medium text-accent-strong" : "text-foreground hover:bg-foreground/[0.04]",
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
                  {op.label}
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}

      <nav className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 flex items-center justify-around rounded-2xl border border-glass-border bg-glass-strong px-2 py-2 shadow-xl backdrop-blur-xl md:hidden">
        {PRIMARY_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-0.5 text-[11px] transition-colors",
                active ? "text-accent-strong" : "text-muted",
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-12 items-center justify-center rounded-full transition-colors",
                  active && "bg-accent-soft",
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
              </span>
              {item.label}
            </Link>
          );
        })}
        <button
          onClick={() => setOpsOpen((v) => !v)}
          className={cn(
            "flex flex-1 flex-col items-center gap-1 py-0.5 text-[11px] transition-colors",
            opsOpen ? "text-accent-strong" : "text-muted",
          )}
        >
          <span
            className={cn(
              "flex h-7 w-12 items-center justify-center rounded-full transition-colors",
              opsOpen && "bg-accent-soft",
            )}
          >
            <Layers className="h-5 w-5" strokeWidth={opsOpen ? 2.4 : 2} />
          </span>
          Opérations
        </button>
        <button
          onClick={onOpenMore}
          className="flex flex-1 flex-col items-center gap-1 py-0.5 text-[11px] text-muted transition-colors"
        >
          <span className="flex h-7 w-12 items-center justify-center rounded-full">
            <MoreHorizontal className="h-5 w-5" />
          </span>
          Plus
        </button>
      </nav>
    </>
  );
}
