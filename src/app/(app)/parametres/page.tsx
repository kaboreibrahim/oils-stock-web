"use client";

// Gestion des comptes (Jalon 6, §09 — réservé à l'admin, déjà gardé par
// nav-items.ts). Une seule page : liste + création + édition inline (rôle,
// actif/inactif) — pas de fiche détail séparée, le volume de comptes reste
// faible pour ce genre d'appli interne.

import { Bell, Download, Plus, Settings, Smartphone, Trash2, X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TABLE_CELL_CLASS,
  TABLE_ROW_CLASS,
  TableCard,
  TableEmptyRow,
  THead,
} from "@/components/ui/data-table";
import { GlassCard } from "@/components/ui/glass-card";
import { ListError, ListSkeleton } from "@/components/ui/list-states";
import { PageHeader } from "@/components/ui/page-header";
import { ViewToggle } from "@/components/ui/view-toggle";
import { useAuth } from "@/lib/auth-context";
import { useNotifications } from "@/lib/notifications-context";
import { usePwa } from "@/lib/pwa-context";
import { useViewMode } from "@/lib/use-view-mode";

type Role = "ADMIN" | "MAGASINIER" | "LECTURE";

interface CompteUtilisateur {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: Role;
  is_active: boolean;
  date_joined: string;
}

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrateur",
  MAGASINIER: "Magasinier",
  LECTURE: "Lecture seule",
};

function CarteApplication() {
  const { estInstallee } = usePwa();
  const { pushEtat, activerPush, desactiverPush } = useNotifications();

  return (
    <GlassCard className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent-strong">
          <Smartphone className="h-5 w-5" strokeWidth={2} aria-hidden />
        </span>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">Application</p>
          <p className="text-sm text-muted">
            {estInstallee ? "Installée sur cet appareil." : "Non installée sur cet appareil."}
            {" · "}
            {pushEtat === "actif"
              ? "Notifications activées."
              : pushEtat === "indisponible"
                ? "Notifications indisponibles ici (HTTPS requis)."
                : "Notifications non activées."}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {!estInstallee ? (
          <Button
            variant="secondary"
            onClick={() => window.dispatchEvent(new CustomEvent("oa:ouvrir-install"))}
          >
            <Download className="h-4 w-4" strokeWidth={2} aria-hidden />
            Installer
          </Button>
        ) : null}
        {pushEtat === "inactif" ? (
          <Button variant="secondary" onClick={() => activerPush()}>
            <Bell className="h-4 w-4" strokeWidth={2} aria-hidden />
            Activer les notifications
          </Button>
        ) : pushEtat === "actif" ? (
          <Button variant="ghost" onClick={() => desactiverPush()}>
            Désactiver les notifications
          </Button>
        ) : null}
      </div>
    </GlassCard>
  );
}

