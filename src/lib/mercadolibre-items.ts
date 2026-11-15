// Convierte publicaciones de la API de Mercado Libre en datos de referencia (comparables).
// Son PRECIOS PUBLICADOS observados: siempre se revisan antes de guardar.

type MlAttribute = { id?: string; value_name?: string | null; value_struct?: { number?: number } | null };
type MlPlace = { city?: { name?: string }; state?: { name?: string } };
export type MlItem = {
  id?: string;
  title?: string;
  price?: number | null;
  currency_id?: string;
  permalink?: string;
  status?: string;
  start_time?: string;
  date_created?: string;
  attributes?: MlAttribute[];
  location?: MlPlace;
  seller_address?: MlPlace;
};

export type ListingData = {
  externalId: string;
  title: string;
  url: string;
  brand: string;
  model: string;
  version: string;
  year: number | null;
  kilometers: number | null;
  location: string;
  price: number | null;
  currency: "ARS" | "USD" | null;
  publishedAt: string | null;
  status: string;
};

const STATUS: Record<string, string> = { active: "Publicado", paused: "Publicado", closed: "Finalizado" };

function attr(item: MlItem, id: string) {
  return item.attributes?.find((a) => a.id === id);
}

function entero(a: MlAttribute | undefined) {
  const n = a?.value_struct?.number ?? Number(String(a?.value_name ?? "").replace(/[^\d]/g, ""));
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

export function mapMlItem(item: MlItem): ListingData | null {
  if (!item.id || !/^MLA\d+$/.test(item.id)) return null;
  const place = item.location?.city?.name ? item.location : item.seller_address;
  const year = entero(attr(item, "VEHICLE_YEAR"));
  const fecha = (item.start_time ?? item.date_created ?? "").slice(0, 10);
  const moneda = item.currency_id === "ARS" || item.currency_id === "USD" ? item.currency_id : null;
  return {
    externalId: item.id,
    title: String(item.title ?? "").slice(0, 200),
    url: item.permalink?.startsWith("https://") ? item.permalink.split(/[?#]/)[0] : `https://articulo.mercadolibre.com.ar/${item.id.replace("MLA", "MLA-")}`,
    brand: attr(item, "BRAND")?.value_name ?? "",
    model: attr(item, "MODEL")?.value_name ?? "",
    version: attr(item, "TRIM")?.value_name ?? "",
    year: year && year >= 1950 && year <= new Date().getFullYear() + 1 ? year : null,
    kilometers: entero(attr(item, "KILOMETERS")),
    location: [place?.city?.name, place?.state?.name].filter(Boolean).join(", "),
    // Otra moneda: sin precio, para no mezclar ni convertir.
    price: moneda && typeof item.price === "number" && item.price > 0 ? item.price : null,
    currency: moneda,
    publishedAt: /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? fecha : null,
    status: STATUS[item.status ?? ""] ?? "Publicado",
  };
}

/** Búsqueda pública en el sitio, para abrir a mano cuando la API no da permiso. Sin scraping. */
export function mlWebSearchUrl(query: string) {
  const slug = query.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `https://autos.mercadolibre.com.ar/${slug}`;
}
