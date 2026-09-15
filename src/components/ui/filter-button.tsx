import { Filter } from "lucide-react";

interface FilterButtonProps {
  /** Nombre de filtres actuellement actifs — affiché en pastille, masquée si 0. */
  count: number;
  onClick: () => void;
  className?: string;
}

/**
 * Bouton qui ouvre la fenêtre modale des filtres d'un tableau.
 *
 * Volontairement rendu **en ligne** dans l'en-tête de page (à côté de
 * `<ViewToggle>`), pas en `position: fixed` — un bouton flottant ancré au
 * bord de l'écran s'est révélé peu fiable en pratique : ancré en bas, un
 * navigateur mobile peut obliger à scroller pour le faire apparaître
 * (barre d'outils dynamique qui rétrécit/agrandit la zone visible depuis le
 * bas) ; ancré en haut, il chevauche `<ViewToggle>` au même endroit. En
 * ligne dans l'en-tête, toujours visible dès le chargement, sans
 * interaction et sans conflit visuel.
 */
export function FilterButton({ count, onClick, className }: FilterButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={count > 0 ? `Filtres (${count} actif${count > 1 ? "s" : ""})` : "Filtres"}
      className={
        "relative flex h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-sm font-medium text-foreground transition-colors hover:bg-foreground/[0.04] " +
        (className ?? "")
      }
    >
      <Filter className="h-4 w-4" strokeWidth={2} />
      Filtres
      {count > 0 ? (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-semibold text-white">
          {count}
        </span>
      ) : null}
    </button>
  );
}
