import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Build autonome (.next/standalone) : nécessaire pour le déploiement cPanel/Passenger
  // (Setup Node.js App), qui lance server.js directement sans "next start" ni node_modules
  // complet. Voir scripts/copy-standalone-assets.mjs (postbuild) pour public/ et .next/static.
  output: "standalone",

  // Next.js 16 lance par défaut un process `tsc` séparé pour la vérification
  // de types pendant le build (au lieu de l'API TypeScript en mémoire comme
  // avant). Sur l'hébergement cPanel, ce process supplémentaire fait déborder
  // la limite de processus simultanés du compte (LVE) : "spawn ... EAGAIN".
  // On revient à l'ancien comportement (pas de process séparé) ; TypeScript 5
  // (pas 7) est utilisé ici, donc l'API en mémoire reste disponible.
  experimental: {
    useTypeScriptCli: false,
  },

  // Autorise le serveur de dev à répondre aux requêtes venant du tunnel zrok
  // (HMR, RSC...) — sans ça Next bloque les requêtes cross-origin par défaut.
  // Le sous-domaine change à chaque `zrok share`, d'où le wildcard.
  allowedDevOrigins: ["*.share.zrok.io"],

  // Le service worker est un fichier statique (public/sw.js). On force le
  // navigateur à revalider sw.js à chaque chargement (avec updateViaCache:"none"
  // côté register) pour que les mises à jour soient prises en compte, et on
  // fixe explicitement le type MIME + le scope autorisé.
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
