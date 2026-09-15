"use client";

import Link from "next/link";
import { ChevronRight, Plus, Users } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { CardField } from "@/components/ui/card-field";
import {
  TABLE_CELL_CLASS,
  TABLE_ROW_CLASS,
  TableCard,
  TableEmptyRow,
  THead,
} from "@/components/ui/data-table";
import { GlassCard } from "@/components/ui/glass-card";
import { InlineEmpty, ListError, ListSkeleton, StaleNote } from "@/components/ui/list-states";
import { LinkButton } from "@/components/ui/link-button";
import { PageHeader } from "@/components/ui/page-header";
import { ViewToggle } from "@/components/ui/view-toggle";
import { PendingCreations } from "@/components/pending-creations";
import { useAuth } from "@/lib/auth-context";
import { useConnectivity } from "@/lib/connectivity-context";
import { useViewMode } from "@/lib/use-view-mode";

interface Client {
  id: string;
  code: string;
  nom: string;
  pays: string;
  actif: boolean;
}

export default function ClientsPage() {
  const { authFetch, user } = useAuth();
  const { etat } = useConnectivity();
  const [items, setItems] = useState<Client[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const { mode, preference, setPreference } = useViewMode("clients");

  const peutEcrire = user?.role === "ADMIN" || user?.role === "MAGASINIER";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await authFetch("/clients/?ordering=nom");
      if (cancelled) return;
      if (!res.ok) {
        setError(
          res.status === 503
            ? "Hors connexion — cette page n'a pas encore été consultée en ligne."
            : `Erreur ${res.status} lors du chargement des clients.`,
        );
        return;
      }
      const data = (await res.json()) as { results: Client[] };
      setError(null);
      setItems(data.results);
    })();
    return () => {
      cancelled = true;
    };
  }, [authFetch, reloadKey]);

  return (
    <div className="oa-rise flex flex-col gap-5">
      <PageHeader
        icon={Users}
        eyebrow="Répertoire"
        title="Clients"
        subtitle="Destinataires des sorties de stock."
      >
        {peutEcrire ? (
          <LinkButton href="/clients/nouveau">
            <Plus className="h-4 w-4" strokeWidth={2} /> Nouveau client
          </LinkButton>
        ) : (
          <Badge tone="neutral">Lecture seule</Badge>
        )}
        <ViewToggle mode={preference} onChange={setPreference} />
      </PageHeader>

      {error ? (
        <ListError
          message={error}
          onRetry={() => {
            setError(null);
            setReloadKey((k) => k + 1);
          }}
        />
      ) : null}

      {items && items.length > 0 && etat === "hors_ligne" ? <StaleNote /> : null}

      <PendingCreations ressourceType="client" titre={(a) => String(a.nom ?? "Nouveau client")} sousTitre={(a) => (a.code ? String(a.code) : null)} />

      {!items && !error ? <ListSkeleton rows={2} /> : null}

      {items && mode === "liste" ? (
        <TableCard minWidth={480}>
          <THead columns={["Code", "Nom", "Pays", "Statut", ""]} />
          <tbody>
            {items.map((c) => (
              <tr key={c.id} className={`${TABLE_ROW_CLASS} cursor-pointer`}>
                <td className={`${TABLE_CELL_CLASS} font-mono text-xs`}>
                  <Link href={`/clients/${c.id}`} className="block">{c.code}</Link>
                </td>
                <td className={`${TABLE_CELL_CLASS} font-medium text-foreground`}>
                  <Link href={`/clients/${c.id}`} className="block">{c.nom}</Link>
                </td>
                <td className={`${TABLE_CELL_CLASS} text-muted`}>
                  <Link href={`/clients/${c.id}`} className="block">{c.pays || "—"}</Link>
                </td>
                <td className={TABLE_CELL_CLASS}>
                  <Link href={`/clients/${c.id}`} className="block">
                    <Badge tone={c.actif ? "ok" : "neutral"}>{c.actif ? "Actif" : "Inactif"}</Badge>
                  </Link>
                </td>
                <td className={`${TABLE_CELL_CLASS} text-right`}>
                  <Link href={`/clients/${c.id}`} className="inline-flex text-muted hover:text-foreground">
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </td>
              </tr>
            ))}
            {items.length === 0 ? (
              <TableEmptyRow colSpan={5}>Aucun client pour l&apos;instant.</TableEmptyRow>
            ) : null}
          </tbody>
        </TableCard>
      ) : null}

      {items && mode === "cartes" ? (
        items.length === 0 ? (
          <InlineEmpty icon={Users} title="Aucun client pour l'instant." />
        ) : (
          <div className="oa-stagger grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((c) => (
              <Link key={c.id} href={`/clients/${c.id}`} className="block">
                <GlassCard className="oa-lift flex h-full flex-col gap-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-xs text-muted">{c.code}</p>
                      <p className="truncate font-medium text-foreground">{c.nom}</p>
                    </div>
                    <Badge tone={c.actif ? "ok" : "neutral"}>{c.actif ? "Actif" : "Inactif"}</Badge>
                  </div>
                  <div className="border-t border-line/70 pt-3">
                    <CardField label="Pays">{c.pays || "—"}</CardField>
                  </div>
                </GlassCard>
              </Link>
            ))}
          </div>
        )
      ) : null}
    </div>
  );
}
