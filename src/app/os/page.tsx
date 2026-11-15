import type { Metadata } from "next";
import BrunoOS from "./BrunoOS";
import "./bruno.css";

export const metadata: Metadata = {
  title: "BRUNO OS",
  description: "Agenda, tareas, ideas y todas las apps de ALEZZA.",
  manifest: "/os/manifest.json",
  icons: { icon: "/os/icon-192.png", apple: "/os/icon-180.png" },
  robots: { index: false, follow: false },
};

export default function Page() {
  return <BrunoOS />;
}
