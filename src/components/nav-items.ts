import {
  Bell,
  Clock,
  LayoutDashboard,
  Package,
  PackageMinus,
  PackagePlus,
  Settings,
  TrendingUp,
  Truck,
  Undo2,
  Users,
  type LucideIcon,
} from "lucide-react";

import type { Role } from "@/lib/api";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Rôles autorisés à voir ce lien ; absent = tous les rôles authentifiés. */
  roles?: Role[];
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/stock", label: "Stock", icon: Package },
  { href: "/stock-dormant", label: "Stock dormant", icon: Clock },
  { href: "/previsions", label: "Prévisions", icon: TrendingUp },
  { href: "/receptions", label: "Réceptions", icon: PackagePlus },
  { href: "/sorties", label: "Sorties", icon: PackageMinus },
  { href: "/retours", label: "Retours", icon: Undo2 },
  { href: "/fournisseurs", label: "Fournisseurs", icon: Truck },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/parametres", label: "Paramètres", icon: Settings, roles: ["ADMIN"] },
];

export const OPERATION_ITEMS: NavItem[] = [
  { href: "/receptions", label: "Réceptions", icon: PackagePlus },
  { href: "/sorties", label: "Sorties", icon: PackageMinus },
  { href: "/retours", label: "Retours", icon: Undo2 },
];

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrateur",
  MAGASINIER: "Magasinier",
  LECTURE: "Lecture seule",
};
