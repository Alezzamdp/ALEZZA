// Cálculos de mercado sobre comparables. Son PRECIOS PUBLICADOS, no precios de cierre.

export type Confidence = "insuficiente" | "baja" | "media" | "alta";

export type PriceSummary = {
  currency: string;
  n: number;
  min: number;
  max: number;
  mean: number;
  median: number;
  p25: number;
  p75: number;
  /** Coeficiente de variación: desvío estándar / promedio. */
  cv: number;
  /** Publicaciones fuera de las cercas de Tukey (1,5 × rango intercuartil). */
  outliers: number;
  confidence: Confidence;
};

// Percentil con interpolación lineal (mismo criterio que Excel PERCENTIL.INC).
function quantile(sorted: number[], q: number) {
  const position = (sorted.length - 1) * q;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

// Criterio: <3 comparables no alcanza; 3–4 es baja; 5+ es media,
// y alta si además la dispersión es acotada (CV ≤ 15 %).
function confidenceFor(n: number, cv: number): Confidence {
  if (n < 3) return "insuficiente";
  if (n < 5) return "baja";
  return cv <= 0.15 ? "alta" : "media";
}

/** Un resumen por moneda: nunca se mezclan ARS y USD. */
export function summarizePrices(
  items: { published_price: number | null; currency: string }[]
): PriceSummary[] {
  const byCurrency = new Map<string, number[]>();

  for (const item of items) {
    const price = Number(item.published_price);
    if (item.published_price == null || !Number.isFinite(price) || price <= 0) continue;
    byCurrency.set(item.currency, [...(byCurrency.get(item.currency) ?? []), price]);
  }

  return [...byCurrency].map(([currency, prices]) => {
    const sorted = [...prices].sort((a, b) => a - b);
    const n = sorted.length;
    const mean = sorted.reduce((sum, value) => sum + value, 0) / n;
    const deviation = n > 1
      ? Math.sqrt(sorted.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (n - 1))
      : 0;
    const p25 = quantile(sorted, 0.25);
    const p75 = quantile(sorted, 0.75);
    const fence = 1.5 * (p75 - p25);
    const cv = deviation / mean;

    return {
      currency,
      n,
      min: sorted[0],
      max: sorted[n - 1],
      mean,
      median: quantile(sorted, 0.5),
      p25,
      p75,
      cv,
      outliers: n >= 4 ? sorted.filter((v) => v < p25 - fence || v > p75 + fence).length : 0,
      confidence: confidenceFor(n, cv),
    };
  });
}

export type ListingInfo = {
  url: string;
  source: string | null;
  externalId: string | null;
  brand: string;
  model: string;
  version: string;
};

const multiWordBrands = ["mercedes benz", "land rover", "alfa romeo", "great wall", "aston martin", "rolls royce"];

function titleCase(value: string) {
  return value.replace(/(^|\s)(\S)/g, (_, space: string, letter: string) => space + letter.toUpperCase());
}

/**
 * Limpia el enlace de un aviso (quita seguimiento) y, si es de Mercado Libre,
 * extrae el ID y una sugerencia de marca/modelo/versión desde la dirección.
 * La sugerencia sale del texto del enlace: hay que revisarla siempre.
 */
export function parseListingUrl(raw: string): ListingInfo | null {
  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;

  const empty = { brand: "", model: "", version: "" };
  if (!/(^|\.)mercadolibre\.com\.ar$/i.test(parsed.hostname)) {
    parsed.hash = "";
    return { url: parsed.href, source: null, externalId: null, ...empty };
  }

  parsed.search = "";
  parsed.hash = "";
  parsed.protocol = "https:";

  const match = parsed.pathname.match(/MLA-?(\d+)(?:-([^/]*))?/i);
  if (!match) return { url: parsed.href, source: "Mercado Libre", externalId: null, ...empty };

  const words = (match[2] ?? "").replace(/-?_JM$/i, "").split("-").filter(Boolean);
  const brandWords = multiWordBrands.find((brand) => words.join(" ").startsWith(brand + " "))
    ?.split(" ").length ?? 1;

  return {
    url: parsed.href,
    source: "Mercado Libre",
    externalId: `MLA${match[1]}`,
    brand: titleCase(words.slice(0, brandWords).join(" ")),
    model: titleCase(words.slice(brandWords, brandWords + 1).join(" ")),
    version: words.slice(brandWords + 1).join(" ").toUpperCase(),
  };
}

// Valor de toma sugerido: mediana de mercado menos el margen de ALEZZA (15 %, definido por el dueño).
// Es una sugerencia sobre precios publicados; la toma final la aprueba una persona.
export const MARGEN_TOMA = 0.15;
export const valorToma = (mediana: number) => Math.round(mediana * (1 - MARGEN_TOMA));
