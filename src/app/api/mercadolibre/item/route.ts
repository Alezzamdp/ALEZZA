import { getMercadoLibreAccessToken } from "@/lib/mercadolibre-token";
import { mapMlItem, type MlItem } from "@/lib/mercadolibre-items";
import { parseListingUrl } from "@/lib/market";
import { forbidden, isAdminRequest } from "@/lib/server-admin";

export const runtime = "nodejs";

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

// Lee una publicación de Mercado Libre por su enlace (API oficial, nunca scraping).
// Si ML no da permiso, avisa para cargarla a mano.
export async function POST(request: Request) {
  if (!(await isAdminRequest(request))) return forbidden();

  const body = await request.json().catch(() => null);
  const info = typeof body?.url === "string" && body.url.length <= 2000 ? parseListingUrl(body.url) : null;
  if (!info?.externalId) return json({ error: "No es un enlace de una publicación de Mercado Libre." }, 400);

  try {
    const token = await getMercadoLibreAccessToken();
    const res = await fetch(`https://api.mercadolibre.com/items/${info.externalId}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (res.status === 401 || res.status === 403) return json({ blocked: true });
    if (res.status === 404) return json({ error: "Mercado Libre no encuentra esa publicación." }, 404);
    if (!res.ok) return json({ error: `Mercado Libre respondió ${res.status}.` }, 502);

    const data = mapMlItem((await res.json()) as MlItem);
    return data ? json({ item: data }) : json({ error: "Respuesta inesperada de Mercado Libre." }, 502);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "No se pudo consultar Mercado Libre." }, 500);
  }
}
