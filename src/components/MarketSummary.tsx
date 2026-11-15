import { MARGEN_TOMA, summarizePrices, valorToma, type Confidence } from "@/lib/market";

const confidenceStyle: Record<Confidence, string> = {
  insuficiente: "border-red-400/30 bg-red-400/10 text-red-200",
  baja: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  media: "border-sky-400/30 bg-sky-400/10 text-sky-200",
  alta: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
};

function money(value: number, currency: string) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export default function MarketSummary({
  items,
  title = "Referencia de mercado",
}: {
  items: { published_price: number | null; currency: string }[];
  title?: string;
}) {
  const summaries = summarizePrices(items);
  if (summaries.length === 0) return null;

  return (
    <div className="space-y-3">
      {summaries.map((s) => (
        <div key={s.currency} className="rounded-lg border border-white/10 bg-slate-950/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold">
              {title} · {s.currency}
            </p>
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${confidenceStyle[s.confidence]}`}>
              Confiabilidad {s.confidence} · {s.n} {s.n === 1 ? "comparable" : "comparables"}
            </span>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
            <div>
              <dt className="text-slate-400">Mediana</dt>
              <dd className="mt-1 text-base font-semibold text-sky-300">{money(s.median, s.currency)}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Rango central (P25–P75)</dt>
              <dd className="mt-1">{money(s.p25, s.currency)} – {money(s.p75, s.currency)}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Mínimo – máximo</dt>
              <dd className="mt-1">{money(s.min, s.currency)} – {money(s.max, s.currency)}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Promedio · dispersión</dt>
              <dd className="mt-1">
                {money(s.mean, s.currency)} · {(s.cv * 100).toFixed(1)} %
              </dd>
            </div>
          </dl>
          {s.confidence !== "insuficiente" && (
            <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2 rounded-md border border-sky-400/30 bg-sky-400/10 px-3 py-2">
              <span className="text-xs text-slate-300">Valor de toma sugerido (mediana − {Math.round(MARGEN_TOMA * 100)} % de margen)</span>
              <span className="text-base font-semibold text-sky-200">{money(valorToma(s.median), s.currency)}</span>
            </div>
          )}
          {s.outliers > 0 && (
            <p className="mt-3 text-xs text-amber-200">
              {s.outliers} {s.outliers === 1 ? "precio se aleja" : "precios se alejan"} mucho del resto: revisá versión, kilometraje o estado.
            </p>
          )}
          {s.confidence === "insuficiente" && (
            <p className="mt-3 text-xs text-red-200">
              Con menos de 3 comparables no hay referencia confiable: sumá más publicaciones o derivá a revisión.
            </p>
          )}
        </div>
      ))}
      <p className="text-xs text-slate-500">
        Calculado sobre precios publicados, que no son precios de cierre. Confiabilidad: menos de 3 comparables, insuficiente; 3 o 4, baja; 5 o más, media, y alta si la dispersión no supera el 15 %.
      </p>
    </div>
  );
}
