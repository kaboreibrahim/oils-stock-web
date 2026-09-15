"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useAuth } from "@/lib/auth-context";
import type { Role } from "@/lib/api";

interface NavItem {
  href: string;
  label: string;
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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted">Chargement…</p>
      </div>
    );
  }

  const items = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(user.role));

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* HEADER / BARRE FLOTTANTE */}
      <header className="sticky top-4 z-50 mx-4 md:mx-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between rounded-2xl border border-line/80 bg-surface/85 px-4 py-3 shadow-lg shadow-black/[0.03] backdrop-blur-md">
          
          {/* Logo & Marque */}
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="font-mono text-xs font-bold tracking-wider text-foreground">
                Oils of Africa
              </span>
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
                {ROLE_LABELS[user.role]}
              </span>
            </div>
          </div>

          {/* Navigation Flottante */}
          <nav className="hidden lg:flex items-center gap-1">
            {items.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-all duration-150 ${
                    active
                      ? "bg-accent text-accent-foreground shadow-sm"
                      : "text-muted hover:bg-background hover:text-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Profil & Déconnexion */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-medium text-foreground">{user.username}</span>
            </div>
            <button
              onClick={logout}
              className="rounded-xl border border-line px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-background hover:text-foreground"
            >
              Déconnexion
            </button>
          </div>
        </div>

        {/* Navigation mobile secondaire (si l'écran est petit) */}
        <div className="mt-2 flex lg:hidden overflow-x-auto gap-1 py-1 no-scrollbar">
          {items.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-medium ${
                  active
                    ? "bg-accent text-accent-foreground"
                    : "bg-surface border border-line text-muted"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </header>

      {/* CONTENU PRINCIPAL */}
      <main className="flex-1 mx-4 md:mx-8 my-6 max-w-7xl w-full mx-auto">
        {children}
      </main>
    </div>
  );
}