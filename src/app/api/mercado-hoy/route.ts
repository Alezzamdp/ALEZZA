import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { dolar } from "@/lib/dolar";
import { valorToma } from "@/lib/market";
import { adminClient, forbidden, isAdminRequest } from "@/lib/server-admin";

export const runtime = "nodejs";

// Mercado de HOY: dólar oficial y blue, y para cada auto del stock la mediana de las referencias
// recientes (pesos, o dólares al blue del día) contra el precio publicado. Se guarda una foto por
// día para ver cómo se mueve. Se calcula la primera vez que se abre en el día (o con ?refrescar=1).
// ponytail: historial en un archivo local; pasarlo a una tabla si el portal se publica.
const ARCHIVO = path.join(process.env.LOCALAPPDATA || os.homedir(), "ALEZZA", "mercado", "historial.json");

type Auto = { id: string; nombre: string; anio: number; precio: number | null; mediana: number | null; n: number; fuente: string; toma: number | null };
type Dia = { fecha: string; hora: string; oficial: number | null; blue: number | null; autos: Auto[]; referencias: { total: number; viejas: number } };

const hoy = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());

async function leer(): Promise<Record<string, Dia>> {
  try { return JSON.parse(await readFile(ARCHIVO, "utf8")); } catch { return {}; }
}

export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) return forbidden();
  const historial = await leer();
  const fecha = hoy();
  const refrescar = new URL(request.url).searchParams.get("refrescar") === "1";

  if (!historial[fecha] || refrescar) {
    const db = adminClient(request);
    const [oficial, blue, { data: autos }, total, viejas] = await Promise.all([
      dolar("oficial"),
      dolar("blue"),
      db.from("vehicles").select("id, brand, model, version, year, price_ars").eq("is_published", true).in("status", ["available", "reserved"]),
      db.from("comparables").select("id", { count: "exact", head: true }),
      db.from("comparables").select("id", { count: "exact", head: true }).lt("observed_at", new Date(Date.now() - 30 * 86400_000).toISOString()),
    ]);

    const filas: Auto[] = [];
    for (const v of autos ?? []) {
      const { data } = await db.rpc("estimar_mercado", { p_marca: v.brand, p_modelo: v.model, p_anio: v.year });
      const lista = (data ?? []) as { moneda: string; n: number; mediana: number | null }[];
      const ars = lista.find((x) => x.moneda === "ARS" && x.mediana);
      const usd = lista.find((x) => x.moneda === "USD" && x.mediana);
      const mediana = ars?.mediana ? Number(ars.mediana) : usd?.mediana && blue ? Math.round(Number(usd.mediana) * blue.venta) : null;
      filas.push({
        id: v.id,
        nombre: [v.brand, v.model, v.version].filter(Boolean).join(" "),
        anio: v.year,
        precio: v.price_ars,
        mediana,
        n: ars?.n ?? usd?.n ?? Math.max(0, ...lista.map((x) => x.n)),
        fuente: ars?.mediana ? "pesos" : usd?.mediana ? "dólares al blue de hoy" : "",
        toma: mediana ? valorToma(mediana) : null,
      });
    }

    historial[fecha] = {
      fecha,
      hora: new Date().toISOString(),
      oficial: oficial?.venta ?? null,
      blue: blue?.venta ?? null,
      autos: filas,
      referencias: { total: total.count ?? 0, viejas: viejas.count ?? 0 },
    };
    // Se guardan los últimos 120 días.
    const dias = Object.keys(historial).sort().slice(-120);
    await mkdir(path.dirname(ARCHIVO), { recursive: true });
    await writeFile(ARCHIVO, JSON.stringify(Object.fromEntries(dias.map((d) => [d, historial[d]]))), { mode: 0o600 });
  }

  const dias = Object.keys(historial).sort();
  return Response.json(
    { hoy: historial[fecha], anterior: dias.length > 1 ? historial[dias[dias.length - 2]] : null },
    { headers: { "Cache-Control": "no-store" } },
  );
}
