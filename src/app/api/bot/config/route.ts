import { botConfig } from "@/lib/bot-store";
import { supabase } from "@/lib/supabase";
import { claveBot, claveInvalida } from "../clave";

export const runtime = "nodejs";

// Lo que el bot de Messenger necesita para responder: datos de ALEZZA, cómo escribe Bruno y el stock
// publicado (el mismo de /vehiculos, así el precio es uno solo). Solo con la clave del bot.
export async function GET(request: Request) {
  const clave = claveBot(request);
  if (clave instanceof Response) return clave;

  const [config, { data }] = await Promise.all([
    botConfig(clave).catch(() => null),
    supabase.from("vehicles")
      .select("brand, model, version, year, kilometers, fuel, transmission, price_ars, price_usd, description")
      .eq("is_published", true).in("status", ["available", "reserved"]),
  ]);
  if (!config) return claveInvalida();

  const vehiculos = (data ?? []).map((v) => ({
    nombre: [v.brand, v.model, v.version].filter(Boolean).join(" "),
    anio: v.year,
    km: v.kilometers,
    combustible: v.fuel,
    caja: v.transmission,
    precioPesos: v.price_ars,
    precioDolares: v.price_usd,
    descripcion: v.description,
  }));

  return Response.json({ ...config, vehiculos }, { headers: { "Cache-Control": "no-store" } });
}
