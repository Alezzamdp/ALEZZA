import type { Metadata } from "next";

// Gestión es parte de BRUNO OS: se instala como app (manifest) y no se indexa.
export const metadata: Metadata = {
  title: "Gestión · BRUNO OS",
  manifest: "/os/manifest.json",
  icons: { apple: "/os/icon-180.png" },
  appleWebApp: { capable: true, title: "BRUNO OS", statusBarStyle: "default" },
  robots: { index: false, follow: false },
};

// Usa el tema de BRUNO OS (invertido desde su versión oscura, ver globals.css).
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return <div className="tema-admin flex flex-1 flex-col">{children}</div>;
}
