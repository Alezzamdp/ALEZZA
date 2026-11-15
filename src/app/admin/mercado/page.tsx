"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import AdminGate, { ui } from "@/components/AdminGate";
import { supabase } from "@/lib/supabase";
import { pesos } from "@/lib/turnos";

// Mercado de hoy: dólar del día y cada auto del stock contra la mediana de sus referencias.
type Auto = { id: string; nombre: string; anio: number; precio: number | null; mediana: number | null; n: number; fuente: string; toma: number | null };
type Dia = { fecha: string; hora: string; oficial: number | null; blue: number | null; autos: Auto[]; referencias: { total: number; viejas: number } };

const variacion = (a: number | null | undefined, b: number | null | undefined) =>
  a && b ? Math.round(((a - b) / b) * 1000) / 10 : null;

export default function MercadoPage() {
  return <AdminGate titulo="Mercado hoy" frase="Mirando el mercado…">{() => <Mercado />}</AdminGate>;
}

function Mercado() {
  const [hoy, setHoy] = useState<Dia | null>(null);
  const [anterior, setAnterior] = useState<Dia | null>(null);
  const [cargando, setCargando] = useState(false);
  const [aviso, setAviso] = useState("");

  const cargar = useCallback(async (refrescar = false) => {
    setCargando(true);
    const { data } = await supabase.auth.getSession();
    const r = await fetch(`/api/mercado-hoy${refrescar ? "?refrescar=1" : ""}`, { headers: { Authorization: `Bearer ${data.session?.access_token ?? ""}` }, cache: "no-store" });
    const j = await r.json().catch(() => null);
    if (r.ok) { setHoy(j.hoy); setAnterior(j.anterior); setAviso(""); } else setAviso(j?.error ?? "No se pudo calcular.");
    setCargando(false);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial desde el servidor
  useEffect(() => { void cargar(); }, [cargar]);

  if (!hoy) return <p className="text-sm text-[var(--n500)]">{aviso || "Calculando…"}</p>;
  const previo = (id: string) => anterior?.autos.find((a) => a.id === id);

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          {[["Dólar oficial", hoy.oficial, anterior?.oficial], ["Dólar blue", hoy.blue, anterior?.blue]].map(([t, v, a]) => (
            <div key={t as string} className={`${ui.tarjeta} px-4 py-3`}>
              <p className={ui.etiqueta}>{t}</p>
              <p className="text-xl font-semibold">{v ? pesos(v as number) : "sin dato"}</p>
              {variacion(v as number, a as number) !== null && <p className="text-xs text-[var(--n500)]">{variacion(v as number, a as number)} % vs {anterior?.fecha}</p>}
            </div>
          ))}
        </div>
        <div className="text-right text-xs text-[var(--n500)]">
          <p>Calculado el {new Date(hoy.hora).toLocaleString("es-AR")}</p>
          <button onClick={() => cargar(true)} disabled={cargando} className={`${ui.botonSuave} mt-1`}>{cargando ? "Calculando…" : "Actualizar ahora"}</button>
        </div>
      </div>

      {hoy.referencias.viejas > 0 && (
        <p className="rounded-md bg-[var(--m50)] p-3 text-sm">
          {hoy.referencias.viejas} de {hoy.referencias.total} referencias tienen más de 30 días. Para que los valores sigan al día, cargá avisos nuevos en <Link href="/admin/referencias" className="underline">Referencias</Link>.
        </p>
      )}

      <div className={`${ui.tarjeta} overflow-x-auto`}>
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-[var(--n200)] font-mono text-xs uppercase text-[var(--n500)]">
            <tr><th className="p-3">Auto del stock</th><th className="p-3">Tu precio</th><th className="p-3">Mercado hoy</th><th className="p-3">Diferencia</th><th className="p-3">Toma sugerida</th><th className="p-3">Vs. anterior</th></tr>
          </thead>
          <tbody>
            {hoy.autos.map((a) => {
              const dif = variacion(a.precio, a.mediana);
              const mov = variacion(a.mediana, previo(a.id)?.mediana);
              return (
                <tr key={a.id} className="border-b border-[var(--n100)]">
                  <td className="p-3 font-semibold">{a.nombre} {a.anio}</td>
                  <td className="p-3 font-mono">{a.precio ? pesos(a.precio) : "-"}</td>
                  <td className="p-3 font-mono">{a.mediana ? pesos(a.mediana) : <span className="text-[var(--n500)]">faltan referencias ({a.n} de 3)</span>}
                    {a.mediana && <span className="block text-xs text-[var(--n500)]">{a.n} avisos · {a.fuente}</span>}</td>
                  <td className="p-3 font-mono">{dif === null ? "-" : `${dif > 0 ? "+" : ""}${dif} %`}</td>
                  <td className="p-3 font-mono">{a.toma ? pesos(a.toma) : "-"}</td>
                  <td className="p-3 font-mono">{mov === null ? "-" : `${mov > 0 ? "+" : ""}${mov} %`}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-[var(--n500)]">
        Mercado = mediana de avisos de los últimos 180 días, año ±1 (mínimo 3). Los avisos en dólares se pasan a pesos con el blue de hoy. Son precios publicados, no de cierre.
        Mercado Libre se suma solo cuando habilite el permiso a la app.
      </p>
    </div>
  );
}
