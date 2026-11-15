import { test } from "node:test";
import assert from "node:assert/strict";
import { mapMlItem, mlWebSearchUrl } from "./mercadolibre-items.ts";

test("mapMlItem: toma marca, modelo, año, km, precio y lugar", () => {
  const d = mapMlItem({
    id: "MLA1234567890", title: "Volkswagen Suran 1.6 Highline", price: 15500000, currency_id: "ARS",
    permalink: "https://auto.mercadolibre.com.ar/MLA-1234567890-vw-suran-_JM?tracking=1", status: "active",
    start_time: "2026-11-01T10:00:00.000Z",
    attributes: [
      { id: "BRAND", value_name: "Volkswagen" }, { id: "MODEL", value_name: "Suran" }, { id: "TRIM", value_name: "1.6 Highline" },
      { id: "VEHICLE_YEAR", value_name: "2015" }, { id: "KILOMETERS", value_name: "98.000 km", value_struct: { number: 98000 } },
    ],
    location: { city: { name: "Mar del Plata" }, state: { name: "Buenos Aires" } },
  });
  assert.ok(d);
  assert.equal(d.url, "https://auto.mercadolibre.com.ar/MLA-1234567890-vw-suran-_JM");
  assert.deepEqual([d.brand, d.model, d.version, d.year, d.kilometers], ["Volkswagen", "Suran", "1.6 Highline", 2015, 98000]);
  assert.deepEqual([d.price, d.currency, d.publishedAt, d.status, d.location], [15500000, "ARS", "2026-11-01", "Publicado", "Mar del Plata, Buenos Aires"]);
});

test("mapMlItem: datos raros quedan vacíos, no inventados", () => {
  const d = mapMlItem({ id: "MLA1", price: 0, currency_id: "EUR", status: "closed",
    attributes: [{ id: "VEHICLE_YEAR", value_name: "1800" }, { id: "KILOMETERS", value_name: "sin dato" }] });
  assert.ok(d);
  assert.deepEqual([d.price, d.currency, d.year, d.kilometers, d.status, d.publishedAt], [null, null, null, null, "Finalizado", null]);
  assert.equal(mapMlItem({ id: "<x>" }), null);
});

test("mlWebSearchUrl: arma la búsqueda pública", () => {
  assert.equal(mlWebSearchUrl("Volkswagen Suran 2015 Highline"), "https://autos.mercadolibre.com.ar/volkswagen-suran-2015-highline");
});
