// Cotización del día (dolarapi.com: gratis, sin clave). Next la guarda 1 hora.
export type Dolar = { casa: string; compra: number; venta: number; fecha: string };

export async function dolar(casa: "oficial" | "blue"): Promise<Dolar | null> {
  try {
    const r = await fetch(`https://dolarapi.com/v1/dolares/${casa}`, { next: { revalidate: 3600 } });
    const d = await r.json();
    return d?.venta > 0 ? { casa, compra: d.compra, venta: d.venta, fecha: d.fechaActualizacion } : null;
  } catch {
    return null;
  }
}
