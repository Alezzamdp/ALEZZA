"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SitioCabecera, SitioPie } from "@/components/SitioMarco";
import { contacto } from "@/lib/contacto";
import { supabase } from "@/lib/supabase";
import { CONFIG_INICIAL, mensajeAlezza, pesos, waAlezza, type TurnosConfig } from "@/lib/turnos";

type Opcion = "puesta" | "lavado" | "otro";

const OPCIONES: { k: Opcion; t: string; d: string }[] = [
  { k: "puesta", t: "Plan Agencias · Preparación integral", d: "Para las unidades de una agencia: barniz, motor e interior." },
  { k: "lavado", t: "Preparación base", d: "Para particulares: lavado detallado, interior y listo para fotos." },
  { k: "otro", t: "Otro servicio", d: "Pulido, motor, interior o butacas: lo coordinamos por WhatsApp." },
];

const campo = "w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 text-base outline-none focus:border-[var(--rosa)]";
const etiqueta = "mb-1 block text-sm font-medium";

// Solicitud de turno sin calendario: elegís qué necesitás, dejás nombre y vehículo y se abre WhatsApp con el mensaje armado.
// El día y la hora se coordinan por WhatsApp.
export default function SolicitarTurno() {
  const [config, setConfig] = useState<TurnosConfig>(CONFIG_INICIAL);
  const [opcion, setOpcion] = useState<Opcion>("puesta");
  const [nombre, setNombre] = useState("");
  const [vehiculo, setVehiculo] = useState("");
  const [unidades, setUnidades] = useState("");

  useEffect(() => {
    // Los precios salen de la configuración (los mismos de la página principal); sin conexión quedan los iniciales.
    supabase.from("app_settings").select("value").eq("key", "turnos").maybeSingle().then(({ data }) => {
      if (data?.value) setConfig({ ...CONFIG_INICIAL, ...(data.value as Partial<TurnosConfig>) });
    });
    // Se llega desde el Inicio con el plan ya elegido (/turnos?servicio=lavado); solo se aceptan los conocidos.
    const q = new URLSearchParams(window.location.search);
    const pedido = q.get("servicio");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- la URL solo se puede leer en el navegador, después de montar
    if (pedido === "lavado" || pedido === "puesta") setOpcion(pedido);
    else if (q.get("extra")) setOpcion("otro");
  }, []);

  const precioDe = (k: Opcion) => (k !== "otro" && Number(config.precios[k]) > 0 ? pesos(Number(config.precios[k])) : "");
  const elegida = OPCIONES.find((o) => o.k === opcion)!;
  const completo = nombre.trim().length >= 2 && vehiculo.trim().length >= 2;
  const mensaje = waAlezza(mensajeAlezza("Quiero solicitar un turno en el taller.", [
    ["Servicio", elegida.t],
    ["Unidades", opcion === "puesta" ? unidades.trim() || null : null],
    ["Vehículo", vehiculo.trim()],
    ["Nombre", nombre.trim()],
  ]));

  return (
    <main className="lp min-h-screen">
      <SitioCabecera accion={<Link href={contacto("turno")} className="lp-btn lp-btn-sm lp-btn-linea">¿Dudas?</Link>} />

      <section className="mx-auto max-w-2xl px-6 pb-16 pt-10">
        <p className="lp-kicker">Taller ALEZZA DETAIL · Mar del Plata</p>
        <h1 className="mt-3 text-3xl font-extrabold md:text-4xl">Solicitar turno</h1>
        <p className="mt-3 text-lg text-gray-600">Contanos qué necesitás y te escribimos por WhatsApp para coordinar el día y la hora.</p>

        <fieldset className="mt-8 min-w-0">
          <legend className="mb-3 text-lg font-bold">1. ¿Qué necesitás?</legend>
          <div className="grid gap-2">
            {OPCIONES.map((o) => (
              <button key={o.k} type="button" aria-pressed={opcion === o.k} onClick={() => setOpcion(o.k)} className="tu-op">
                <span className="tu-marca" aria-hidden>✓</span>
                <span><b>{o.t}</b><small>{o.d}</small></span>
                <span className="lp-precio">{precioDe(o.k)}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-8 min-w-0">
          <legend className="mb-3 text-lg font-bold">2. Tus datos</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={etiqueta} htmlFor="nombre">Nombre{opcion === "puesta" && " o agencia"}</label>
              <input id="nombre" className={campo} maxLength={120} autoComplete="name" value={nombre} onChange={(e) => setNombre(e.target.value)} />
            </div>
            <div>
              <label className={etiqueta} htmlFor="vehiculo">Vehículo</label>
              <input id="vehiculo" className={campo} maxLength={120} placeholder="Marca, modelo y año" value={vehiculo} onChange={(e) => setVehiculo(e.target.value)} />
            </div>
            {opcion === "puesta" && (
              <div className="sm:col-span-2">
                <label className={etiqueta} htmlFor="unidades">¿Cuántas unidades? <span className="font-normal text-gray-500">(opcional)</span></label>
                <input id="unidades" className={campo} inputMode="numeric" maxLength={4} placeholder="1" value={unidades} onChange={(e) => setUnidades(e.target.value.replace(/\D/g, ""))} />
              </div>
            )}
          </div>
        </fieldset>

        <div className="mt-8 grid gap-3">
          <a href={completo ? mensaje : undefined} target="_blank" rel="noopener noreferrer" aria-disabled={!completo}
            className={`lp-btn ${completo ? "" : "pointer-events-none opacity-40"}`}>
            Solicitar turno por WhatsApp
          </a>
          <p className="text-sm text-gray-500">{completo ? "Se abre WhatsApp con tu pedido listo para enviar." : "Completá nombre y vehículo para continuar."}</p>
        </div>
      </section>
      <SitioPie />
    </main>
  );
}
