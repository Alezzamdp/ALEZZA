"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import Cargando from "@/components/Cargando";
import { SitioCabecera, SitioPie } from "@/components/SitioMarco";
import { contacto } from "@/lib/contacto";
import { supabase } from "@/lib/supabase";
import {
  CONFIG_INICIAL, DETALLE_EXTRAS, ELEGILO_SI, ETAPAS_INTEGRAL, EXTRAS, SERVICIOS, ahorroIntegral, calcularPrecio, calcularSena, normalizarPatente, pesos, servicioTexto,
  type Extra, type Servicio, type TurnosConfig,
} from "@/lib/turnos";

const campo = "w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 outline-none focus:border-[var(--tinta)]";
const etiqueta = "mb-1 block text-sm font-medium";
const titulo = "mb-3 flex items-baseline gap-3 text-lg font-bold";
const DATOS = ["nombre", "whatsapp", "patente", "vehiculo", "direccion", "notas"] as const;
type Datos = Record<(typeof DATOS)[number], string>;
const VACIO: Datos = { nombre: "", whatsapp: "", patente: "", vehiculo: "", direccion: "", notas: "" };
const PLANES_TURNO = ["puesta", "lavado"] as const; // la integral va primero y viene elegida: es la recomendada
const RECORDAR = "alezza-turno-datos"; // nombre, WhatsApp, patente y vehículo quedan en este dispositivo para el próximo turno

