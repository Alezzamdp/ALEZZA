import type { Metadata, Viewport } from "next";
import { DM_Sans, IBM_Plex_Mono, Unbounded } from "next/font/google";
import Arranque from "@/components/Arranque";
import FondoPixeles from "@/components/FondoPixeles";
import PortalBar from "@/components/PortalBar";
import { SEO_DESCRIPCION, SEO_IMAGEN, SEO_TITULO } from "@/lib/seo";
import { SCRIPT_TEMA } from "@/lib/tema";
import "./globals.css";

// Fuentes compartidas por el sitio público y BRUNO OS.
const display = Unbounded({ subsets: ["latin"], weight: ["400", "600", "800"], variable: "--f-display" });
const body = DM_Sans({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--f-body" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--f-mono" });

// SEO: título y descripción para Google, vista previa al compartir (Open Graph y Twitter) y permiso para indexar.
// La URL canónica de cada página se declara en la propia página (home, /turnos, /contacto).
export const metadata: Metadata = {
  metadataBase: new URL("https://alezza.com.ar"),
  title: { default: SEO_TITULO, template: "%s · ALEZZA DETAIL" },
  description: SEO_DESCRIPCION,
  applicationName: "ALEZZA DETAIL",
  keywords: ["detail", "detailing", "detail Mar del Plata", "estética vehicular", "estética automotriz Mar del Plata", "pulido de autos", "lavado detallado", "limpieza de interiores", "preparación de autos para vender", "detail para agencias", "ALEZZA"],
  category: "automotive",
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
  openGraph: {
    siteName: "ALEZZA DETAIL", locale: "es_AR", type: "website", url: "/", title: SEO_TITULO, description: SEO_DESCRIPCION,
    images: [{ url: SEO_IMAGEN, width: 1200, height: 630, alt: "ALEZZA DETAIL: Volkswagen Passat CC frente al taller, con el cartel de ALEZZA" }],
  },
  twitter: { card: "summary_large_image", title: SEO_TITULO, description: SEO_DESCRIPCION, images: [SEO_IMAGEN] },
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
        <FondoPixeles />
        {children}
      </body>
    </html>
  );
}
