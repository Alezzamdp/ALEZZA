import { getMercadoLibreAccessToken } from "@/lib/mercadolibre-token";
import { mapMlItem, type MlItem } from "@/lib/mercadolibre-items";
import { summarizePrices, valorToma } from "@/lib/market";
import { supabase } from "@/lib/supabase";
import { dolar } from "@/lib/dolar";
import { demasiados, excedido } from "@/lib/limite";

export const runtime = "nodejs";

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

// Tasación de un auto que nos ofrecen en permuta. La usan el simulador (AsesorCompra) y el bot de Messenger.
// 1) Mercado Libre en vivo: marca + modelo, año ±1, en pesos, mín. 3 avisos.
// 2) Si ML no da permiso (hoy 403) o hay pocos avisos: referencias cargadas a mano (estimar_mercado).
// Devuelve SOLO el agregado (mediana, rango, km promedio) y la toma sugerida (mediana − 15 %), nunca los avisos.
type Resultado = { fuente: string; n: number; mediana: number; p25: number | null; p75: number | null; kmPromedio: number | null };

async function referencias(marca: string, modelo: string, anio: number): Promise<Resultado | null> {
  const { data } = await supabase.rpc("estimar_mercado", { p_marca: marca, p_modelo: modelo, p_anio: anio });
  const lista = (data ?? []) as { moneda: string; n: number; mediana: number | null; p25: number | null; p75: number | null }[];
  const ars = lista.find((x) => x.moneda === "ARS" && x.mediana);
  if (ars) return { fuente: "referencias de ALEZZA", n: ars.n, mediana: Number(ars.mediana), p25: ars.p25, p75: ars.p75, kmPromedio: null };
  // Muchos autos se publican en dólares: se pasan a pesos con el dólar blue de HOY.
  const usd = lista.find((x) => x.moneda === "USD" && x.mediana);
  const d = usd ? await dolar("blue") : null;
  if (!usd || !d) return null;
  const pesos = (v: number | null) => (v ? Math.round(Number(v) * d.venta) : null);
  return { fuente: "referencias de ALEZZA en dólares, al blue de hoy", n: usd.n, mediana: pesos(usd.mediana)!, p25: pesos(usd.p25), p75: pesos(usd.p75), kmPromedio: null };
}

export async function POST(request: Request) {
  if (excedido(request, "tasacion", 20)) return demasiados();
  const body = (await request.json().catch(() => null)) as { marca?: unknown; modelo?: unknown; anio?: unknown } | null;
  const marca = String(body?.marca ?? "").trim().slice(0, 60);
  const modelo = String(body?.modelo ?? "").trim().slice(0, 80);
  const anio = Number(body?.anio);
  if (marca.length < 2 || modelo.length < 1 || !Number.isInteger(anio) || anio < 1950 || anio > new Date().getFullYear() + 1) {
    return json({ error: "Datos incompletos." }, 400);
  }

  try {
    const token = await getMercadoLibreAccessToken();
    const params = new URLSearchParams({ category: "MLA1744", q: `${marca} ${modelo} ${anio}`, limit: "50" });
    const res = await fetch(`https://api.mercadolibre.com/sites/MLA/search?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return responder(await referencias(marca, modelo, anio));

    const data = (await res.json()) as { results?: MlItem[] };
    const avisos = (data.results ?? []).map(mapMlItem)
      .filter((a) => a && a.currency === "ARS" && a.year && Math.abs(a.year - anio) <= 1);
    const [resumen] = summarizePrices(avisos.map((a) => ({ published_price: a!.price, currency: "ARS" })));
    if (!resumen || resumen.n < 3) return responder(await referencias(marca, modelo, anio));

    const kms = avisos.map((a) => a!.kilometers).filter((k): k is number => k !== null);
    return responder({
      fuente: "Mercado Libre",
      n: resumen.n,
      mediana: Math.round(resumen.median),
      p25: Math.round(resumen.p25),
      p75: Math.round(resumen.p75),
      kmPromedio: kms.length ? Math.round(kms.reduce((s, k) => s + k, 0) / kms.length) : null,
    });
  } catch {
    return responder(await referencias(marca, modelo, anio).catch(() => null));
  }
}

const responder = (r: Resultado | null) =>
  json(r ? { ...r, toma: valorToma(r.mediana) } : { fuente: null });
