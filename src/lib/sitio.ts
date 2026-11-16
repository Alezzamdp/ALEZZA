// Datos que comparten las páginas públicas de servidor (Inicio y Servicios): contacto y precios vigentes.
import { readPublicProfile } from "@/components/StockVehiculos";
import { supabase } from "@/lib/supabase";
import { CONFIG_INICIAL, type TurnosConfig } from "@/lib/turnos";

export { WA_AGENCIA, WA_CONSULTA, externo } from "@/lib/contacto";

export async function datosSitio() {
  const { data } = await supabase.from("app_settings").select("key, value").in("key", ["public_profile", "turnos"]);
  const valor = (k: string) => data?.find((f) => f.key === k)?.value;
  const turnos = valor("turnos");
  const config: TurnosConfig = turnos && typeof turnos === "object" && !Array.isArray(turnos)
    ? { ...CONFIG_INICIAL, ...(turnos as Partial<TurnosConfig>) }
    : CONFIG_INICIAL;
  return { perfil: readPublicProfile(valor("public_profile")), config };
}
