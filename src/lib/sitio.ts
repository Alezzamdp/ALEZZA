// Datos que comparten las páginas públicas de servidor (Inicio y Servicios): contacto, precios y trabajos publicados.
import type { TrabajoPublico } from "@/components/AntesDespues";
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

// Trabajos que el taller marcó para mostrar: primera foto de antes y de después, con enlaces firmados por una hora.
export async function trabajosPublicos(): Promise<TrabajoPublico[]> {
  type Fila = { id: string; titulo: string; trabajos: string[]; antes: string[]; despues: string[] };
  const { data } = await supabase.rpc("trabajos_publicos");
  const lista = ((data ?? []) as Fila[]).filter((t) => t.antes?.[0] && t.despues?.[0]);
  if (!lista.length) return [];
  const { data: firmadas } = await supabase.storage.from("orden-fotos").createSignedUrls(lista.flatMap((t) => [t.antes[0], t.despues[0]]), 3600);
  const url = new Map((firmadas ?? []).map((f) => [f.path, f.signedUrl]));
  return lista.flatMap((t) => {
    const antes = url.get(t.antes[0]), despues = url.get(t.despues[0]);
    return antes && despues ? [{ id: t.id, titulo: t.titulo, trabajos: t.trabajos ?? [], antes, despues }] : [];
  });
}
