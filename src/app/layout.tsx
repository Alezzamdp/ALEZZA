import type { Metadata, Viewport } from "next";
import { DM_Sans, IBM_Plex_Mono, Unbounded } from "next/font/google";
import Arranque from "@/components/Arranque";
import PortalBar from "@/components/PortalBar";
import { SCRIPT_TEMA } from "@/lib/tema";
import "./globals.css";

// Las mismas fuentes de BRUNO OS en todos los portales.
const display = Unbounded({ subsets: ["latin"], weight: ["400", "600", "800"], variable: "--f-display" });
const body = DM_Sans({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--f-body" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--f-mono" });

export const metadata: Metadata = {
  title: "ALEZZA — Asesoría automotor integral · Mar del Plata",
  description: "Compra, venta y permuta de autos, financiación en pesos y estética automotriz para particulares, vendedores y agencias en Mar del Plata.",
  // Instalable en el iPhone desde cualquier portal (Compartir → Agregar a inicio): abre BRUNO OS a pantalla completa.
  manifest: "/os/manifest.json",
  icons: { apple: "/os/icon-180.png" },
  appleWebApp: { capable: true, title: "ALEZZA", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

// viewportFit "cover": usa toda la pantalla del iPhone (con notch); los bordes se cuidan con safe-area en globals.css.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3efe6" },
    { media: "(prefers-color-scheme: dark)", color: "#14130f" },
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
