"use client";

import Link from "next/link";
import { AlertTriangle, ChevronRight, Container, Plus, Thermometer, Truck } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
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
import { cn } from "@/lib/utils";

interface Fournisseur {
  id: string;
  code: string;
  nom: string;
  pays: string;
  actif: boolean;
  a_un_profil_extraction: boolean;
  nb_flexitanks: number;
  nb_heating_pads: number;
  seuil_reappro_flexitank: number | null;
  seuil_reappro_heating_pad: number | null;
}

function RepartitionParType({ f }: { f: Fournisseur }) {
  const flexitankEnAlerte = f.seuil_reappro_flexitank !== null && f.nb_flexitanks <= f.seuil_reappro_flexitank;
  const heatingPadEnAlerte = f.seuil_reappro_heating_pad !== null && f.nb_heating_pads <= f.seuil_reappro_heating_pad;
  return (
    <span className="inline-flex items-center gap-3 text-xs">
      <span
        className={cn("inline-flex items-center gap-1", flexitankEnAlerte ? "font-semibold text-crit" : "text-muted")}
        title={flexitankEnAlerte ? `Sous le seuil de réappro (${f.seuil_reappro_flexitank})` : "Flexitanks en stock"}
      >
        {flexitankEnAlerte ? (
          <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2} />
        ) : (
          <Container className="h-3.5 w-3.5" strokeWidth={2} />
        )}
        {f.nb_flexitanks}
      </span>
      <span
        className={cn("inline-flex items-center gap-1", heatingPadEnAlerte ? "font-semibold text-crit" : "text-muted")}
        title={heatingPadEnAlerte ? `Sous le seuil de réappro (${f.seuil_reappro_heating_pad})` : "Heating pads en stock"}
      >
        {heatingPadEnAlerte ? (
          <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2} />
        ) : (
          <Thermometer className="h-3.5 w-3.5" strokeWidth={2} />
        )}
        {f.nb_heating_pads}
      </span>
    </span>
  );
}

export default function FournisseursPage() {
  const { authFetch, user } = useAuth();
  const { etat } = useConnectivity();
  const [items, setItems] = useState<Fournisseur[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const { mode, preference, setPreference } = useViewMode("fournisseurs");

  const estAdmin = user?.role === "ADMIN";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await authFetch("/fournisseurs/?ordering=nom");
      if (cancelled) return;
      if (!res.ok) {
        setError(
          res.status === 503
            ? "Hors connexion — cette page n'a pas encore été consultée en ligne."
            : `Erreur ${res.status} lors du chargement des fournisseurs.`,
        );
        return;
      }
      const data = (await res.json()) as { results: Fournisseur[] };
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
        icon={Truck}
        eyebrow="Répertoire"
        title="Fournisseurs"
        subtitle="Origine des unités en stock. Ouvrez une ligne pour voir sa fiche complète."
      >
        {estAdmin ? (
          <LinkButton href="/fournisseurs/nouveau">
            <Plus className="h-4 w-4" strokeWidth={2} /> Nouveau fournisseur
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

      <PendingCreations ressourceType="fournisseur" titre={(a) => String(a.nom ?? "Nouveau fournisseur")} sousTitre={(a) => (a.code ? String(a.code) : null)} />

      {!items && !error ? <ListSkeleton /> : null}

      {items && mode === "liste" ? (
        <TableCard minWidth={560}>
          <THead columns={["Code", "Nom", "Pays", "Répartition", "Statut", "Extraction", ""]} />
          <tbody>
            {items.map((f) => (
              <tr key={f.id} className={`${TABLE_ROW_CLASS} cursor-pointer`}>
                <td className={`${TABLE_CELL_CLASS} font-mono text-xs`}>
                  <Link href={`/fournisseurs/${f.id}`} className="block">{f.code}</Link>
                </td>
                <td className={`${TABLE_CELL_CLASS} font-medium text-foreground`}>
                  <Link href={`/fournisseurs/${f.id}`} className="block">{f.nom}</Link>
                </td>
                <td className={`${TABLE_CELL_CLASS} text-muted`}>
                  <Link href={`/fournisseurs/${f.id}`} className="block">{f.pays || "—"}</Link>
                </td>
                <td className={TABLE_CELL_CLASS}>
                  <Link href={`/fournisseurs/${f.id}`} className="block">
                    <RepartitionParType f={f} />
                  </Link>
                </td>
                <td className={TABLE_CELL_CLASS}>
                  <Link href={`/fournisseurs/${f.id}`} className="block">
                    <Badge tone={f.actif ? "ok" : "neutral"}>{f.actif ? "Actif" : "Inactif"}</Badge>
                  </Link>
                </td>
                <td className={TABLE_CELL_CLASS}>
                  <Link href={`/fournisseurs/${f.id}`} className="block">
                    <Badge tone={f.a_un_profil_extraction ? "ok" : "neutral"}>
                      {f.a_un_profil_extraction ? "Profil réglé" : "Générique"}
                    </Badge>
                  </Link>
                </td>
                <td className={`${TABLE_CELL_CLASS} text-right`}>
                  <Link href={`/fournisseurs/${f.id}`} className="inline-flex text-muted hover:text-foreground">
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </td>
              </tr>
            ))}
            {items.length === 0 ? (
              <TableEmptyRow colSpan={7}>Aucun fournisseur.</TableEmptyRow>
            ) : null}
          </tbody>
        </TableCard>
      ) : null}

      {items && mode === "cartes" ? (
        items.length === 0 ? (
          <InlineEmpty icon={Truck} title="Aucun fournisseur." />
        ) : (
          <div className="oa-stagger grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((f) => (
              <Link key={f.id} href={`/fournisseurs/${f.id}`} className="block">
                <GlassCard className="oa-lift flex h-full flex-col gap-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-xs text-muted">{f.code}</p>
                      <p className="truncate font-medium text-foreground">{f.nom}</p>
                    </div>
                    <Badge tone={f.actif ? "ok" : "neutral"}>{f.actif ? "Actif" : "Inactif"}</Badge>
                  </div>
                  <div className="flex items-center justify-between gap-2 border-t border-line/70 pt-3">
                    <span className="text-sm text-muted">{f.pays || "—"}</span>
                    <RepartitionParType f={f} />
                  </div>
                  <div className="flex items-center justify-end">
                    <Badge tone={f.a_un_profil_extraction ? "ok" : "neutral"}>
                      {f.a_un_profil_extraction ? "Profil réglé" : "Générique"}
                    </Badge>
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
