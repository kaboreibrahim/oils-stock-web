import { cn } from "@/lib/utils";

/** Bloc de chargement animé — remplace un contenu le temps d'une requête. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-lg bg-foreground/[0.06]", className)}
      aria-hidden
    />
  );
}
