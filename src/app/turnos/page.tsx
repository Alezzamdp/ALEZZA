"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import Cargando from "@/components/Cargando";
import { SitioCabecera, SitioPie } from "@/components/SitioMarco";
import { supabase } from "@/lib/supabase";
import {
  CONFIG_INICIAL, EXTRAS, SERVICIOS, calcularPrecio, calcularSena, normalizarPatente, pesos, servicioTexto, mensajeAlezza, waAlezza,
  type Extra, type Servicio, type TurnosConfig,
} from "@/lib/turnos";

const campo = "w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 outline-none focus:border-[var(--tinta)]";
const etiqueta = "mb-1 block text-sm font-medium";
const DATOS = ["nombre", "whatsapp", "patente", "vehiculo", "direccion", "notas"] as const;
type Datos = Record<(typeof DATOS)[number], string>;

// Pedido en tres pasos: cada uno aparece recién cuando el anterior está completo.
export default function PedirTurno() {
  const router = useRouter();
  const [dias, setDias] = useState<{ fecha: string; libres: number }[] | null>(null);
  const [config, setConfig] = useState<TurnosConfig>(CONFIG_INICIAL);
  const [cerrado, setCerrado] = useState(false);
  const [servicio, setServicio] = useState<Servicio | null>(null);
  const [extras, setExtras] = useState<Extra[]>([]);
  const [fecha, setFecha] = useState("");
  const [datos, setDatos] = useState<Datos>({ nombre: "", whatsapp: "", patente: "", vehiculo: "", direccion: "", notas: "" });
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    Promise.all([
      supabase.rpc("turnos_disponibles"),
      supabase.from("app_settings").select("value").eq("key", "turnos").maybeSingle(),
    ]).then(([d, c]) => {
      if (d.error) { setCerrado(true); return; }
      setDias((d.data ?? []) as { fecha: string; libres: number }[]);
      if (c.data?.value) setConfig({ ...CONFIG_INICIAL, ...(c.data.value as Partial<TurnosConfig>) });
      // Desde Inicio o Servicios se llega con el plan ya elegido (/turnos?servicio=lavado); solo se aceptan los conocidos.
      const pedido = new URLSearchParams(window.location.search).get("servicio");
      if (pedido && Object.hasOwn(SERVICIOS, pedido)) setServicio((s) => s ?? (pedido as Servicio));
      const extra = new URLSearchParams(window.location.search).get("extra");
      if (extra && Object.hasOwn(EXTRAS, extra)) { setServicio((s) => s ?? "otro"); setExtras((x) => (x.length ? x : [extra as Extra])); }
    });
  }, []);

  const paso1 = !!servicio && (servicio !== "otro" || extras.length > 0);
  const paso2 = paso1 && !!fecha;
  const precio = servicio ? calcularPrecio(config, servicio, extras) : null;
  const sena = calcularSena(config, precio);
  const elegido = servicio ? servicioTexto(servicio, extras) : "";
  const fmtDia = (iso: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("es-AR", { ...o, timeZone: "UTC" }).format(new Date(iso + "T00:00:00Z"));
  const consulta = waAlezza(mensajeAlezza("Quiero pedir un turno en el taller.", [
    ["Servicio", elegido],
    ["Día", fecha ? fmtDia(fecha, { weekday: "long", day: "numeric", month: "long" }) : null],
    ["Vehículo", datos.vehiculo],
    ["Patente", datos.patente ? normalizarPatente(datos.patente) : null],
    ["Nombre", datos.nombre],
  ]));

  function elegirServicio(s: Servicio) {
    setServicio(s);
    if (s !== "otro") setExtras([]);
  }

  async function pedir(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!servicio || !paso2) return;
    if (!/^[A-Z0-9]{5,8}$/.test(normalizarPatente(datos.patente))) { setError("Revisá la patente (por ejemplo AB123CD o ABC123)."); return; }
    if (datos.whatsapp.replace(/\D/g, "").length < 8) { setError("Revisá el número de WhatsApp."); return; }
    setEnviando(true);
    setError("");
    const limpio = Object.fromEntries(DATOS.map((k) => [k, datos[k].trim()]));
    const { data, error } = await supabase.rpc("pedir_turno", { p: { ...limpio, fecha, servicio, extras } });
    if (error || !data) {
      setError(error?.code === "P0001" ? error.message : "No se pudo pedir el turno. Revisá los datos o escribinos por WhatsApp.");
      setEnviando(false);
      if (error?.message.includes("lugar")) { setFecha(""); supabase.rpc("turnos_disponibles").then((d) => d.data && setDias(d.data)); }
      return;
    }
    router.push(`/turnos/${data}`);
  }

  const elegible = (on: boolean) => `cursor-pointer rounded-lg border p-4 text-left transition ${on ? "border-[var(--tinta)] bg-[var(--tinta)] text-white" : "border-gray-200 bg-white hover:border-gray-400"}`;
  const precioDe = (k: Servicio | Extra) => (Number(config.precios[k]) > 0 ? pesos(Number(config.precios[k])) : "a cotizar");

  return (
    <main className="lp min-h-screen">
      <SitioCabecera activa="/servicios" accion={<a href={consulta} target="_blank" rel="noopener noreferrer" className="lp-btn lp-btn-sm lp-btn-linea">WhatsApp</a>} />

      <section className="mx-auto max-w-4xl px-6 pb-16 pt-10">
        <p className="font-mono text-xs uppercase tracking-widest text-gray-500">Estética técnica · Mar del Plata</p>
        <h1 className="mt-3 text-3xl font-extrabold md:text-4xl">Pedí tu turno</h1>
        <p className="mt-2 text-gray-600">Se reserva con una seña del {config.porcentaje_sena}% del servicio, que se descuenta del total.</p>

        {cerrado ? (
          <p className="mt-8 rounded-lg border border-gray-200 bg-white p-6">
            Los turnos online todavía no están habilitados. <a href={consulta} target="_blank" rel="noopener noreferrer" className="font-semibold underline">Escribinos por WhatsApp</a> y lo coordinamos.
          </p>
        ) : (
          <form onSubmit={pedir} className="mt-8 grid gap-8">
            <fieldset>
              <legend className="mb-3 font-mono text-xs uppercase tracking-wider text-[var(--m700)]">01 · Servicio</legend>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {(Object.keys(SERVICIOS) as Servicio[]).map((s) => (
                  <button key={s} type="button" aria-pressed={servicio === s} onClick={() => elegirServicio(s)} className={elegible(servicio === s)}>
                    <span className="block font-semibold">{SERVICIOS[s]}</span>
                    <span className="font-mono text-xs opacity-70">{s === "otro" ? "elegís qué hacer" : precioDe(s)}</span>
                  </button>
                ))}
              </div>
              {servicio === "otro" && (
                <div className="paso-aparece mt-4 rounded-lg border border-gray-200 bg-white p-4">
                  <p className="mb-3 text-sm font-medium">¿Qué querés hacer? Podés elegir varios.</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {(Object.keys(EXTRAS) as Extra[]).map((x) => (
                      <label key={x} className="flex cursor-pointer items-center gap-3 rounded-md border border-gray-200 px-3 py-2 hover:border-gray-400">
                        <input type="checkbox" checked={extras.includes(x)} onChange={(e) => setExtras(e.target.checked ? [...extras, x] : extras.filter((y) => y !== x))} className="h-4 w-4 accent-[var(--tinta)]" />
                        <span className="flex-1 text-sm">{EXTRAS[x]}</span>
                        <span className="font-mono text-xs text-gray-500">{precioDe(x)}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </fieldset>

            {paso1 && (
              <fieldset className="paso-aparece">
                <legend className="mb-3 font-mono text-xs uppercase tracking-wider text-[var(--m700)]">02 · Día</legend>
                {dias === null ? (
                  <Cargando frase="Buscando días con lugar en el taller…" pantalla={false} />
                ) : dias.length === 0 ? (
                  <p className="text-sm">No quedan días libres por ahora. <a href={consulta} target="_blank" rel="noopener noreferrer" className="underline">Escribinos</a>.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {dias.map((d) => (
                      <button key={d.fecha} type="button" onClick={() => setFecha(d.fecha)} aria-pressed={fecha === d.fecha}
                        className={`w-[86px] rounded-md border px-2 py-2 text-center ${fecha === d.fecha ? "border-[var(--tinta)] bg-[var(--tinta)] text-white" : "border-gray-200 bg-white hover:border-gray-400"}`}>
                        <span className="block font-mono text-[11px] uppercase opacity-70">{fmtDia(d.fecha, { weekday: "short" })}</span>
                        <span className="block text-lg font-semibold leading-tight">{fmtDia(d.fecha, { day: "numeric" })}</span>
                        <span className="block text-[11px] opacity-70">{fmtDia(d.fecha, { month: "short" })} · {d.libres} {d.libres === 1 ? "lugar" : "lugares"}</span>
                      </button>
                    ))}
                  </div>
                )}
              </fieldset>
            )}

            {paso2 && (
              <fieldset className="paso-aparece">
                <legend className="mb-3 font-mono text-xs uppercase tracking-wider text-[var(--m700)]">03 · Tus datos y el auto</legend>
                <div className="grid gap-4 sm:grid-cols-2">
                  {([
                    ["nombre", "Nombre y apellido", { required: true, minLength: 2, maxLength: 120, autoComplete: "name" }],
                    ["whatsapp", "WhatsApp", { required: true, maxLength: 25, type: "tel", autoComplete: "tel", placeholder: "223 123-4567" }],
                    ["patente", "Patente", { required: true, maxLength: 10, placeholder: "AB123CD", className: `${campo} uppercase` }],
                    ["vehiculo", "Vehículo", { required: true, minLength: 2, maxLength: 120, placeholder: "Marca, modelo y año" }],
                  ] as const).map(([k, t, props]) => (
                    <div key={k}>
                      <label className={etiqueta} htmlFor={k}>{t}</label>
                      <input id={k} className={campo} {...props} value={datos[k]} onChange={(e) => setDatos({ ...datos, [k]: e.target.value })} />
                    </div>
                  ))}
                  <div className="sm:col-span-2">
                    <label className={etiqueta} htmlFor="direccion">Dirección <span className="font-normal text-gray-500">(opcional)</span></label>
                    <input id="direccion" maxLength={200} autoComplete="street-address" className={campo} value={datos.direccion} onChange={(e) => setDatos({ ...datos, direccion: e.target.value })} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={etiqueta} htmlFor="notas">¿Algo que debamos saber? <span className="font-normal text-gray-500">(opcional)</span></label>
                    <textarea id="notas" maxLength={1000} rows={3} className={campo} value={datos.notas} onChange={(e) => setDatos({ ...datos, notas: e.target.value })} />
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap items-end justify-between gap-4 rounded-lg border border-gray-200 bg-white p-5">
                  <div>
                    <p className="text-sm text-gray-600">{elegido} · {fmtDia(fecha, { weekday: "long", day: "numeric", month: "long" })}</p>
                    <p className="mt-1 font-mono">
                      {precio !== null ? <>Total {pesos(precio)} · </> : <>Precio a cotizar · </>}
                      <b>Seña {pesos(sena)}</b>
                    </p>
                  </div>
                  <button disabled={enviando} className="lp-btn disabled:opacity-60">
                    {enviando ? "Reservando…" : "Reservar y pagar la seña →"}
                  </button>
                </div>
              </fieldset>
            )}

            {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
            <p className="text-sm text-gray-500">¿Preferís hablarlo? <a href={consulta} target="_blank" rel="noopener noreferrer" className="underline">Escribinos por WhatsApp</a> con lo que ya elegiste.</p>
          </form>
        )}
      </section>
      <SitioPie />
    </main>
  );
}
