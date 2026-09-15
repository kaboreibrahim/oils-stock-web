"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { useAuth } from "@/lib/auth-context";
import { useSyncEngine } from "@/lib/use-sync-engine";

import { BottomNav } from "./bottom-nav";
import { ConnectivityBanner } from "./connectivity-banner";
import { DesktopHeader } from "./desktop-header";
import { MobileDrawer } from "./mobile-drawer";
import { MobileHeader } from "./mobile-header";
import { PwaSheets } from "./pwa-sheets";

export function AppShell({ children }: { children: ReactNode }) {
  const { status, user } = useAuth();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useSyncEngine();

  useEffect(() => {
    if (status === "anonymous") router.replace("/login");
  }, [status, router]);

  if (status !== "authenticated" || !user) {
    return (
      <div className="relative flex min-h-screen flex-1 items-center justify-center">
        <div className="oa-app-bg" aria-hidden />
        <p className="text-sm text-muted">Chargement…</p>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col">
      <div className="oa-app-bg" aria-hidden />

      <DesktopHeader />
      <MobileHeader onOpenMenu={() => setDrawerOpen(true)} />
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <ConnectivityBanner />

      <main className="flex-1 px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-4 md:px-6 md:pb-10 md:pt-6">
        {children}
      </main>

      <BottomNav onOpenMore={() => setDrawerOpen(true)} />
      <PwaSheets />
    </div>
  );
}
