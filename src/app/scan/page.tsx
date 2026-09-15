"use client";

// Écran plein écran mobile (Jalon 5) : caméra -> OCR (POST /unites/scanner/)
// -> liste de numéros détectés, chacun avec les unités qu'il résout. Sans
// `?sortie=<id>`, sert juste à résoudre un numéro (statut de l'unité).
// Avec `?sortie=<id>` (lien depuis la sortie en brouillon), un bouton
// "Ajouter" pousse directement l'unité vers POST /sorties/{id}/lignes/
// (même endpoint que la saisie manuelle du Jalon 2).
//
// Nécessite un contexte sécurisé (HTTPS, ou localhost) pour getUserMedia —
// voir le README pour le HTTPS local (`next dev --experimental-https -H <ip>`).
// La saisie manuelle reste toujours disponible, caméra ou pas.

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { GlassCard } from "@/components/ui/glass-card";
import { useAuth } from "@/lib/auth-context";

interface UniteStock {
  id: string;
  numero_serie: string;
  code_interne: string | null;
  type_article: "FLEXITANK" | "HEATING_PAD";
  fournisseur: string;
  fournisseur_code: string;
  statut: "EN_STOCK" | "SORTIE";
  date_entree: string;
  date_sortie: string | null;
}

interface CandidatScan {
  candidat: string;
  unites: UniteStock[];
}

const TYPE_LABELS: Record<UniteStock["type_article"], string> = {
  FLEXITANK: "Flexitank",
  HEATING_PAD: "Heating pad",
};

type EtapeCamera = "demarrage" | "active" | "indisponible";

export default function ScanPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[100dvh] items-center justify-center bg-black">
          <Loader2 className="h-6 w-6 animate-spin text-white/60" />
        </div>
      }
    >
      <ScanEcran />
    </Suspense>
  );
}

