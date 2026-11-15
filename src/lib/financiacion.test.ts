import { test } from "node:test";
import assert from "node:assert/strict";
import { comisionAgencia, condiciones, cuota, plan } from "./financiacion.ts";

test("condiciones por año (gráfica CreditCar)", () => {
  assert.deepEqual(condiciones(2022), { tna: 0.43, maxPct: 0.6, plazos: [6, 36], retornoAgencia: 0.02 });
  assert.equal(condiciones(2018)?.maxPct, 0.55);
  assert.equal(condiciones(2018)?.tna, 0.53);
  assert.deepEqual(condiciones(2015)?.plazos, [6, 30]);
  assert.equal(condiciones(2012)?.maxPct, 0.35);
  assert.equal(condiciones(2010), null);
});

test("cuota francesa y plan de compra", () => {
  // 1.000.000 a 12 meses, 43 % TNA → i = 3,583 % mensual
  assert.equal(cuota(1_000_000, 0.43, 12), 103_992);
  const p = plan(20_000_000, 2022, 6_000_000, 48); // plazo se recorta a 36
  assert.equal(p.falta, 14_000_000);
  assert.equal(p.financiado, 12_000_000); // tope 60 %
  assert.equal(p.efectivo, 2_000_000);
  assert.equal(p.meses, 36);
});

test("comisión solo con plazo de 12 meses o más", () => {
  assert.equal(comisionAgencia(10_000_000, 2022, 12), 200_000);
  assert.equal(comisionAgencia(10_000_000, 2015, 24), 300_000);
  assert.equal(comisionAgencia(10_000_000, 2022, 6), 0);
});
