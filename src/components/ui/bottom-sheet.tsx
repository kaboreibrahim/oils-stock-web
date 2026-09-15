"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { useOverlayHistory } from "@/lib/use-overlay-history";
import { cn } from "@/lib/utils";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  ariaLabel: string;
  children: ReactNode;
  className?: string;
}

const SEUIL_FERMETURE_PX = 80;

/** Feuille qui monte du bas de l'écran. Rendue via un portail (comme Modal, à
 *  cause de backdrop-blur qui crée un contexte d'empilement). Poignée + glisser
 *  vers le bas pour fermer, safe-area basse, retour Android (useOverlayHistory). */
export function BottomSheet({ open, onClose, ariaLabel, children, className }: BottomSheetProps) {
  const [dragY, setDragY] = useState(0);
  const [glisse, setGlisse] = useState(false);
  const startYRef = useRef(0);
  const panneauRef = useRef<HTMLDivElement>(null);

  const fermer = useCallback(() => onClose(), [onClose]);
  useOverlayHistory(open, fermer);

  useEffect(() => {
    if (!open) return;
    const precedent = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const surTouche = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") piegerFocus(e, panneauRef.current);
    };
    window.addEventListener("keydown", surTouche);
    const t = setTimeout(() => {
      panneauRef.current?.querySelector<HTMLElement>("button, [href], input")?.focus();
    }, 60);
    return () => {
      document.body.style.overflow = precedent;
      window.removeEventListener("keydown", surTouche);
      clearTimeout(t);
    };
  }, [open, onClose]);

  if (!open) return null;

  const onPointerDown = (e: React.PointerEvent) => {
    startYRef.current = e.clientY;
    setGlisse(true);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!glisse) return;
    const delta = e.clientY - startYRef.current;
    setDragY(delta > 0 ? delta : 0);
  };
  const onPointerUp = () => {
    if (!glisse) return;
    setGlisse(false);
    if (dragY > SEUIL_FERMETURE_PX) onClose();
    setDragY(0);
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div onClick={onClose} aria-hidden className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div
        ref={panneauRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        style={{
          transform: dragY ? `translateY(${dragY}px)` : undefined,
          transition: glisse ? "none" : "transform 240ms cubic-bezier(0.22,1,0.36,1)",
        }}
        className={cn(
          "oa-rise relative w-full max-w-md rounded-t-2xl border-x-0 border-b-0 border-t border-glass-border bg-glass-strong px-5 pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-[0_-8px_40px_-12px_var(--shadow-2)] backdrop-blur-xl",
          className,
        )}
      >
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="mx-auto mb-3 h-1.5 w-10 cursor-grab touch-none rounded-full bg-foreground/20 active:cursor-grabbing"
        />
        {children}
      </div>
    </div>,
    document.body,
  );
}

function piegerFocus(e: KeyboardEvent, racine: HTMLElement | null) {
  if (!racine) return;
  const cibles = racine.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
  );
  if (cibles.length === 0) return;
  const premier = cibles[0];
  const dernier = cibles[cibles.length - 1];
  if (e.shiftKey && document.activeElement === premier) {
    e.preventDefault();
    dernier.focus();
  } else if (!e.shiftKey && document.activeElement === dernier) {
    e.preventDefault();
    premier.focus();
  }
}