function ScanEcran() {
  const { status, user, authFetch } = useAuth();
  const router = useRouter();
  const sortieId = useSearchParams().get("sortie");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [etapeCamera, setEtapeCamera] = useState<EtapeCamera>("demarrage");
  const [erreurCamera, setErreurCamera] = useState<string | null>(null);
  const [analyseEnCours, setAnalyseEnCours] = useState(false);
  const [candidats, setCandidats] = useState<CandidatScan[] | null>(null);
  const [erreurScan, setErreurScan] = useState<string | null>(null);
  const [valeurManuelle, setValeurManuelle] = useState("");
  const [rechercheEnCours, setRechercheEnCours] = useState(false);
  const [unitesEnAjout, setUnitesEnAjout] = useState<Set<string>>(new Set());
  const [unitesAjoutees, setUnitesAjoutees] = useState<Set<string>>(new Set());
  const [messageAjout, setMessageAjout] = useState<string | null>(null);

  const peutEcrire = user?.role === "ADMIN" || user?.role === "MAGASINIER";
  const modeSortie = peutEcrire && !!sortieId;

  useEffect(() => {
    if (status === "anonymous") router.replace("/login");
  }, [status, router]);

  // Démarrage caméra — coupée proprement au démontage (retour arrière, etc.).
  useEffect(() => {
    if (status !== "authenticated") return;
    let annule = false;
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error(
            window.isSecureContext
              ? "Caméra non prise en charge par ce navigateur."
              : "La caméra nécessite une connexion sécurisée (HTTPS) sur ce réseau — voir le README pour le HTTPS local.",
          );
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (annule) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setEtapeCamera("active");
      } catch (err) {
        if (annule) return;
        setEtapeCamera("indisponible");
        setErreurCamera(
          err instanceof Error ? err.message : "Impossible d'accéder à la caméra.",
        );
      }
    })();
    return () => {
      annule = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [status]);

  const traiterResultats = useCallback((resultats: CandidatScan[]) => {
    if (resultats.length === 0 || resultats.every((r) => r.unites.length === 0)) {
      setErreurScan(
        resultats.length === 0
          ? "Aucun numéro détecté — reprenez la photo ou saisissez-le à la main."
          : "Aucune unité connue avec le(s) numéro(s) détecté(s).",
      );
    }
    setCandidats(resultats);
  }, []);

  async function capturer() {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;
    setAnalyseEnCours(true);
    setErreurScan(null);
    setCandidats(null);
    setMessageAjout(null);
    try {
      const canvas = canvasRef.current ?? document.createElement("canvas");
      canvasRef.current = canvas;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Capture impossible.");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.92),
      );
      if (!blob) throw new Error("Capture impossible.");
      const form = new FormData();
      form.append("image", blob, "scan.jpg");
      const res = await authFetch("/unites/scanner/", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setErreurScan(Array.isArray(data?.detail) ? data.detail[0] : "Analyse impossible.");
        return;
      }
      traiterResultats(data as CandidatScan[]);
    } finally {
      setAnalyseEnCours(false);
    }
  }

  async function rechercherManuellement() {
    const valeur = valeurManuelle.trim();
    if (!valeur) return;
    setRechercheEnCours(true);
    setErreurScan(null);
    setMessageAjout(null);
    try {
      const res = await authFetch(`/unites/lookup/?q=${encodeURIComponent(valeur)}`);
      const data = await res.json();
      if (!res.ok) {
        setErreurScan("Recherche impossible.");
        return;
      }
      traiterResultats([{ candidat: valeur, unites: data as UniteStock[] }]);
    } finally {
      setRechercheEnCours(false);
    }
  }

  function nouveauScan() {
    setCandidats(null);
    setErreurScan(null);
    setMessageAjout(null);
    setValeurManuelle("");
  }

  async function ajouterAUneSortie(unite: UniteStock) {
    if (!sortieId) return;
    setUnitesEnAjout((s) => new Set(s).add(unite.id));
    setMessageAjout(null);
    try {
      const res = await authFetch(`/sorties/${sortieId}/lignes/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numero_serie: unite.numero_serie, fournisseur: unite.fournisseur }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessageAjout(Array.isArray(data?.detail) ? data.detail[0] : "Ajout impossible.");
        return;
      }
      setUnitesAjoutees((s) => new Set(s).add(unite.id));
      setMessageAjout(`${unite.numero_serie} ajouté à la sortie.`);
    } finally {
      setUnitesEnAjout((s) => {
        const next = new Set(s);
        next.delete(unite.id);
        return next;
      });
    }
  }

  if (status !== "authenticated" || !user) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-black">
        <Loader2 className="h-6 w-6 animate-spin text-white/60" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-[100dvh] flex-col bg-black">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 h-full w-full object-cover"
      />
      <canvas ref={canvasRef} className="hidden" />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/70 via-black/5 to-transparent"
        aria-hidden
      />

      <header className="relative z-10 flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
        <button
          onClick={() => router.back()}
          aria-label="Retour"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur transition-colors hover:bg-black/55"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <p className="rounded-full bg-black/40 px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-white backdrop-blur">
          {modeSortie ? "Ajout à la sortie" : "Résoudre un numéro"}
        </p>
        <span className="w-9" aria-hidden />
      </header>

      {/* Cadre de visée décoratif. */}
      <div className="pointer-events-none relative z-10 mx-auto mt-[18vh] hidden aspect-[5/2] w-[78%] max-w-sm rounded-2xl border-2 border-white/40 sm:block" aria-hidden />

      <div className="relative z-10 mt-auto">
        <GlassCard
          tone="strong"
          className="oa-form flex max-h-[75vh] flex-col gap-3 rounded-b-none border-x-0 border-b-0 p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]"
        >
          {etapeCamera === "indisponible" ? (
            <p className="rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">{erreurCamera}</p>
          ) : null}

          {!candidats ? (
            <div className="flex flex-col items-center gap-2 py-1">
              <button
                onClick={capturer}
                disabled={etapeCamera !== "active" || analyseEnCours}
                aria-label="Capturer une photo"
                className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-accent bg-accent-soft text-accent-strong transition-transform active:scale-95 disabled:opacity-50"
              >
                {analyseEnCours ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <Camera className="h-7 w-7" />
                )}
              </button>
              <p className="text-xs text-muted">Cadrez le numéro de série puis capturez.</p>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Résultat</h2>
              <Button variant="secondary" onClick={nouveauScan}>
                <RefreshCw className="h-4 w-4" /> Nouveau scan
              </Button>
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              value={valeurManuelle}
              onChange={(e) => setValeurManuelle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  rechercherManuellement();
                }
              }}
              placeholder="Ou saisissez le numéro à la main"
              className="flex-1 px-3 py-2 text-sm text-foreground"
            />
            <Button
              variant="secondary"
              onClick={rechercherManuellement}
              disabled={rechercheEnCours || !valeurManuelle.trim()}
              aria-label="Rechercher"
            >
              {rechercheEnCours ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </div>

          {erreurScan ? <p className="rounded-lg bg-crit/10 px-3 py-2 text-sm text-crit">{erreurScan}</p> : null}
          {messageAjout ? (
            <p className="rounded-lg bg-ok-soft px-3 py-2 text-sm text-ok">{messageAjout}</p>
          ) : null}

          {candidats ? (
            <div className="flex flex-col gap-3 overflow-y-auto">
              {candidats.map((c) => (
                <div key={c.candidat} className="flex flex-col gap-1.5">
                  <Eyebrow>{c.candidat}</Eyebrow>
                  {c.unites.length === 0 ? (
                    <p className="flex items-center gap-1.5 text-sm text-crit">
                      <XCircle className="h-4 w-4 shrink-0" /> Aucune unité connue avec ce numéro.
                    </p>
                  ) : (
                    c.unites.map((u) => (
                      <div
                        key={u.id}
                        className="oa-lift flex items-center justify-between gap-3 rounded-lg border border-line bg-surface px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-mono text-sm text-foreground">{u.numero_serie}</p>
                          <p className="truncate text-xs text-muted">
                            {TYPE_LABELS[u.type_article]} · {u.fournisseur_code}
                          </p>
                        </div>
                        {modeSortie ? (
                          unitesAjoutees.has(u.id) ? (
                            <Badge tone="ok">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Ajouté
                            </Badge>
                          ) : u.statut !== "EN_STOCK" ? (
                            <Badge tone="neutral">Sorti</Badge>
                          ) : (
                            <Button
                              onClick={() => ajouterAUneSortie(u)}
                              disabled={unitesEnAjout.has(u.id)}
                            >
                              {unitesEnAjout.has(u.id) ? "Ajout…" : "Ajouter"}
                            </Button>
                          )
                        ) : (
                          <Badge tone={u.statut === "EN_STOCK" ? "ok" : "neutral"}>
                            {u.statut === "EN_STOCK" ? "En stock" : "Sorti"}
                          </Badge>
                        )}
                      </div>
                    ))
                  )}
                </div>
              ))}
            </div>
          ) : null}

          {modeSortie ? (
            <Link href={`/sorties/${sortieId}`} className="text-center text-sm text-muted hover:text-foreground">
              Retour à la sortie
            </Link>
          ) : null}
        </GlassCard>
      </div>
    </div>
  );
}
