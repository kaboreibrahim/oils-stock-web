import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { ConnectivityProvider } from "@/lib/connectivity-context";
import { PwaProvider } from "@/lib/pwa-context";

// Doit rester synchronisé avec THEME_STORAGE_KEY dans lib/theme.ts — ce script
// s'exécute avant l'hydratation (strategy="beforeInteractive") et ne peut donc
// pas importer ce module. Pose l'attribut avant la première peinture pour
// éviter un flash clair→sombre ; s'il n'y a rien en localStorage (ou "system"),
// on ne touche à rien et @media (prefers-color-scheme) prend le relais côté CSS.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("oils-stock-theme");
    if (stored === "light" || stored === "dark") {
      document.documentElement.setAttribute("data-theme", stored);
    }
  } catch (e) {}
})();
`;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f6fa" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1220" },
  ],
  colorScheme: "light dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  applicationName: "Stock",
  title: "Oils of Africa — Stock",
  description: "Gestion de stock : flexitanks et heating pads.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Stock", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Script id="oa-theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
        <PwaProvider>
          <ConnectivityProvider>
            <AuthProvider>{children}</AuthProvider>
          </ConnectivityProvider>
        </PwaProvider>
      </body>
    </html>
  );
}
