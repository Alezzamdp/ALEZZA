"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { SitioCabecera, SitioPie } from "@/components/SitioMarco";
import { PLAZOS, condiciones, plan } from "@/lib/financiacion";
import { supabase } from "@/lib/supabase";
import { mensajeAlezza, pesos, waAlezza } from "@/lib/turnos";

type Auto = { id: string; brand: string; model: string; version: string | null; year: number; price_ars: number | null };

const campo = "w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 outline-none focus:border-[var(--tinta)]";
const etiqueta = "mb-1 block text-sm font-medium";
const TABLA = [
  ["2021 – 2026", "43 %", "60 %", "6 a 36 meses"],
  ["2017 – 2020", "53 %", "55 %", "6 a 36 meses"],
  ["2014 – 2016", "53 %", "40 %", "6 a 30 meses"],
  ["2011 – 2013", "53 %", "35 %", "6 a 24 meses"],
];

// Financiación con DNI (CreditCar): simulación con sus condiciones y solicitud para que ALEZZA la gestione.
export default function Financiacion() {
  const [autos, setAutos] = useState<Auto[]>([]);
  const [autoId, setAutoId] = useState("");
  const [anio, setAnio] = useState(2022);
  const [precio, setPrecio] = useState(0);
  const [aporte, setAporte] = useState(0);
  const [meses, setMeses] = useState(36);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    const q = new URLSearchParams(location.search);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- el aporte llega por la dirección (desde la tasación), solo existe en el navegador
    if (q.get("aporte")) setAporte(Math.max(0, Number(q.get("aporte")) || 0));
    supabase.from("vehicles").select("id, brand, model, version, year, price_ars").eq("status", "available").not("price_ars", "is", null).order("year", { ascending: false })
      .then(({ data }) => {
        const lista = (data ?? []) as Auto[];
        setAutos(lista);
        const elegido = lista.find((a) => a.id === q.get("vehiculo"));
        if (elegido) { setAutoId(elegido.id); setAnio(elegido.year); setPrecio(Number(elegido.price_ars)); }
      });
  }, []);

  const auto = autos.find((a) => a.id === autoId);
  const nombreAuto = auto ? `${auto.brand} ${auto.model}${auto.version ? " " + auto.version : ""} ${auto.year}` : "";
  const c = condiciones(anio);
  const p = useMemo(() => (precio > 0 ? plan(precio, anio, aporte, meses) : null), [precio, anio, aporte, meses]);

  function elegirAuto(id: string) {
    setAutoId(id);
    const a = autos.find((x) => x.id === id);
    if (a) { setAnio(a.year); setPrecio(Number(a.price_ars)); }
  }

  async function pedir(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!p || !c || p.financiado <= 0) { setError("Completá el auto y el precio para simular."); return; }
    const f = new FormData(e.currentTarget);
    const dni = String(f.get("dni") ?? "").replace(/\D/g, "");
    if (!/^\d{7,8}$/.test(dni)) { setError("Revisá el DNI (7 u 8 números)."); return; }
    setEnviando(true);
    setError("");
    const datos = {
      dni, nombre: String(f.get("nombre") ?? "").trim(), whatsapp: String(f.get("whatsapp") ?? ""),
      vehicle_id: autoId || "", vehiculo: nombreAuto || String(f.get("vehiculo") ?? "").trim(),
      anio, precio, monto: p.financiado, plazo: p.meses, cuota: p.cuota, consiento: f.get("consiento") === "on",
    };
    const { error } = await supabase.rpc("pedir_financiacion", { p: datos });
    setEnviando(false);
    if (error) { setError(error.code === "P0001" ? error.message : "No se pudo enviar. Revisá los datos o escribinos por WhatsApp."); return; }
    setEnviado(true);
  }

  const resumenWa = waAlezza(mensajeAlezza("Quiero financiar un auto con mi DNI.", [
    ["Vehículo", nombreAuto || null], ["Año", String(anio)], ["Precio", precio ? pesos(precio) : null],
    ["A financiar", p ? pesos(p.financiado) : null], ["Plazo", p ? `${p.meses} meses` : null], ["Cuota estimada", p?.cuota ? pesos(p.cuota) : null],
  ]));

  return (
    <main className="lp min-h-screen">
      <SitioCabecera activa="/financiacion" />

      <section className="mx-auto grid max-w-5xl gap-8 px-6 pb-16 pt-10 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-gray-500">Financiación · con CreditCar</p>
          <h1 className="mt-3 text-3xl font-extrabold md:text-4xl">Financiá tu próximo auto <span className="text-[var(--mostaza)]">solo con tu DNI</span>.</h1>
          <p className="mt-3 text-gray-600">Cuotas fijas en pesos, aprobación rápida y mínimos requisitos. Simulá acá y nosotros hacemos la gestión.</p>

          <div className="mt-6 overflow-hidden rounded-lg border border-gray-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--tinta)] font-mono text-xs uppercase tracking-wider text-white">
                <tr><th className="px-3 py-2">Modelo</th><th className="px-3 py-2">Tasa anual</th><th className="px-3 py-2">Hasta</th><th className="px-3 py-2">Plazo</th></tr>
              </thead>
              <tbody>
                {TABLA.map((f) => (
                  <tr key={f[0]} className={`border-t border-gray-100 ${c && String(anio) >= f[0].slice(0, 4) && String(anio) <= f[0].slice(-4) ? "bg-[var(--m50)] font-semibold" : ""}`}>
                    {f.map((x, i) => <td key={i} className="px-3 py-2 font-mono">{x}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-gray-500">“Hasta” es el porcentaje máximo del valor del auto que se puede financiar. Condiciones de CreditCar, sujetas a aprobación crediticia.</p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          {enviado ? (
            <div className="paso-aparece grid gap-4">
              <h2 className="text-2xl font-bold">¡Listo! Recibimos tu solicitud.</h2>
              <p className="text-gray-600">La cargamos en CreditCar y te escribimos por WhatsApp con la respuesta.</p>
              <a href={resumenWa} target="_blank" rel="noopener noreferrer" className="justify-self-start rounded-md bg-[var(--tinta)] px-5 py-2.5 text-sm font-semibold text-white">Escribirnos por WhatsApp</a>
            </div>
          ) : (
            <form onSubmit={pedir} className="grid gap-4">
              <h2 className="text-xl font-bold">Simulá tu cuota</h2>
              <div>
                <label className={etiqueta} htmlFor="auto">Auto</label>
                <select id="auto" value={autoId} onChange={(e) => elegirAuto(e.target.value)} className={campo}>
                  <option value="">Otro auto (lo cargo yo)</option>
                  {autos.map((a) => <option key={a.id} value={a.id}>{a.brand} {a.model} {a.year} · {pesos(Number(a.price_ars))}</option>)}
                </select>
              </div>
              {!autoId && (
                <div className="paso-aparece grid gap-4 sm:grid-cols-3">
                  <div className="sm:col-span-3"><label className={etiqueta} htmlFor="vehiculo">Marca y modelo</label><input id="vehiculo" name="vehiculo" required minLength={2} maxLength={120} className={campo} /></div>
                  <div><label className={etiqueta} htmlFor="anio">Año</label><input id="anio" type="number" min={2011} max={2027} value={anio} onChange={(e) => setAnio(Number(e.target.value))} className={campo} /></div>
                  <div className="sm:col-span-2"><label className={etiqueta} htmlFor="precio">Precio ($)</label><input id="precio" type="number" min={0} step={100000} value={precio || ""} onChange={(e) => setPrecio(Number(e.target.value))} className={campo} /></div>
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <div><label className={etiqueta} htmlFor="aporte">Tu aporte o permuta ($)</label><input id="aporte" type="number" min={0} step={100000} value={aporte || ""} onChange={(e) => setAporte(Number(e.target.value))} className={campo} /></div>
                <div>
                  <label className={etiqueta} htmlFor="plazo">Plazo</label>
                  <select id="plazo" value={meses} onChange={(e) => setMeses(Number(e.target.value))} className={campo}>
                    {PLAZOS.filter((m) => !c || (m >= c.plazos[0] && m <= c.plazos[1])).map((m) => <option key={m} value={m}>{m} meses</option>)}
                  </select>
                </div>
              </div>

              {!c ? (
                <p className="text-sm text-red-700">CreditCar financia autos 2011 en adelante.</p>
              ) : p ? (
                <div className="paso-aparece grid gap-3">
                  <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-gray-200 bg-gray-200 text-sm">
                    <div className="bg-[var(--m50)] p-3">
                      <dt className="font-mono text-xs uppercase tracking-wider text-gray-600">Entrega inicial mínima</dt>
                      <dd className="text-xl font-bold">{pesos(p.entregaMinima)}</dd>
                      <dd className="text-xs text-gray-600">{100 - Math.round(c.maxPct * 100)} % del valor</dd>
                    </div>
                    <div className="bg-white p-3">
                      <dt className="font-mono text-xs uppercase tracking-wider text-gray-600">A financiar</dt>
                      <dd className="text-xl font-bold">{pesos(p.financiado)}</dd>
                      <dd className="text-xs text-gray-600">máximo {pesos(Math.floor(precio * c.maxPct))}</dd>
                    </div>
                    <div className="col-span-2 bg-white p-3">
                      <dt className="font-mono text-xs uppercase tracking-wider text-gray-600">Entregás en total</dt>
                      <dd className="font-semibold">
                        {pesos(precio - p.financiado)}
                        {aporte > 0 && p.efectivo > 0 && <span className="font-normal text-gray-600"> · tu aporte {pesos(aporte)} + {pesos(p.efectivo)} en efectivo</span>}
                      </dd>
                    </div>
                  </dl>
                  {p.financiado > 0 ? (
                    <div className="rounded-md bg-[var(--tinta)] p-4 text-white">
                      <p className="font-mono text-xs uppercase tracking-wider opacity-70">Cuota estimada</p>
                      <p className="text-3xl font-bold">{pesos(p.cuota)} <span className="text-base font-normal opacity-70">× {p.meses} meses</span></p>
                      <p className="mt-2 text-sm opacity-80">Tasa fija del {Math.round(c.tna * 100)} % anual en pesos.</p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600">Con tu aporte cubrís el total: no hace falta financiar.</p>
                  )}
                </div>
              ) : null}

              {p && p.financiado > 0 && (
                <div className="paso-aparece grid gap-4 border-t border-gray-100 pt-4">
                  <p className="text-sm font-medium">Pedí la financiación: solo necesitamos tu DNI y un WhatsApp.</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div><label className={etiqueta} htmlFor="dni">DNI</label><input id="dni" name="dni" inputMode="numeric" required maxLength={10} placeholder="30123456" className={campo} /></div>
                    <div><label className={etiqueta} htmlFor="whatsapp">WhatsApp</label><input id="whatsapp" name="whatsapp" type="tel" required maxLength={25} placeholder="223 123-4567" className={campo} /></div>
                    <div className="sm:col-span-2"><label className={etiqueta} htmlFor="nombre">Nombre y apellido</label><input id="nombre" name="nombre" required minLength={2} maxLength={120} autoComplete="name" className={campo} /></div>
                  </div>
                  <label className="flex items-start gap-2 text-xs text-gray-600">
                    <input type="checkbox" name="consiento" required className="mt-0.5 h-4 w-4 accent-[var(--tinta)]" />
                    Autorizo a ALEZZA a usar mis datos solo para gestionar esta financiación con CreditCar (Ley 25.326).
                  </label>
                  {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
                  <button disabled={enviando} className="justify-self-start lp-btn disabled:opacity-60">
                    {enviando ? "Enviando…" : "Pedir financiación →"}
                  </button>
                </div>
              )}
              <p className="text-xs text-gray-500">Cuota estimada en sistema francés, sin gastos, seguros ni impuestos. La aprobación y el valor final los define CreditCar.</p>
            </form>
          )}
        </div>
      </section>
      <SitioPie />
    </main>
  );
}
