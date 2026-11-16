import type { Metadata, Viewport } from "next";
import { DM_Sans, IBM_Plex_Mono, Unbounded } from "next/font/google";
import Arranque from "@/components/Arranque";
import PortalBar from "@/components/PortalBar";
import { SCRIPT_TEMA } from "@/lib/tema";
import "./globals.css";

// Fuentes compartidas por el sitio público y BRUNO OS.
const display = Unbounded({ subsets: ["latin"], weight: ["400", "600", "800"], variable: "--f-display" });
const body = DM_Sans({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--f-body" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--f-mono" });

export const metadata: Metadata = {
  metadataBase: new URL("https://alezza.com.ar"),
  openGraph: { siteName: "ALEZZA", locale: "es_AR", type: "website" },
  title: "ALEZZA — Estética automotriz y venta de autos · Mar del Plata",
  description: "Preparación estética de unidades para agencias, vendedores y particulares en Mar del Plata. Catálogo de autos y financiación en pesos.",
  formatDetection: { telephone: false },
};

// viewportFit "cover": usa toda la pantalla del iPhone (con notch); los bordes se cuidan con safe-area en globals.css.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // data-tema lo pone el script antes de pintar (evita el destello); por eso se ignora la diferencia al hidratar.
    <html lang="es-AR" suppressHydrationWarning className={`${display.variable} ${body.variable} ${mono.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <Arranque />
        <PortalBar />
        {children}
      </body>
    </html>
  );
}
