"use client";

import { useRouter } from "next/navigation";
import { CheckCircle2, Users } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { LinkButton } from "@/components/ui/link-button";
import { PageHeader } from "@/components/ui/page-header";
import { useAuth } from "@/lib/auth-context";
import { useConnectivity } from "@/lib/connectivity-context";
import { enfiler } from "@/lib/sync-engine";

export default function NouveauClientPage() {
  const { authFetch, user } = useAuth();
  const { enLigne } = useConnectivity();
  const router = useRouter();

  const [code, setCode] = useState("");
  const [nom, setNom] = useState("");
  const [pays, setPays] = useState("");
  const [adresse, setAdresse] = useState("");
  const [contactNom, setContactNom] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactTel, setContactTel] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [misEnAttente, setMisEnAttente] = useState(false);

  const peutEcrire = user?.role === "ADMIN" || user?.role === "MAGASINIER";

  // Création réservée magasinier + admin (même permission que le backend, IsMagasinierOrReadOnly).
  useEffect(() => {
    if (user && !peutEcrire) router.replace("/clients");
  }, [user, peutEcrire, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const corps = {
      code, nom, pays, adresse,
      contact_nom: contactNom, contact_email: contactEmail, contact_tel: contactTel,
      notes,
    };

    if (!enLigne) {
      await enfiler({
        type: "client.creer",
        ressourceType: "client",
        utilisateurId: user!.id,
        methode: "POST",
        chemin: "/clients/",
        corps,
        apercu: { code, nom, pays },
      });
      // Pas de redirection automatique : voir la note dans sorties/nouvelle/page.tsx
      // sur l'échec réseau d'une navigation client-side hors ligne.
      setMisEnAttente(true);
      return;
    }

    setEnvoi(true);
    try {
      const res = await authFetch("/clients/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corps),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(Array.isArray(data?.detail) ? data.detail[0] : (data?.code?.[0] ?? "Création impossible."));
        return;
      }
      router.push(`/clients/${data.id}`);
    } finally {
      setEnvoi(false);
    }
  }

  if (user && !peutEcrire) return null;

  const inputClass = "rounded-lg border border-line px-3 py-2 text-sm";

  return (
    <div className="oa-rise flex flex-col gap-5">
      <PageHeader
        icon={Users}
        eyebrow="Répertoire"
        title="Nouveau client"
        subtitle="Destinataire disponible ensuite dans le choix des sorties."
        backHref="/clients"
        backLabel="Retour aux clients"
      />

      {misEnAttente ? (
        <GlassCard tone="strong" className="oa-rise flex flex-col items-start gap-4 p-6">
          <div className="flex items-center gap-2 text-ok">
            <CheckCircle2 className="h-5 w-5" />
            <p className="font-medium text-foreground">Client mis en attente.</p>
          </div>
          <p className="text-sm text-muted">
            Il apparaîtra dans la liste des clients et sera envoyé automatiquement au retour du réseau.
          </p>
          <LinkButton href="/clients" variant="secondary">
            Retour aux clients
          </LinkButton>
        </GlassCard>
      ) : (
      <GlassCard tone="strong" as="form" onSubmit={handleSubmit} className="oa-form oa-rise flex flex-col gap-4 p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-foreground">Code *</span>
            <input value={code} onChange={(e) => setCode(e.target.value)} required placeholder="Ex. SOFIT" className={`${inputClass} font-mono`} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-foreground">Nom *</span>
            <input value={nom} onChange={(e) => setNom(e.target.value)} required placeholder="Ex. Société Ivoirienne des Textiles" className={inputClass} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-foreground">Pays</span>
            <input value={pays} onChange={(e) => setPays(e.target.value)} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-foreground">Adresse</span>
            <input value={adresse} onChange={(e) => setAdresse(e.target.value)} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-foreground">Contact</span>
            <input value={contactNom} onChange={(e) => setContactNom(e.target.value)} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-foreground">E-mail</span>
            <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-foreground">Téléphone</span>
            <input value={contactTel} onChange={(e) => setContactTel(e.target.value)} className={inputClass} />
          </label>
        </div>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-foreground">Notes</span>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={inputClass} />
        </label>

        {error ? <p className="text-sm text-crit">{error}</p> : null}

        {!enLigne ? (
          <p className="rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">
            Hors connexion — ce client sera mis en attente et synchronisé au retour du réseau.
          </p>
        ) : null}

        <div className="flex justify-end gap-2 border-t border-line/70 pt-4">
          <Button type="submit" disabled={envoi || !code.trim() || !nom.trim()}>
            {envoi ? "Création…" : enLigne ? "Créer le client" : "Mettre en attente"}
          </Button>
        </div>
      </GlassCard>
      )}
    </div>
  );
}
