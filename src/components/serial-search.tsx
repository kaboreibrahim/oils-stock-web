"use client";

// Champ numéro de série avec suggestions en direct — recherche parmi les
// UniteStock existantes (`/unites/?search=`) au fur et à mesure de la frappe,
// avec une icône par type (Flexitank/Heating pad) et le statut courant.
// Sert d'avertissement précoce de doublon (réceptions) et de sélection rapide
// parmi le stock existant (sorties/retours) — dans les deux cas, l'utilisateur
// reste libre de taper un numéro qui n'existe pas encore.
//
// La liste de suggestions est rendue via un portail (document.body), pas en
// `position: absolute` dans le flux normal : `GlassCard` utilise
// `backdrop-blur`, qui crée un nouveau contexte d'empilement CSS — un
// `z-index` posé À L'INTÉRIEUR ne peut jamais dépasser une carte sœur
// suivante, même très élevé (bug réel rencontré : la liste apparaissait sous
// le tableau de la page, cliquable seulement en `force` dans les tests, donc
// pas cliquable du tout pour un vrai utilisateur).

import { Container, Thermometer } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";

import { useAuth } from "@/lib/auth-context";

import { Badge } from "./ui/badge";

const DELAI_DEBOUNCE_MS = 300;
const MAX_SUGGESTIONS = 6;
const LONGUEUR_MIN = 2;

export interface UniteSuggestion {
  id: string;
  numero_serie: string;
  type_article: "FLEXITANK" | "HEATING_PAD";
  fournisseur: string;
  fournisseur_code: string;
  statut: "EN_STOCK" | "SORTIE";
}

const TYPE_ICONS: Record<UniteSuggestion["type_article"], typeof Container> = {
  FLEXITANK: Container,
  HEATING_PAD: Thermometer,
};

const TYPE_LABELS: Record<UniteSuggestion["type_article"], string> = {
  FLEXITANK: "Flexitank",
  HEATING_PAD: "Heating pad",
};

interface Rect {
  top: number;
  left: number;
  width: number;
}

interface SerialSearchProps {
  value: string;
  onChange: (valeur: string) => void;
  /** Appelé en plus de onChange quand l'utilisateur clique une suggestion. */
  onSelect?: (unite: UniteSuggestion) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  required?: boolean;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
}

export function SerialSearch({
  value,
  onChange,
  onSelect,
  placeholder,
  className,
  autoFocus,
  required,
  onKeyDown,
}: SerialSearchProps) {
  const { authFetch } = useAuth();
  const [suggestions, setSuggestions] = useState<UniteSuggestion[]>([]);
  const [ouvert, setOuvert] = useState(false);
  const [chargement, setChargement] = useState(false);
  const [rect, setRect] = useState<Rect | null>(null);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Tout dans le setTimeout (même le cas "trop court") : aucun setState
    // synchrone dans le corps de l'effet lui-même (règle ESLint
    // react-hooks/set-state-in-effect, même contrainte que stock/page.tsx).
    let cancelled = false;
    const valeur = value.trim();
    const timer = setTimeout(async () => {
      if (valeur.length < LONGUEUR_MIN) {
        setSuggestions([]);
        return;
      }
      setChargement(true);
      const res = await authFetch(`/unites/?search=${encodeURIComponent(valeur)}&ordering=numero_serie`);
      if (cancelled) return;
      setChargement(false);
      if (!res.ok) return;
      const data = (await res.json()) as { results: UniteSuggestion[] };
      if (!cancelled) setSuggestions(data.results.slice(0, MAX_SUGGESTIONS));
    }, DELAI_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [authFetch, value]);

  // Position du menu (coordonnées viewport, portail sur document.body) — mise
  // à jour à l'ouverture et tant qu'elle reste ouverte (scroll/redimension).
  useEffect(() => {
    if (!ouvert) return;
    const majPosition = () => {
      const box = wrapperRef.current?.getBoundingClientRect();
      if (box) setRect({ top: box.bottom, left: box.left, width: box.width });
    };
    majPosition();
    window.addEventListener("scroll", majPosition, true);
    window.addEventListener("resize", majPosition);
    return () => {
      window.removeEventListener("scroll", majPosition, true);
      window.removeEventListener("resize", majPosition);
    };
  }, [ouvert, suggestions.length, chargement]);

  function choisir(unite: UniteSuggestion) {
    onChange(unite.numero_serie);
    onSelect?.(unite);
    setOuvert(false);
  }

  const menuVisible = ouvert && value.trim().length >= LONGUEUR_MIN && (chargement || suggestions.length > 0);

  return (
    <div ref={wrapperRef} className={className}>
      <input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOuvert(true);
        }}
        onFocus={() => setOuvert(true)}
        onBlur={() => {
          // Délai court : laisse le temps au onMouseDown d'une suggestion de
          // se déclencher avant que la liste ne disparaisse.
          blurTimer.current = setTimeout(() => setOuvert(false), 150);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOuvert(false);
          onKeyDown?.(e);
        }}
        placeholder={placeholder}
        autoFocus={autoFocus}
        required={required}
        autoComplete="off"
        className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
      />
      {menuVisible && rect
        ? createPortal(
            <div
              style={{ position: "fixed", top: rect.top + 4, left: rect.left, width: rect.width }}
              className="z-50 max-h-64 overflow-y-auto rounded-lg border border-line bg-surface shadow-lg"
            >
              {chargement && suggestions.length === 0 ? (
                <p className="px-3 py-2 text-xs text-muted">Recherche…</p>
              ) : (
                suggestions.map((u) => {
                  const Icon = TYPE_ICONS[u.type_article];
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault(); // évite que le blur ferme la liste avant le clic
                        if (blurTimer.current) clearTimeout(blurTimer.current);
                        choisir(u);
                      }}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-foreground/[0.04]"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <Icon className="h-4 w-4 shrink-0 text-muted" strokeWidth={2} aria-hidden />
                        <span className="truncate font-mono text-xs text-foreground">{u.numero_serie}</span>
                        <span className="shrink-0 text-xs text-muted">{TYPE_LABELS[u.type_article]}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className="font-mono text-[11px] text-muted">{u.fournisseur_code}</span>
                        <Badge tone={u.statut === "EN_STOCK" ? "ok" : "neutral"}>
                          {u.statut === "EN_STOCK" ? "En stock" : "Sorti"}
                        </Badge>
                      </span>
                    </button>
                  );
                })
              )}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
