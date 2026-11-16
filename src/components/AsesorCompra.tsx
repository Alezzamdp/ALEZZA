"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Cargando from "@/components/Cargando";
import { plan } from "@/lib/financiacion";
import { MARGEN_TOMA, valorToma } from "@/lib/market";
import { supabase } from "@/lib/supabase";
import { mensajeAlezza, pesos, waAlezza } from "@/lib/turnos";

// Asesor de compra después de tasar: valor estimado de toma (mercado − 15 %), autos del stock
// que le entran con esa toma + financiación CreditCar, y el plan de cada uno.
// Mercado: primero Mercado Libre en vivo (/api/tasacion); si no hay datos, las referencias cargadas.
type Mercado = { fuente: string; n: number; mediana: number | null; p25: number | null; p75: number | null; kmPromedio?: number | null };
type Auto = { id: string; brand: string; model: string; version: string | null; year: number; price_ars: number | null };
export type DatosTasacion = { marca: string; modelo: string; anio: number; km: number; deseado: string | null };

export default function AsesorCompra({ datos }: { datos: DatosTasacion }) {
  const [mercado, setMercado] = useState<Mercado | null | undefined>(undefined);
  const [autos, setAutos] = useState<Auto[]>([]);

  useEffect(() => {
    async function cargar() {
      // /api/tasacion ya resuelve Mercado Libre o, si no hay, las referencias cargadas.
      const [m, v] = await Promise.all([
        fetch("/api/tasacion", { method: "POST", body: JSON.stringify(datos) }).then((r) => r.json()).catch(() => null) as Promise<Mercado | null>,
        supabase.from("vehicles").select("id, brand, model, version, year, price_ars").eq("status", "available").not("price_ars", "is", null),
      ]);
      setMercado(m?.fuente ? m : null);
      setAutos((v.data ?? []) as Auto[]);
    }
    void cargar();
  }, [datos]);

  if (mercado === undefined) return <Cargando frase="Tasando tu auto con el mercado…" pantalla={false} />;

  const toma = mercado?.mediana ? valorToma(mercado.mediana) : 0;
  const opciones = autos
    .map((a) => ({ a, p: plan(Number(a.price_ars), a.year, toma, 36) }))
    .filter((o) => o.p.condiciones || o.p.falta === 0)
    // Primero el que eligió; después los que le entran sin poner plata extra; después los más cercanos.
    .sort((x, y) => Number(y.a.id === datos.deseado) - Number(x.a.id === datos.deseado) || x.p.efectivo - y.p.efectivo)
    .slice(0, 3);
  const auto = `${datos.marca} ${datos.modelo} ${datos.anio}`;

  return (
    <section className="paso-aparece grid gap-4 rounded-2xl border border-gray-200 bg-white p-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-[var(--m700)]">Tu asesor ALEZZA</p>
        <h2 className="mt-1 text-2xl font-bold">Tasación estimada de tu {auto}</h2>
      </div>

      {mercado?.mediana ? (
        <div className="rounded-xl bg-[var(--tinta)] p-5 text-white">
          <p className="font-mono text-xs uppercase tracking-wider opacity-70">Valor estimado de toma</p>
          <p className="text-3xl font-bold">{pesos(toma)}</p>
          {mercado.p25 && mercado.p75 && (
            <p className="mt-1 text-sm opacity-80">Rango: {pesos(valorToma(mercado.p25))} – {pesos(valorToma(mercado.p75))}</p>
          )}
          <p className="mt-3 text-xs opacity-70">
            Mediana de {mercado.n} publicaciones de autos similares ({mercado.fuente}), menos el {Math.round(MARGEN_TOMA * 100)} % de margen de ALEZZA.
            {mercado.kmPromedio ? ` Tu auto tiene ${datos.km.toLocaleString("es-AR")} km; los publicados promedian ${mercado.kmPromedio.toLocaleString("es-AR")} km.` : ""}
            Es una estimación: el valor final lo confirmamos al ver el auto y las fotos.
          </p>
        </div>
      ) : (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Todavía no tenemos suficientes referencias de mercado para tu {auto}. Un asesor lo tasa a mano y te escribe.
        </p>
      )}

      {opciones.length > 0 && (
        <div className="grid gap-3">
          <h3 className="font-semibold">{toma ? "Con tu auto y financiación, te podés llevar:" : "Autos en stock que podés financiar:"}</h3>
          {opciones.map(({ a, p }) => {
            const nombre = `${a.brand} ${a.model}${a.version ? " " + a.version : ""} ${a.year}`;
            return (
              <article key={a.id} className={`grid gap-2 rounded-xl border p-4 sm:grid-cols-[1fr_auto] sm:items-center ${a.id === datos.deseado ? "border-[var(--tinta)]" : "border-gray-200"}`}>
                <div>
                  <p className="font-semibold">{nombre} {a.id === datos.deseado && <span className="ml-1 rounded-full bg-[var(--tinta)] px-2 py-0.5 text-xs text-[var(--papel)]">el que elegiste</span>}</p>
                  <p className="font-mono text-sm text-gray-600">
                    Precio {pesos(Number(a.price_ars))}{toma > 0 && ` − tu auto ${pesos(Math.min(toma, Number(a.price_ars)))}`}
                  </p>
                  <p className="text-sm">
                    {p.falta === 0 ? "Tu auto cubre el total." : (
                      <>Financiás {pesos(p.financiado)} en <b>{p.meses} cuotas de {pesos(p.cuota)}</b>{p.efectivo > 0 ? <> y ponés {pesos(p.efectivo)}</> : " sin poner plata extra"}.</>
                    )}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {p.financiado > 0 && (
                    <Link href={`/financiacion?vehiculo=${a.id}&aporte=${toma}`} className="rounded-md bg-[var(--tinta)] px-4 py-2 text-sm font-semibold text-white">Financiarlo</Link>
                  )}
                  <a href={waAlezza(mensajeAlezza("Quiero avanzar con una permuta.", [
                    ["Mi auto", auto], ["Toma estimada", toma ? pesos(toma) : "a tasar"], ["Me interesa", nombre],
                    ["Financiación", p.financiado ? `${pesos(p.financiado)} en ${p.meses} cuotas de ${pesos(p.cuota)}` : null],
                  ]))} target="_blank" rel="noopener noreferrer" className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">Hablar con un asesor</a>
                </div>
              </article>
            );
          })}
          <p className="text-xs text-gray-500">Cuotas estimadas con las condiciones de CreditCar (sistema francés, sin gastos ni seguros), sujetas a aprobación.</p>
        </div>
      )}
    </section>
  );
}