// Pedido de turno en una sola pantalla: qué necesita el auto (cada opción dice cuándo elegirla), qué día y los datos.
// El resumen queda fijo abajo con el total, la seña y lo que falta completar.
export default function PedirTurno() {
  const router = useRouter();
  const [dias, setDias] = useState<{ fecha: string; libres: number }[] | null>(null);
  const [config, setConfig] = useState<TurnosConfig>(CONFIG_INICIAL);
  const [cerrado, setCerrado] = useState(false);
  const [servicio, setServicio] = useState<Servicio | null>(null);
  const [extras, setExtras] = useState<Extra[]>([]);
  const [fecha, setFecha] = useState("");
  const [datos, setDatos] = useState<Datos>(VACIO);
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
      const q = new URLSearchParams(window.location.search);
      const pedido = q.get("servicio");
      const plan = pedido && (PLANES_TURNO as readonly string[]).includes(pedido) ? (pedido as Servicio) : null;
      const extra = q.get("extra");
      const suelto = extra && Object.hasOwn(EXTRAS, extra) ? (extra as Extra) : null;
      if (suelto) { setServicio((s) => s ?? "otro"); setExtras((x) => (x.length ? x : [suelto])); }
      else setServicio((s) => s ?? plan ?? "puesta"); // sin pedido concreto, viene elegida la integral
      try {
        const guardado = JSON.parse(localStorage.getItem(RECORDAR) ?? "null") as Partial<Datos> | null;
        if (guardado && typeof guardado === "object") {
          setDatos((a) => ({ ...a, ...Object.fromEntries((["nombre", "whatsapp", "patente", "vehiculo"] as const).flatMap((k) => (typeof guardado[k] === "string" ? [[k, guardado[k]]] : []))) }));
        }
      } catch { /* sin datos guardados */ }
    });
  }, []);

  const conServicio = !!servicio && (servicio !== "otro" || extras.length > 0);
  const precio = servicio && conServicio ? calcularPrecio(config, servicio, extras) : null;
  const sena = calcularSena(config, precio);
  const elegido = servicio && conServicio ? servicioTexto(servicio, extras) : "";
  const fmtDia = (iso: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("es-AR", { ...o, timeZone: "UTC" }).format(new Date(iso + "T00:00:00Z"));
  const precioDe = (k: Servicio | Extra) => (Number(config.precios[k]) > 0 ? pesos(Number(config.precios[k])) : "a cotizar");
  const falta = !conServicio ? "Elegí qué necesita tu auto" : !fecha ? "Elegí un día" : "";
  const ahorro = ahorroIntegral(config);
  // Con dos o más de los servicios que incluye la integral por separado, la integral es la mejor cuenta: se lo decimos.
  const enIntegral = extras.filter((x) => ETAPAS_INTEGRAL.some(([k]) => k === x));
  const sugerirIntegral = servicio === "otro" && enIntegral.length >= 2 && Number(config.precios.puesta) > 0;

  function elegirPlan(s: Servicio) {
    setServicio(servicio === s ? null : s);
    setExtras([]);
  }
  // Los servicios sueltos se combinan entre sí; elegir uno reemplaza al plan.
  function alternarExtra(x: Extra) {
    const nuevos = extras.includes(x) ? extras.filter((y) => y !== x) : [...extras, x];
    setExtras(nuevos);
    setServicio(nuevos.length ? "otro" : null);
  }

  async function pedir(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!servicio || falta) { setError(falta + "."); return; }
    if (!/^[A-Z0-9]{5,8}$/.test(normalizarPatente(datos.patente))) { setError("Revisá la patente (por ejemplo AB123CD o ABC123)."); return; }
    if (datos.whatsapp.replace(/\D/g, "").length < 8) { setError("Revisá el número de WhatsApp."); return; }
    setEnviando(true);
    setError("");
    const limpio = Object.fromEntries(DATOS.map((k) => [k, datos[k].trim()]));
    const { data, error } = await supabase.rpc("pedir_turno", { p: { ...limpio, fecha, servicio, extras } });
    if (error || !data) {
      setError(error?.code === "P0001" ? error.message : "No se pudo pedir el turno. Revisá los datos y probá de nuevo.");
      setEnviando(false);
      if (error?.message.includes("lugar")) { setFecha(""); supabase.rpc("turnos_disponibles").then((d) => d.data && setDias(d.data)); }
      return;
    }
    try {
      localStorage.setItem(RECORDAR, JSON.stringify({ nombre: limpio.nombre, whatsapp: limpio.whatsapp, patente: limpio.patente, vehiculo: limpio.vehiculo }));
    } catch { /* si no se puede guardar, no pasa nada */ }
    router.push(`/turnos/${data}`);
  }

  return (
    <main className="lp min-h-screen">
      <SitioCabecera accion={<Link href={contacto("turno")} className="lp-btn lp-btn-sm lp-btn-linea">¿Dudas?</Link>} />

      <section className="mx-auto max-w-3xl px-6 pt-10">
        <p className="font-mono text-xs uppercase tracking-widest text-gray-500">Taller ALEZZA DETAIL · Mar del Plata</p>
        <h1 className="mt-3 text-3xl font-extrabold md:text-4xl">Pedí tu turno</h1>
        <p className="mt-2 text-gray-600">Tres pasos, un minuto. Se reserva con una seña del {config.porcentaje_sena}%, que se descuenta del total.</p>

        {cerrado ? (
          <p className="mb-16 mt-8 rounded-lg border border-gray-200 bg-white p-6">
            Los turnos online todavía no están habilitados. <Link href={contacto("turno")} className="font-semibold underline">Escribinos desde Contacto</Link> y lo coordinamos.
          </p>
        ) : (
          <form onSubmit={pedir} className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-10">
            <fieldset className="min-w-0">
              <legend className={titulo}><span className="lp-num">01</span>¿Qué necesita tu auto?</legend>
              <div className="grid gap-2">
                {PLANES_TURNO.map((s) => (
                  <button key={s} type="button" aria-pressed={servicio === s} onClick={() => elegirPlan(s)} className={`tu-op${s === "puesta" ? " tu-op-top" : ""}`}>
                    <span className="tu-marca" aria-hidden>✓</span>
                    <span>
                      <b>{SERVICIOS[s]}{s === "puesta" && <em className="tu-recomendada">Recomendada</em>}</b>
                      <small>Elegilo si: {ELEGILO_SI[s].charAt(0).toLowerCase() + ELEGILO_SI[s].slice(1)}</small>
                      {s === "puesta" && ahorro !== null && <small className="tu-ahorro">Incluye barniz, motor e interior: ahorrás {pesos(ahorro)} frente a contratarlos por separado.</small>}
                    </span>
                    <span className="lp-precio">{precioDe(s)}</span>
                  </button>
                ))}
              </div>
              <p className="mb-2 mt-5 text-sm font-medium">O algo puntual <span className="font-normal text-gray-500">(podés combinar varios)</span></p>
              <div className="grid gap-2">
                {(Object.keys(DETALLE_EXTRAS) as Extra[]).map((x) => (
                  <button key={x} type="button" aria-pressed={extras.includes(x)} onClick={() => alternarExtra(x)} className="tu-op">
                    <span className="tu-marca tu-marca-multi" aria-hidden>✓</span>
                    <span><b>{DETALLE_EXTRAS[x][0]}</b><small>{ELEGILO_SI[x]}</small></span>
                    <span className="lp-precio">{precioDe(x)}</span>
                  </button>
                ))}
              </div>
              {sugerirIntegral && (
                <div className="tu-sugerencia paso-aparece" role="status">
                  <p>
                    Elegiste {enIntegral.length} de los {ETAPAS_INTEGRAL.length} servicios que incluye la Preparación integral. Con la integral tenés todos por <b>{precioDe("puesta")}</b>
                    {ahorro !== null && <> (ahorrás {pesos(ahorro)} frente a contratarlos por separado)</>}.
                  </p>
                  <button type="button" onClick={() => elegirPlan("puesta")} className="lp-btn lp-btn-sm">Pasar a la integral</button>
                </div>
              )}
              <p className="mt-3 text-sm text-gray-500">
                ¿No sabés cuál? <Link href="/#servicios" className="underline">Mirá la guía</Link>. ¿Sos agencia? <Link href={contacto("agencia")} className="underline">Coordinamos por lote</Link>.
              </p>
            </fieldset>

            <fieldset className="min-w-0">
              <legend className={titulo}><span className="lp-num">02</span>¿Qué día lo traés?</legend>
              {dias === null ? (
                <Cargando frase="Buscando días con lugar en el taller…" pantalla={false} />
              ) : dias.length === 0 ? (
                <p className="text-sm">No quedan días libres por ahora. <Link href={contacto("turno")} className="underline">Escribinos</Link> y te avisamos.</p>
              ) : (
                <div className="tu-dias" role="group" aria-label="Días con lugar">
                  {dias.map((d) => (
                    <button key={d.fecha} type="button" onClick={() => setFecha(d.fecha)} aria-pressed={fecha === d.fecha} className="tu-dia"
                      aria-label={`${fmtDia(d.fecha, { weekday: "long", day: "numeric", month: "long" })}, ${d.libres} ${d.libres === 1 ? "lugar" : "lugares"}`}>
                      <span className="block font-mono text-[11px] uppercase opacity-70">{fmtDia(d.fecha, { weekday: "short" })}</span>
                      <span className="block text-xl font-semibold leading-tight">{fmtDia(d.fecha, { day: "numeric" })}</span>
                      <span className="block text-[11px] opacity-70">{fmtDia(d.fecha, { month: "short" })}</span>
                      <span className="mt-1 block text-[10px] opacity-70">{d.libres === 1 ? "último lugar" : `${d.libres} lugares`}</span>
                    </button>
                  ))}
                </div>
              )}
            </fieldset>

            <fieldset className="min-w-0">
              <legend className={titulo}><span className="lp-num">03</span>Tus datos y el auto</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                {([
                  ["nombre", "Nombre y apellido", { required: true, minLength: 2, maxLength: 120, autoComplete: "name" }],
                  ["whatsapp", "Tu WhatsApp", { required: true, maxLength: 25, type: "tel", autoComplete: "tel", placeholder: "223 123-4567" }],
                  ["vehiculo", "Vehículo", { required: true, minLength: 2, maxLength: 120, placeholder: "Marca, modelo y año" }],
                  ["patente", "Patente", { required: true, maxLength: 10, placeholder: "AB123CD", className: `${campo} uppercase` }],
                ] as const).map(([k, t, props]) => (
                  <div key={k}>
                    <label className={etiqueta} htmlFor={k}>{t}</label>
                    <input id={k} className={campo} {...props} value={datos[k]} onChange={(e) => setDatos({ ...datos, [k]: e.target.value })} />
                  </div>
                ))}
                <details className="sm:col-span-2">
                  <summary className="cursor-pointer text-sm text-gray-600 underline">Agregar un comentario (opcional)</summary>
                  <textarea id="notas" aria-label="Comentario para el taller" maxLength={1000} rows={3} className={`${campo} mt-2`} placeholder="Algo que debamos saber del auto."
                    value={datos.notas} onChange={(e) => setDatos({ ...datos, notas: e.target.value })} />
                </details>
              </div>
            </fieldset>

            {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

            <div className="tu-barra">
              <div className="tu-barra-in">
                <div aria-live="polite">
                  <p className="text-sm text-gray-600">
                    {falta || <>{elegido} · <span className="first-letter:uppercase">{fmtDia(fecha, { weekday: "long", day: "numeric", month: "long" })}</span></>}
                  </p>
                  {conServicio && (
                    <p className="mt-0.5 font-mono text-sm">
                      {precio !== null ? <>Total {pesos(precio)} · </> : <>Precio a cotizar · </>}
                      <b>Seña {pesos(sena)}</b>
                      {servicio === "puesta" && ahorro !== null && <> · Ahorrás {pesos(ahorro)}</>}
                    </p>
                  )}
                </div>
                <button disabled={enviando || !!falta} className="lp-btn">
                  {enviando ? "Reservando…" : "Reservar y pagar la seña →"}
                </button>
              </div>
            </div>
          </form>
        )}
      </section>
      <SitioPie />
    </main>
  );
}