export default function ParametresPage() {
  const { authFetch, user: moi } = useAuth();
  const { mode, preference, setPreference } = useViewMode("parametres");
  const [comptes, setComptes] = useState<CompteUtilisateur[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionEnCours, setActionEnCours] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [formulaireOuvert, setFormulaireOuvert] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("LECTURE");
  const [email, setEmail] = useState("");
  const [creationError, setCreationError] = useState<string | null>(null);
  const [creationEnCours, setCreationEnCours] = useState(false);

  async function charger() {
    const res = await authFetch("/users/?ordering=username");
    if (!res.ok) {
      setError(
        res.status === 503
          ? "Hors connexion — cette page n'a pas encore été consultée en ligne."
          : `Erreur ${res.status} lors du chargement des comptes.`,
      );
      return;
    }
    setError(null);
    const data = (await res.json()) as { results: CompteUtilisateur[] };
    setComptes(data.results);
  }

  useEffect(() => {
    (async () => {
      await charger();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadKey]);

  async function creer(e: FormEvent) {
    e.preventDefault();
    setCreationError(null);
    setCreationEnCours(true);
    try {
      const res = await authFetch("/users/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, role, email: email || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreationError(
          Array.isArray(data?.detail) ? data.detail[0] : (data?.username?.[0] ?? data?.password?.[0] ?? "Création impossible."),
        );
        return;
      }
      setUsername("");
      setPassword("");
      setRole("LECTURE");
      setEmail("");
      setFormulaireOuvert(false);
      await charger();
    } finally {
      setCreationEnCours(false);
    }
  }

  async function changerRole(compte: CompteUtilisateur, nouveauRole: Role) {
    setError(null);
    setActionEnCours(compte.id);
    try {
      const res = await authFetch(`/users/${compte.id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nouveauRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(Array.isArray(data?.detail) ? data.detail[0] : "Modification impossible.");
        return;
      }
      await charger();
    } finally {
      setActionEnCours(null);
    }
  }

  async function basculerActif(compte: CompteUtilisateur) {
    setError(null);
    setActionEnCours(compte.id);
    try {
      const res = await authFetch(`/users/${compte.id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !compte.is_active }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(Array.isArray(data?.detail) ? data.detail[0] : "Modification impossible.");
        return;
      }
      await charger();
    } finally {
      setActionEnCours(null);
    }
  }

  async function supprimer(compte: CompteUtilisateur) {
    if (!window.confirm(`Supprimer le compte « ${compte.username} » ?`)) return;
    setError(null);
    setActionEnCours(compte.id);
    try {
      const res = await authFetch(`/users/${compte.id}/`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        setError(Array.isArray(data?.detail) ? data.detail[0] : "Suppression impossible.");
        return;
      }
      await charger();
    } finally {
      setActionEnCours(null);
    }
  }

  const inputClass = "min-h-11 rounded-lg border border-line px-3 py-2 text-sm";
  const selectRoleClass =
    "min-h-11 rounded-lg border border-line bg-surface px-2 py-1.5 text-sm outline-none focus:border-accent disabled:opacity-60";

  return (
    <div className="oa-rise flex flex-col gap-5">
      <PageHeader
        icon={Settings}
        eyebrow="Administration"
        title="Paramètres"
        subtitle="Comptes utilisateurs et rôles."
      >
        <ViewToggle mode={preference} onChange={setPreference} />
        <Button onClick={() => setFormulaireOuvert((v) => !v)}>
          {formulaireOuvert ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {formulaireOuvert ? "Annuler" : "Nouveau compte"}
        </Button>
      </PageHeader>

      <CarteApplication />

      {formulaireOuvert ? (
        <GlassCard tone="strong" as="form" onSubmit={creer} className="oa-form oa-rise flex flex-col gap-4 p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-foreground">Nom d&apos;utilisateur *</span>
              <input value={username} onChange={(e) => setUsername(e.target.value)} required className={inputClass} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-foreground">Mot de passe initial *</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-foreground">Rôle</span>
              <select value={role} onChange={(e) => setRole(e.target.value as Role)} className={inputClass}>
                <option value="LECTURE">Lecture seule</option>
                <option value="MAGASINIER">Magasinier</option>
                <option value="ADMIN">Administrateur</option>
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-foreground">E-mail (optionnel)</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Nécessaire pour « mot de passe oublié »"
                className={inputClass}
              />
            </label>
          </div>
          {creationError ? <p className="text-sm text-crit">{creationError}</p> : null}
          <div className="flex justify-end border-t border-line/70 pt-4">
            <Button type="submit" disabled={creationEnCours || !username.trim() || password.length < 8}>
              {creationEnCours ? "Création…" : "Créer le compte"}
            </Button>
          </div>
        </GlassCard>
      ) : null}

      {error ? (
        <ListError
          message={error}
          onRetry={() => {
            setError(null);
            setReloadKey((k) => k + 1);
          }}
        />
      ) : null}

      {!comptes && !error ? <ListSkeleton /> : null}

      {comptes && mode === "liste" ? (
        <TableCard minWidth={720}>
          <THead columns={["Utilisateur", "E-mail", "Rôle", "Statut", ""]} />
          <tbody>
            {comptes.map((c) => {
              const cEstMoi = c.id === moi?.id;
              return (
                <tr key={c.id} className={TABLE_ROW_CLASS}>
                  <td className={TABLE_CELL_CLASS}>
                    <span className="font-medium text-foreground">{c.username}</span>
                    {cEstMoi ? <span className="ml-1.5 text-xs text-muted">(vous)</span> : null}
                  </td>
                  <td className={`${TABLE_CELL_CLASS} text-muted`}>{c.email || "—"}</td>
                  <td className={TABLE_CELL_CLASS}>
                    <select
                      value={c.role}
                      onChange={(e) => changerRole(c, e.target.value as Role)}
                      disabled={cEstMoi || actionEnCours === c.id}
                      className={selectRoleClass}
                    >
                      <option value="LECTURE">{ROLE_LABELS.LECTURE}</option>
                      <option value="MAGASINIER">{ROLE_LABELS.MAGASINIER}</option>
                      <option value="ADMIN">{ROLE_LABELS.ADMIN}</option>
                    </select>
                  </td>
                  <td className={TABLE_CELL_CLASS}>
                    <button
                      onClick={() => basculerActif(c)}
                      disabled={cEstMoi || actionEnCours === c.id}
                      className="disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Badge tone={c.is_active ? "ok" : "neutral"}>{c.is_active ? "Actif" : "Inactif"}</Badge>
                    </button>
                  </td>
                  <td className={`${TABLE_CELL_CLASS} text-right`}>
                    {!cEstMoi ? (
                      <button
                        onClick={() => supprimer(c)}
                        disabled={actionEnCours === c.id}
                        aria-label={`Supprimer ${c.username}`}
                        className="text-muted transition-colors hover:text-crit disabled:opacity-60"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    ) : null}
                  </td>
                </tr>
              );
            })}
            {comptes.length === 0 ? (
              <TableEmptyRow colSpan={5}>Aucun compte.</TableEmptyRow>
            ) : null}
          </tbody>
        </TableCard>
      ) : null}

      {comptes && mode === "cartes" ? (
        comptes.length === 0 ? (
          <GlassCard className="px-4 py-8 text-center text-sm text-muted">Aucun compte.</GlassCard>
        ) : (
          <div className="oa-stagger flex flex-col gap-3">
            {comptes.map((c) => {
              const cEstMoi = c.id === moi?.id;
              return (
                <GlassCard key={c.id} className="flex flex-col gap-3 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-foreground">
                      {c.username}
                      {cEstMoi ? <span className="ml-1.5 text-xs text-muted">(vous)</span> : null}
                    </p>
                    <Badge tone={c.is_active ? "ok" : "neutral"}>{c.is_active ? "Actif" : "Inactif"}</Badge>
                  </div>
                  <p className="truncate text-sm text-muted">{c.email || "—"}</p>
                  <select
                    value={c.role}
                    onChange={(e) => changerRole(c, e.target.value as Role)}
                    disabled={cEstMoi || actionEnCours === c.id}
                    className={`${selectRoleClass} w-full`}
                  >
                    <option value="LECTURE">{ROLE_LABELS.LECTURE}</option>
                    <option value="MAGASINIER">{ROLE_LABELS.MAGASINIER}</option>
                    <option value="ADMIN">{ROLE_LABELS.ADMIN}</option>
                  </select>
                  <button
                    onClick={() => basculerActif(c)}
                    disabled={cEstMoi || actionEnCours === c.id}
                    className="min-h-11 w-full rounded-lg border border-line px-3 text-left text-sm text-foreground transition-colors hover:bg-foreground/[0.04] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {c.is_active ? "Désactiver le compte" : "Réactiver le compte"}
                  </button>
                  {!cEstMoi ? (
                    <Button
                      variant="danger"
                      onClick={() => supprimer(c)}
                      disabled={actionEnCours === c.id}
                      className="w-full"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                      Supprimer le compte
                    </Button>
                  ) : null}
                </GlassCard>
              );
            })}
          </div>
        )
      ) : null}
    </div>
  );
}
