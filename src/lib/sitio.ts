// Datos que comparten las páginas públicas (Inicio y Servicios): contacto y precios vigentes.
import { readPublicProfile } from "@/components/StockVehiculos";
import { supabase } from "@/lib/supabase";
import { CONFIG_INICIAL, mensajeAlezza, waAlezza, type TurnosConfig } from "@/lib/turnos";

export const INSTAGRAM = "https://instagram.com/alezzamdp";
export const externo = { target: "_blank", rel: "noopener noreferrer" } as const;

export const WA_CONSULTA = waAlezza(mensajeAlezza("Quiero hacer una consulta.", [["Vehículo", "(marca, modelo y año)"]]));
export const WA_AGENCIA = waAlezza(mensajeAlezza("Soy de una agencia y quiero coordinar la preparación de unidades.", [
  ["Agencia", "(nombre)"],
  ["Unidades por mes", "(cantidad aproximada)"],
]));

export async function datosSitio() {
  const { data } = await supabase.from("app_settings").select("key, value").in("key", ["public_profile", "turnos"]);
  const valor = (k: string) => data?.find((f) => f.key === k)?.value;
  const turnos = valor("turnos");
  const config: TurnosConfig = turnos && typeof turnos === "object" && !Array.isArray(turnos)
    ? { ...CONFIG_INICIAL, ...(turnos as Partial<TurnosConfig>) }
    : CONFIG_INICIAL;
  return { perfil: readPublicProfile(valor("public_profile")), config };
}
