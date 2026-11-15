import { test } from "node:test";
import assert from "node:assert/strict";
import { CONFIG_INICIAL, armarMensaje, calcularPrecio, calcularSena, normalizarPatente, totalTrabajos } from "./turnos.ts";

test("mensajes rápidos: completa campos y usa el primer nombre", () => {
  const m = armarMensaje("listo", { nombre: "Juan Pérez", vehiculo: "Amarok", patente: "AB123CD" });
  assert.equal(m, [
    "Hola Juan, ¿cómo estás?", "",
    "¡Tu *Amarok* (AB123CD) está *listo para retirar*!", "",
    "Te esperamos en el taller. Cómo llegar: https://www.google.com/maps/dir/?api=1&destination=-38.0581289,-57.5981737", "",
    "ALEZZA · Estética técnica automotriz",
  ].join("\n"));
  assert.ok(!armarMensaje("presupuesto", { nombre: "Ana", vehiculo: "Gol", patente: "" }).includes("{"));
});

test("patente y total", () => {
  assert.equal(normalizarPatente("ab 123-cd"), "AB123CD");
  assert.equal(totalTrabajos([{ t: "a", precio: 1000, hecho: false }, { t: "b", precio: null, hecho: true }]), 1000);
});

test("precio y seña: 50% del servicio; si algo no tiene precio, seña fija", () => {
  const c = { ...CONFIG_INICIAL, precios: { lavado: 100000, puesta: 250000, motor: 40000, interiores: 60000 } };
  assert.equal(calcularSena(c, calcularPrecio(c, "puesta", [])), 125000);
  assert.equal(calcularPrecio(c, "otro", ["motor", "interiores"]), 100000);
  assert.equal(calcularPrecio(c, "otro", ["motor", "butacas"]), null);
  assert.equal(calcularPrecio(c, "otro", []), null);
  assert.equal(calcularSena(c, null), c.sena);
});

test("mensajes: con y sin enlace de seguimiento", () => {
  const d = { nombre: "Ana", vehiculo: "Gol", patente: "AB123CD" };
  assert.ok(armarMensaje("recibido", { ...d, enlace: "https://x/s/1" }).includes("en vivo acá: https://x/s/1"));
  const sin = armarMensaje("recibido", d);
  assert.ok(!sin.includes("acá") && !sin.includes("\n\n\n"), sin);
  const p = armarMensaje("presupuesto", { ...d, total: "$ 100", trabajos: "lavado, motor" });
  assert.ok(p.includes("• Lavado\n• Motor") && p.includes("*Total: $ 100*"), p);
});
