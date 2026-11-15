import { test } from "node:test";
import assert from "node:assert/strict";
import { aFila, deFila } from "./bruno.ts";

test("aFila: limpia lo que no cumple y conserva campos viejos en extra", () => {
  const r = aFila({ id: "<script>", tipo: "Evento!", titulo: "x".repeat(900), fecha: "21/9", hora: "25:00",
    estado: "borrada", prioridad: "si", creado: "no-fecha", monto: 1500 });
  assert.match(r.id, /^[a-z0-9]{6,40}$/);
  assert.equal(r.tipo, "nota");
  assert.equal(r.titulo.length, 500);
  assert.equal(r.fecha, null);
  assert.equal(r.hora, null);
  assert.equal(r.estado, "pendiente");
  assert.equal(r.prioridad, false);
  assert.ok(!Number.isNaN(Date.parse(r.creado)));
  assert.deepEqual(r.extra, { monto: 1500 });
});

test("aFila → deFila: ida y vuelta sin pérdida", () => {
  const item = { id: "abc123def", tipo: "evento", titulo: "Gestor", fecha: "2026-11-20", hora: "10:00",
    area: "Autos", estado: "hecha", prioridad: true, hecho: "2026-11-14T10:00:00.000Z", creado: "2026-11-13T09:00:00.000Z" };
  assert.deepEqual(deFila(aFila(item)), item);
});
