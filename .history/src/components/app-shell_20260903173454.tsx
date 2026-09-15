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
    <div className="flex flex-1">
      <aside className="flex w-56 shrink-0 flex-col border-r border-line bg-surface">
        <div className="border-b border-line px-5 py-4">
          <p className="font-mono text-xs font-semibold tracking-wide">Oils of Africa</p>
          <p className="font-mono text-[11px] uppercase tracking-widest text-muted">Stock</p>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 p-3">
          {items.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-md px-3 py-2 text-sm ${
                  active
                    ? "bg-accent-soft font-medium text-accent"
                    : "text-foreground hover:bg-background"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-line bg-surface px-6 py-3">
          <div className="font-mono text-xs uppercase tracking-widest text-muted">
            {ROLE_LABELS[user.role]}
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-foreground">{user.username}</span>
            <button
              onClick={logout}
              className="rounded-md border border-line px-3 py-1.5 text-xs font-medium text-muted hover:text-foreground"
            >
              Se déconnecter
            </button>
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
