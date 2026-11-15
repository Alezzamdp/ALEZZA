import { dolar } from "@/lib/dolar";
import { valorToma } from "@/lib/market";
import { adminClient, forbidden, isAdminRequest } from "@/lib/server-admin";

export const runtime = "nodejs";

// Mercado de HOY: dólar oficial y blue, y para cada auto del stock la mediana de las referencias
// recientes (pesos, o dólares al blue del día) contra el precio publicado. Se guarda una foto por
// día en mercado_historial (migración 202611160002) para ver cómo se mueve.
// Se calcula la primera vez que se abre en el día (o con ?refrescar=1).

type Auto = { id: string; nombre: string; anio: number; precio: number | null; mediana: number | null; n: number; fuente: string; toma: number | null };
type Dia = { fecha: string; hora: string; oficial: number | null; blue: number | null; autos: Auto[]; referencias: { total: number; viejas: number } };

const hoy = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());

export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) return forbidden();
  const db = adminClient(request);
  const fecha = hoy();
  const refrescar = new URL(request.url).searchParams.get("refrescar") === "1";

  const { data: ultimos, error } = await db.from("mercado_historial").select("fecha, datos").order("fecha", { ascending: false }).limit(2);
  if (error) {
    const falta = error.code === "42P01" || error.code === "PGRST205";
    return Response.json({ error: falta ? "Falta ejecutar la migración 202611160002 en Supabase." : error.message }, { status: 500 });
  }

  let actual = ultimos?.find((d) => d.fecha === fecha)?.datos as Dia | undefined;
  const anterior = (ultimos?.find((d) => d.fecha !== fecha)?.datos as Dia | undefined) ?? null;

  if (!actual || refrescar) {
    const [oficial, blue, { data: autos }, total, viejas] = await Promise.all([
      dolar("oficial"),
      dolar("blue"),
      db.from("vehicles").select("id, brand, model, version, year, price_ars").eq("is_published", true).in("status", ["available", "reserved"]),
      db.from("comparables").select("id", { count: "exact", head: true }),
      db.from("comparables").select("id", { count: "exact", head: true }).lt("observed_at", new Date(Date.now() - 30 * 86400_000).toISOString()),
    ]);

    const filas = await Promise.all((autos ?? []).map(async (v): Promise<Auto> => {
      const { data } = await db.rpc("estimar_mercado", { p_marca: v.brand, p_modelo: v.model, p_anio: v.year });
      const lista = (data ?? []) as { moneda: string; n: number; mediana: number | null }[];
      const ars = lista.find((x) => x.moneda === "ARS" && x.mediana);
      const usd = lista.find((x) => x.moneda === "USD" && x.mediana);
      const mediana = ars?.mediana ? Number(ars.mediana) : usd?.mediana && blue ? Math.round(Number(usd.mediana) * blue.venta) : null;
      return {
        id: v.id,
        nombre: [v.brand, v.model, v.version].filter(Boolean).join(" "),
        anio: v.year,
        precio: v.price_ars,
        mediana,
        n: ars?.n ?? usd?.n ?? Math.max(0, ...lista.map((x) => x.n)),
        fuente: ars?.mediana ? "pesos" : usd?.mediana ? "dólares al blue de hoy" : "",
        toma: mediana ? valorToma(mediana) : null,
      };
    }));

    actual = {
      fecha,
      hora: new Date().toISOString(),
      oficial: oficial?.venta ?? null,
      blue: blue?.venta ?? null,
      autos: filas,
      referencias: { total: total.count ?? 0, viejas: viejas.count ?? 0 },
    };
    await db.from("mercado_historial").upsert({ fecha, datos: actual, actualizado: new Date().toISOString() });
  }

  return Response.json({ hoy: actual, anterior }, { headers: { "Cache-Control": "no-store" } });
}
