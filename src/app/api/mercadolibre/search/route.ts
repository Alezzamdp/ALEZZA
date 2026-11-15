import { getMercadoLibreAccessToken } from "@/lib/mercadolibre-token";
import { mapMlItem, mlWebSearchUrl, type MlItem } from "@/lib/mercadolibre-items";
import { forbidden, isAdminRequest } from "@/lib/server-admin";

export const runtime = "nodejs";

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

// Busca autos publicados en Mercado Libre (categoría Autos y Camionetas, MLA1744).
// Mientras ML no habilite la búsqueda a la app (403), devuelve el enlace de la búsqueda pública
// para abrirla a mano y pegar los avisos. Cuando lo habilite, funciona sin cambios.
export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) return forbidden();

  const q = (new URL(request.url).searchParams.get("q") ?? "").trim().slice(0, 120);
  if (q.length < 3) return json({ error: "Escribí al menos marca y modelo." }, 400);
  const webUrl = mlWebSearchUrl(q);

  try {
    const token = await getMercadoLibreAccessToken();
    const params = new URLSearchParams({ category: "MLA1744", q, limit: "30" });
    const res = await fetch(`https://api.mercadolibre.com/sites/MLA/search?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (res.status === 401 || res.status === 403) return json({ blocked: true, webUrl });
    if (!res.ok) return json({ error: `Mercado Libre respondió ${res.status}.`, webUrl }, 502);

    const data = (await res.json()) as { results?: MlItem[] };
    const items = (data.results ?? []).map(mapMlItem).filter(Boolean);
    return json({ items, webUrl });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "No se pudo consultar Mercado Libre.", webUrl }, 500);
  }
}
