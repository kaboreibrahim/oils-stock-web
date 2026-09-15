"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useAuth } from "@/lib/auth-context";
import type { Role } from "@/lib/api";

interface NavItem {
  href: string;
  label: string;
  /** Rôles autorisés à voir ce lien ; absent = tous les rôles authentifiés. */
  roles?: Role[];
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Tableau de bord" },
  { href: "/stock", label: "Stock" },
  { href: "/receptions", label: "Réceptions" },
  { href: "/sorties", label: "Sorties" },
  { href: "/retours", label: "Retours" },
  { href: "/fournisseurs", label: "Fournisseurs" },
  { href: "/clients", label: "Clients" },
  { href: "/parametres", label: "Paramètres", roles: ["ADMIN"] },
];

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrateur",
  MAGASINIER: "Magasinier",
  LECTURE: "Lecture seule",
};

export function AppShell({ children }: { children: ReactNode }) {
  const { status, user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "anonymous") router.replace("/login");
  }, [status, router]);

  if (status !== "authenticated" || !user) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-muted">Chargement…</p>
      </div>
    );
  }

  const items = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(user.role));

  return (
    <div className="flex flex-1 bg-background min-h-screen">
      {/* Menu de navigation flottant avec effet glassmorphisme sur l'élément actif */}
      <aside className="flex w-64 shrink-0 flex-col p-4">
        <div className="sticky top-4 flex flex-col gap-4 rounded-2xl border border-white/10 bg-surface/40 p-4 shadow-xl backdrop-blur-md">
          <div className="border-b border-line/50 px-2 pb-3">
            <p className="font-mono text-xs font-semibold tracking-wide text-foreground">Oils of Africa</p>
            <p className="font-mono text-[11px] uppercase tracking-widest text-muted">Stock</p>
          </div>
          <nav className="flex flex-1 flex-col gap-1.5">
            {items.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative rounded-xl px-3.5 py-2.5 text-sm transition-all duration-300 ${
                    active
                      ? "bg-white/10 text-foreground font-medium shadow-inner backdrop-blur-lg border border-white/20 ring-1 ring-white/10"
                      : "text-muted hover:text-foreground hover:bg-white/5"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      <div className="flex flex-1 flex-col p-4 pl-0">
        <header className="flex items-center justify-between rounded-2xl border border-white/10 bg-surface/40 px-6 py-3 shadow-lg backdrop-blur-md mb-4">
          <div className="font-mono text-xs uppercase tracking-widest text-muted">
            {ROLE_LABELS[user.role]}
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-foreground font-medium">{user.username}</span>
            <button
              onClick={logout}
              className="rounded-lg border border-line/60 bg-white/5 px-3 py-1.5 text-xs font-medium text-muted hover:text-foreground hover:bg-white/10 transition-colors"
            >
              Se déconnecter
            </button>
          </div>
        </header>
        <main className="flex-1 rounded-2xl border border-white/10 bg-surface/20 p-6 backdrop-blur-sm shadow-sm">{children}</main>
      </div>
    </div>
  );
}