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
      <div className="flex flex-1 items-center justify-center min-h-screen">
        <p className="text-sm text-muted">Chargement…</p>
      </div>
    );
  }

  const items = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(user.role));

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* HEADER FLOTTANT PRINCIPAL */}
      <header className="sticky top-4 z-50 mx-4 mt-4 flex flex-col gap-3 rounded-2xl border border-white/10 bg-surface/40 px-6 py-4 shadow-xl backdrop-blur-md">
        {/* Ligne supérieure : Logo / Rôle / Utilisateur & Déconnexion */}
        <div className="flex items-center justify-between border-b border-line/50 pb-3">
          <div className="flex items-center gap-4">
            <div>
              <p className="font-mono text-xs font-semibold tracking-wide text-foreground">Oils of Africa</p>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Stock</p>
            </div>
            <span className="h-4 w-[1px] bg-line/60" />
            <div className="font-mono text-xs uppercase tracking-widest text-muted">
              {ROLE_LABELS[user.role]}
            </div>
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
        </div>

        {/* Ligne inférieure : Menu de navigation horizontal */}
        <nav className="flex flex-wrap items-center gap-1.5">
          {items.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-xl px-3.5 py-2 text-sm transition-all duration-300 ${
                  active
                    ? "bg-white/15 text-foreground font-medium shadow-inner backdrop-blur-lg border border-white/20 ring-1 ring-white/10"
                    : "text-muted hover:text-foreground hover:bg-white/5"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      {/* Contenu principal */}
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}