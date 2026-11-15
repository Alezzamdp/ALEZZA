import type { Metadata } from "next";
import { mpHabilitado } from "@/lib/mercadopago";
import EstadoTurno from "./EstadoTurno";

export const metadata: Metadata = { title: "Tu turno · ALEZZA", robots: { index: false, follow: false } };

// Enlace privado del cliente: estado del turno y pago de la seña.
export default async function Page({ params }: PageProps<"/turnos/[token]">) {
  const { token } = await params;
  return <EstadoTurno token={token} mp={mpHabilitado()} />;
}
