"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";

import { GlassCard } from "@/components/ui/glass-card";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

import { ConnectivityDot } from "./connectivity-dot";
import { NAV_ITEMS, ROLE_LABELS } from "./nav-items";
import { NotificationBell } from "./notification-bell";
import { ThemeToggle } from "./theme-toggle";

/** Navigation desktop — masquée sous md, voir mobile-header.tsx + bottom-nav.tsx. */
export function DesktopHeader() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  if (!user) return null;
  const items = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(user.role));

  return (
    <GlassCard
      as="header"
      tone="strong"
      className="sticky top-4 z-40 mx-4 mt-4 hidden flex-col gap-3 px-6 py-4 md:flex"
    >
      <div className="flex items-center justify-between gap-4 border-b border-line/70 pb-3">
        <div className="flex items-center gap-3">
          <Image
            src="/oils-of-africa-logo.png"
            alt="Oils of Africa"
            width={40}
            height={40}
            className="h-10 w-10 shrink-0"
            priority
          />
          <div className="leading-tight">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground">
              Stock
            </p>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Management</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="rounded-full bg-accent-soft px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-accent-strong">
            {ROLE_LABELS[user.role]}
          </span>

          <ConnectivityDot />

          <span className="h-6 w-px bg-line" />

          <ThemeToggle />

          <NotificationBell />

          <div className="flex items-center gap-2.5 pl-1">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-xs font-semibold text-white">
              {user.username.slice(0, 1).toUpperCase()}
            </span>
            <span className="text-sm font-medium text-foreground">{user.username}</span>
          </div>

          <button
            onClick={() => logout()}
            aria-label="Se déconnecter"
            className="oa-tap flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-crit-soft hover:text-crit"
          >
            <LogOut className="h-[18px] w-[18px]" strokeWidth={2} />
          </button>
        </div>
      </div>

      <nav className="flex flex-wrap items-center gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm transition-colors duration-150",
                active
                  ? "bg-accent-soft font-medium text-accent-strong"
                  : "text-muted hover:bg-foreground/[0.04] hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" strokeWidth={2} aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </GlassCard>
  );
}
