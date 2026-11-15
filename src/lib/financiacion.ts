// Financiación CreditCar: condiciones de su gráfica para agencias (noviembre 2026).
// La cuota es una ESTIMACIÓN (sistema francés, sin gastos, seguros ni impuestos);
// la aprobación y las condiciones finales las da CreditCar en su cotizador oficial.
export const COTIZADOR_CREDITCAR = "https://cotizador.creditcar.com.ar/";

export type Condiciones = {
  tna: number;          // tasa nominal anual, cuotas fijas en pesos
  maxPct: number;       // porcentaje máximo del valor a financiar
  plazos: [number, number];
  retornoAgencia: number; // comisión para ALEZZA si el plazo es de 12 meses o más (solo uso interno)
};

export function condiciones(anio: number): Condiciones | null {
  if (!Number.isInteger(anio) || anio < 2011) return null;
  const tna = anio >= 2021 ? 0.43 : 0.53;
  const maxPct = anio >= 2021 ? 0.6 : anio >= 2017 ? 0.55 : anio >= 2014 ? 0.4 : 0.35;
  const plazos: [number, number] = anio >= 2017 ? [6, 36] : anio >= 2014 ? [6, 30] : [6, 24];
  return { tna, maxPct, plazos, retornoAgencia: anio >= 2021 ? 0.02 : 0.03 };
}

export function cuota(monto: number, tna: number, meses: number) {
  const i = tna / 12;
  return Math.round((monto * i) / (1 - (1 + i) ** -meses));
}

export const PLAZOS = [6, 12, 18, 24, 30, 36];

// Plan para comprar un auto de stock: lo que falta después de la toma, cuánto se puede financiar y la cuota.
export function plan(precio: number, anio: number, aporte: number, meses: number) {
  const c = condiciones(anio);
  const falta = Math.max(0, precio - aporte);
  // Entrega inicial mínima: lo que CreditCar no financia (precio − máximo financiable).
  const entregaMinima = c ? precio - Math.floor(precio * c.maxPct) : precio;
  if (!c || falta === 0) return { condiciones: c, entregaMinima, falta, financiado: 0, efectivo: falta, cuota: 0, meses: 0 };
  const m = Math.min(Math.max(meses, c.plazos[0]), c.plazos[1]);
  const financiado = Math.min(falta, Math.floor(precio * c.maxPct));
  return { condiciones: c, entregaMinima, falta, financiado, efectivo: falta - financiado, cuota: cuota(financiado, c.tna, m), meses: m };
}

export const comisionAgencia = (monto: number, anio: number, meses: number) => {
  const c = condiciones(anio);
  return c && meses >= 12 ? Math.round(monto * c.retornoAgencia) : 0;
};
