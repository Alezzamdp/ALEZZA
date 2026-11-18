import type { Metadata } from "next";
import type { ReactNode } from "react";

// /turnos es una página de cliente (formulario): sus datos para buscadores se declaran acá.
export const metadata: Metadata = {
  title: "Solicitar turno",
  description: "Pedí turno en ALEZZA DETAIL, Mar del Plata: preparación base, Plan Agencias y servicios sueltos. Cargás los datos del auto y coordinamos por WhatsApp.",
  alternates: { canonical: "/turnos" },
};

export default function TurnosLayout({ children }: { children: ReactNode }) {
  return children;
}
