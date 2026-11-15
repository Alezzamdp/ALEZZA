import { test } from "node:test";
import assert from "node:assert/strict";
import { parseListingUrl, summarizePrices } from "./market.ts";

test("summarizePrices: estadísticas por moneda", () => {
  const rows: { published_price: number | null; currency: string }[] =
    [10, 20, 30, 40, 50].map((p) => ({ published_price: p * 1_000_000, currency: "ARS" }));
  rows.push({ published_price: 25_000, currency: "USD" }, { published_price: null, currency: "ARS" });

  const [ars, usd] = summarizePrices(rows);
  assert.equal(ars.currency, "ARS");
  assert.equal(ars.n, 5);
  assert.equal(ars.min, 10_000_000);
  assert.equal(ars.max, 50_000_000);
  assert.equal(ars.mean, 30_000_000);
  assert.equal(ars.median, 30_000_000);
  assert.equal(ars.p25, 20_000_000);
  assert.equal(ars.p75, 40_000_000);
  assert.equal(ars.outliers, 0);
  assert.ok(Math.abs(ars.cv - 0.527) < 0.001);
  assert.equal(ars.confidence, "media"); // 5 comparables pero dispersión alta

  assert.equal(usd.n, 1);
  assert.equal(usd.confidence, "insuficiente");
});

test("summarizePrices: confianza alta y atípicos", () => {
  const tight = [100, 102, 98, 101, 99].map((p) => ({ published_price: p, currency: "USD" }));
  assert.equal(summarizePrices(tight)[0].confidence, "alta");

  const withOutlier = [...tight, { published_price: 300, currency: "USD" }];
  const [summary] = summarizePrices(withOutlier);
  assert.equal(summary.outliers, 1);
  assert.equal(summary.median, 100.5);
  assert.equal(summarizePrices(tight.slice(0, 3))[0].confidence, "baja");
});

test("parseListingUrl: Mercado Libre", () => {
  const info = parseListingUrl(
    "https://auto.mercadolibre.com.ar/MLA-2212571507-toyota-corolla-20-gr-sport-cvt-l25-safety-_JM#tracking_id=x&is_advertising=true"
  );
  assert.deepEqual(info, {
    url: "https://auto.mercadolibre.com.ar/MLA-2212571507-toyota-corolla-20-gr-sport-cvt-l25-safety-_JM",
    source: "Mercado Libre",
    externalId: "MLA2212571507",
    brand: "Toyota",
    model: "Corolla",
    version: "20 GR SPORT CVT L25 SAFETY",
  });

  const benz = parseListingUrl("https://auto.mercadolibre.com.ar/MLA-1-mercedes-benz-clase-c-_JM?x=1");
  assert.equal(benz?.brand, "Mercedes Benz");
  assert.equal(benz?.model, "Clase");
});

test("parseListingUrl: otros sitios y entradas inválidas", () => {
  assert.equal(parseListingUrl("no es url"), null);
  assert.equal(parseListingUrl("javascript:alert(1)"), null);
  const other = parseListingUrl("https://www.autocosmos.com.ar/auto/usado/123?ref=a#top");
  assert.equal(other?.url, "https://www.autocosmos.com.ar/auto/usado/123?ref=a");
  assert.equal(other?.externalId, null);
});

test("valor de toma: mediana menos 15 %", async () => {
  const { valorToma } = await import("./market.ts");
  assert.equal(valorToma(10_000_000), 8_500_000);
});
