"use client";

import { useRouter } from "next/navigation";
import { CheckCircle2, Coins, Container, Thermometer, Truck } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { LinkButton } from "@/components/ui/link-button";
import { PageHeader } from "@/components/ui/page-header";
import { useAuth } from "@/lib/auth-context";
import { useConnectivity } from "@/lib/connectivity-context";
import { enfiler } from "@/lib/sync-engine";

export default function NouveauFournisseurPage() {
  const { authFetch, user } = useAuth();
  const { enLigne } = useConnectivity();
  const router = useRouter();

  const [code, setCode] = useState("");
  const [nom, setNom] = useState("");
  const [pays, setPays] = useState("");
  const [contactNom, setContactNom] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactTel, setContactTel] = useState("");
  const [notes, setNotes] = useState("");
  const [seuilFlexitank, setSeuilFlexitank] = useState("");
  const [seuilHeatingPad, setSeuilHeatingPad] = useState("");
  const [delaiLivraison, setDelaiLivraison] = useState("");
  const [stockSecuriteFlexitank, setStockSecuriteFlexitank] = useState("");
  const [stockSecuriteHeatingPad, setStockSecuriteHeatingPad] = useState("");
  const [coutUnitaireFlexitank, setCoutUnitaireFlexitank] = useState("");
  const [coutUnitaireHeatingPad, setCoutUnitaireHeatingPad] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [misEnAttente, setMisEnAttente] = useState(false);

  const estAdmin = user?.role === "ADMIN";

  // Création réservée à l'admin (même permission que le backend, IsAdminOrReadOnly).
  useEffect(() => {
    if (user && !estAdmin) router.replace("/fournisseurs");
  }, [user, estAdmin, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const corps = {
      code, nom, pays,
      contact_nom: contactNom, contact_email: contactEmail, contact_tel: contactTel,
      notes,
      seuil_reappro_flexitank: seuilFlexitank.trim() === "" ? null : Number(seuilFlexitank),
      seuil_reappro_heating_pad: seuilHeatingPad.trim() === "" ? null : Number(seuilHeatingPad),
      delai_livraison_jours: delaiLivraison.trim() === "" ? null : Number(delaiLivraison),
      stock_securite_flexitank: stockSecuriteFlexitank.trim() === "" ? null : Number(stockSecuriteFlexitank),
      stock_securite_heating_pad: stockSecuriteHeatingPad.trim() === "" ? null : Number(stockSecuriteHeatingPad),
      cout_unitaire_flexitank: coutUnitaireFlexitank.trim() === "" ? null : coutUnitaireFlexitank,
      cout_unitaire_heating_pad: coutUnitaireHeatingPad.trim() === "" ? null : coutUnitaireHeatingPad,
    };

    if (!enLigne) {
      await enfiler({
        type: "fournisseur.creer",
        ressourceType: "fournisseur",
        utilisateurId: user!.id,
        methode: "POST",
        chemin: "/fournisseurs/",
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
      const res = await authFetch("/fournisseurs/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corps),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(Array.isArray(data?.detail) ? data.detail[0] : (data?.code?.[0] ?? "Création impossible."));
        return;
      }
      router.push(`/fournisseurs/${data.id}`);
    } finally {
      setEnvoi(false);
    }
  }

  if (user && !estAdmin) return null;

  const inputClass = "rounded-lg border border-line px-3 py-2 text-sm";

  return (
    <div className="oa-rise flex flex-col gap-5">
      <PageHeader
        icon={Truck}
        eyebrow="Répertoire"
        title="Nouveau fournisseur"
        subtitle="Le profil d'extraction se règle ensuite depuis sa fiche."
        backHref="/fournisseurs"
        backLabel="Retour aux fournisseurs"
      />

      {misEnAttente ? (
        <GlassCard tone="strong" className="oa-rise flex flex-col items-start gap-4 p-6">
          <div className="flex items-center gap-2 text-ok">
            <CheckCircle2 className="h-5 w-5" />
            <p className="font-medium text-foreground">Fournisseur mis en attente.</p>
          </div>
          <p className="text-sm text-muted">
            Il apparaîtra dans la liste des fournisseurs et sera envoyé automatiquement au retour du réseau.
          </p>
          <LinkButton href="/fournisseurs" variant="secondary">
            Retour aux fournisseurs
          </LinkButton>
        </GlassCard>
      ) : (
      <GlassCard tone="strong" as="form" onSubmit={handleSubmit} className="oa-form oa-rise flex flex-col gap-4 p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-foreground">Code *</span>
            <input value={code} onChange={(e) => setCode(e.target.value)} required placeholder="Ex. EBONT" className={`${inputClass} font-mono`} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-foreground">Nom *</span>
            <input value={nom} onChange={(e) => setNom(e.target.value)} required placeholder="Ex. Qingdao Ebont Packaging Technology" className={inputClass} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-foreground">Pays</span>
            <input value={pays} onChange={(e) => setPays(e.target.value)} className={inputClass} />
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

        <div className="flex flex-col gap-3 border-t border-line/70 pt-4">
          <div>
            <p className="text-sm font-medium text-foreground">Seuils de réapprovisionnement</p>
            <p className="text-xs text-muted">
              Optionnel. Une alerte s&apos;affiche quand le nombre d&apos;unités en stock de ce type,
              pour ce fournisseur, descend à ce niveau ou en dessous.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                <Container className="h-4 w-4" strokeWidth={2} /> Seuil Flexitank
              </span>
              <input type="number" min={0} value={seuilFlexitank} onChange={(e) => setSeuilFlexitank(e.target.value)} placeholder="Ex. 5" className={inputClass} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                <Thermometer className="h-4 w-4" strokeWidth={2} /> Seuil Heating pad
              </span>
              <input type="number" min={0} value={seuilHeatingPad} onChange={(e) => setSeuilHeatingPad(e.target.value)} placeholder="Ex. 10" className={inputClass} />
            </label>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-line/70 pt-4">
          <div>
            <p className="text-sm font-medium text-foreground">Réapprovisionnement dynamique</p>
            <p className="text-xs text-muted">
              Optionnel. Sert à calculer un point de commande automatique quand aucun seuil
              manuel ci-dessus n&apos;est renseigné pour ce type.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                <Truck className="h-4 w-4" strokeWidth={2} /> Délai de livraison (jours)
              </span>
              <input type="number" min={0} value={delaiLivraison} onChange={(e) => setDelaiLivraison(e.target.value)} placeholder="Ex. 30" className={inputClass} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                <Container className="h-4 w-4" strokeWidth={2} /> Stock sécurité Flexitank
              </span>
              <input type="number" min={0} value={stockSecuriteFlexitank} onChange={(e) => setStockSecuriteFlexitank(e.target.value)} placeholder="Ex. 2" className={inputClass} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                <Thermometer className="h-4 w-4" strokeWidth={2} /> Stock sécurité Heating pad
              </span>
              <input type="number" min={0} value={stockSecuriteHeatingPad} onChange={(e) => setStockSecuriteHeatingPad(e.target.value)} placeholder="Ex. 4" className={inputClass} />
            </label>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-line/70 pt-4">
          <div>
            <p className="text-sm font-medium text-foreground">Valorisation du stock</p>
            <p className="text-xs text-muted">
              Optionnel. Sert à estimer la valeur immobilisée du stock dormant. Laisser vide si
              non applicable — aucune valeur n&apos;est inventée.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                <Coins className="h-4 w-4" strokeWidth={2} /> Coût unitaire Flexitank
              </span>
              <input type="number" min={0} step={0.01} value={coutUnitaireFlexitank} onChange={(e) => setCoutUnitaireFlexitank(e.target.value)} placeholder="Ex. 12.50" className={inputClass} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                <Coins className="h-4 w-4" strokeWidth={2} /> Coût unitaire Heating pad
              </span>
              <input type="number" min={0} step={0.01} value={coutUnitaireHeatingPad} onChange={(e) => setCoutUnitaireHeatingPad(e.target.value)} placeholder="Ex. 8.00" className={inputClass} />
            </label>
          </div>
        </div>

        {error ? <p className="text-sm text-crit">{error}</p> : null}

        {!enLigne ? (
          <p className="rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">
            Hors connexion — ce fournisseur sera mis en attente et synchronisé au retour du réseau.
          </p>
        ) : null}

        <div className="flex justify-end gap-2 border-t border-line/70 pt-4">
          <Button type="submit" disabled={envoi || !code.trim() || !nom.trim()}>
            {envoi ? "Création…" : enLigne ? "Créer le fournisseur" : "Mettre en attente"}
          </Button>
        </div>
      </GlassCard>
      )}
    </div>
  );
}
