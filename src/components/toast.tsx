"use client";

export interface FlashMessage {
  type: "success" | "info";
  text: string;
}

interface ToastProps {
  message: FlashMessage | null;
  onDismiss: () => void;
}

/** Bandeau de notification éphémère (bienvenue, déconnexion...). Purement
 * présentationnel — l'état vient de l'appelant (voir lib/auth-context.tsx). */
export function Toast({ message, onDismiss }: ToastProps) {
  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex justify-center px-4"
    >
      <div className="oa-rise pointer-events-auto flex items-center gap-2.5 rounded-xl border border-glass-border bg-glass-strong px-4 py-2.5 text-sm text-foreground shadow-lg backdrop-blur-xl">
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${
            message.type === "success" ? "bg-ok" : "bg-accent-2"
          }`}
        />
        <span>{message.text}</span>
        <button
          onClick={onDismiss}
          aria-label="Fermer"
          className="ml-1 text-muted hover:text-foreground"
        >
          ×
        </button>
      </div>
    </div>
  );
}
