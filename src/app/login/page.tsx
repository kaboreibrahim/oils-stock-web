"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { apiErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type Phase = "idle" | "success" | "revealing";

export default function LoginPage() {
  const router = useRouter();
  const { status, login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [shake, setShake] = useState(false);
  // Passe à true dès qu'une connexion réussie démarre son animation : empêche
  // l'effet ci-dessous de court-circuiter le « rideau » par une redirection sèche.
  const revealingRef = useRef(false);

  useEffect(() => {
    if (status === "authenticated" && !revealingRef.current) router.replace("/");
  }, [status, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting || phase !== "idle") return;
    setError(null);
    setShake(false);
    setSubmitting(true);
    try {
      await login(username, password);
      revealingRef.current = true;
      const reduced =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      setPhase("success");
      await sleep(reduced ? 150 : 950);
      setPhase("revealing");
      await sleep(reduced ? 50 : 880);
      router.replace("/");
    } catch (err) {
      setSubmitting(false);
      setError(apiErrorMessage(err, "Connexion impossible. Vérifiez vos identifiants."));
      setShake(true);
      setTimeout(() => setShake(false), 550);
    }
  }

  const opening = phase === "revealing";

  return (
    <div className="relative flex min-h-[100dvh] flex-1 items-center justify-center overflow-hidden px-4">
      {/* Ce qui apparaît quand les panneaux s'écartent. */}
      <div className="oa-reveal" aria-hidden>
        {opening ? (
          <Image
            src="/oils-of-africa-logo.png"
            alt=""
            width={200}
            height={200}
            className="oa-reveal-logo object-contain"
          />
        ) : null}
      </div>

      {/* Les deux moitiés du fond, qui glissent chacune de son côté. */}
      <div
        className={`oa-panel oa-panel-left ${opening ? "oa-panel-open" : ""}`}
        aria-hidden
      />
      <div
        className={`oa-panel oa-panel-right ${opening ? "oa-panel-open" : ""}`}
        aria-hidden
      />
      {opening ? <div className="oa-seam" aria-hidden /> : null}

      {/* Carte de connexion. */}
      <div className="oa-card-enter relative z-20 w-full max-w-sm">
        <div
          className={`rounded-xl border border-line bg-surface p-8 shadow-sm ${
            phase !== "idle" ? "oa-card-ok" : ""
          } ${opening ? "oa-card-leaving" : ""} ${shake ? "oa-shake" : ""}`}
        >
          <div className="flex flex-col items-center text-center">
            <div className="oa-logo mb-3 h-24 w-24 sm:h-28 sm:w-28">
              <Image
                src="/oils-of-africa-logo.png"
                alt="Oils of Africa"
                width={200}
                height={200}
                priority
                className="h-full w-full object-contain"
              />
            </div>
            <h1 className="text-xl font-semibold text-foreground">Gestion de stock</h1>
            <p className="mt-1 text-sm text-muted">Connectez-vous pour continuer.</p>
          </div>

          {phase === "idle" ? (
            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
              <label className="oa-fade-1 flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-foreground">Identifiant</span>
                <input
                  className="rounded-md border border-line bg-background px-3 py-2 text-sm outline-none focus:border-accent"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                  autoFocus
                />
              </label>
              <label className="oa-fade-2 flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-foreground">Mot de passe</span>
                <input
                  type="password"
                  className="rounded-md border border-line bg-background px-3 py-2 text-sm outline-none focus:border-accent"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </label>

              {error ? (
                <p
                  role="alert"
                  className="oa-error rounded-md bg-crit/10 px-3 py-2 text-sm text-crit"
                >
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                className="oa-fade-3 mt-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="oa-spinner" aria-hidden />
                    Connexion…
                  </span>
                ) : (
                  "Se connecter"
                )}
              </button>
            </form>
          ) : (
            <div
              role="status"
              aria-live="polite"
              className="mt-6 flex flex-col items-center gap-2 py-3"
            >
              <svg className="oa-success-icon" viewBox="0 0 56 56" aria-hidden>
                <circle className="oa-success-ring" cx="28" cy="28" r="23" />
                <path className="oa-success-check" d="M17 29l7 7 15-15" />
              </svg>
              <p className="oa-success-text text-sm font-medium text-ok">Accès autorisé</p>
              <p className="oa-success-text text-xs text-muted">
                Ouverture de votre espace…
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
