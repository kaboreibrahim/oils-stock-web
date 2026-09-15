"use client";

import Image from "next/image";
import Link from "next/link";
import { Camera, Menu } from "lucide-react";

import { GlassCard } from "@/components/ui/glass-card";

import { ConnectivityDot } from "./connectivity-dot";
import { NotificationBell } from "./notification-bell";

export function MobileHeader({ onOpenMenu }: { onOpenMenu: () => void }) {
  return (
    <GlassCard
      as="header"
      tone="strong"
      className="sticky top-0 z-40 flex items-center justify-between rounded-none border-x-0 border-t-0 px-4 py-3 md:hidden"
    >
      <div className="flex items-center gap-2">
        <Image
          src="/oils-of-africa-logo.png"
          alt="Oils of Africa"
          width={32}
          height={32}
          className="h-8 w-8"
          priority
        />
        <div className="leading-none">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-foreground">
            Stock
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <ConnectivityDot className="mr-1" />
        <NotificationBell />
        <Link
          href="/scan"
          aria-label="Scanner un numéro"
          className="oa-tap flex h-9 w-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-foreground/[0.05]"
        >
          <Camera className="h-5 w-5" />
        </Link>
        <button
          onClick={onOpenMenu}
          aria-label="Ouvrir le menu"
          className="oa-tap flex h-9 w-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-foreground/[0.05]"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>
    </GlassCard>
  );
}
