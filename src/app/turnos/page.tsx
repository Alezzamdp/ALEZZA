"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import CamposAuto from "@/components/CamposAuto";
import { SitioCabecera, SitioPie } from "@/components/SitioMarco";
import { AUTO_VACIO, errorAuto, filasAuto, type DatosAuto } from "@/lib/auto";
import { contacto } from "@/lib/contacto";
import { supabase } from "@/lib/supabase";
import { CONFIG_INICIAL, mensajeAlezza, pesos, waAlezza, type TurnosConfig } from "@/lib/turnos";

type Opcion = "puesta" | "lavado" | "otro";

const OPCIONES: { k: Opcion; t: string; d: string }[] = [
  { k: "puesta", t: "Plan Agencias · Preparación integral", d: "Para las unidades de una agencia: barniz, motor e interior." },
  { k: "lavado", t: "Preparación base", d: "Para particulares: lavado detallado, interior y listo para fotos." },
  { k: "otro", t: "Otro servicio", d: "Pulido, motor, interior o butacas: lo coordinamos por WhatsApp." },
];

// Solicitud de turno sin calendario: elegís qué necesitás, cargás tus datos y los del auto (modelo, año y patente) y se abre
// WhatsApp con todo armado. El día y la hora se coordinan por WhatsApp. Todos los datos son obligatorios (para agencias, los de una unidad).
export default function SolicitarTurno() {
  const [config, setConfig] = useState<TurnosConfig>(CONFIG_INICIAL);
  const [opcion, setOpcion] = useState<Opcion>("puesta");
  const [nombre, setNombre] = useState("");
  const [unidades, setUnidades] = useState("");
  const [auto, setAuto] = useState<DatosAuto>(AUTO_VACIO);
  const [error, setError] = useState("");
  const agencia = opcion === "puesta";

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

  function enviar() {
    const falla = nombre.trim().length < 2 ? (agencia ? "Escribí tu nombre o el de la agencia." : "Escribí tu nombre.")
      : agencia && !/^[1-9]\d{0,3}$/.test(unidades.trim()) ? "Escribí cuántas unidades son (un número)."
      : errorAuto(auto);
    if (falla) { setError(falla); return; }
    setError("");
    const url = waAlezza(mensajeAlezza("Quiero solicitar un turno en el taller.", [
      ["Servicio", elegida.t],
      ["Unidades", agencia ? unidades.trim() : null],
      [agencia ? "Agencia" : "Nombre", nombre.trim()],
      ...filasAuto(auto),
    ]));
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <main className="lp min-h-screen">
      <SitioCabecera accion={<Link href={contacto("turno")} className="lp-btn lp-btn-sm lp-btn-linea">¿Dudas?</Link>} />

      <section className="lp-form-pagina">
        <p className="lp-kicker">Taller ALEZZA DETAIL · Mar del Plata</p>
        <h1 className="lp-titular">Solicitar turno</h1>
        <p className="lp-lead">Contanos qué necesitás y cargá los datos del auto: te escribimos por WhatsApp para coordinar el día y la hora.</p>

        <form className="lp-form" onSubmit={(e) => { e.preventDefault(); enviar(); }} noValidate>
          <fieldset className="lp-fieldset">
            <legend>1. ¿Qué necesitás?</legend>
            <div className="lp-opciones">
              {OPCIONES.map((o) => (
                <button key={o.k} type="button" aria-pressed={opcion === o.k} onClick={() => { setOpcion(o.k); setError(""); }} className="tu-op">
                  <span className="tu-marca" aria-hidden>✓</span>
                  <span><b>{o.t}</b><small>{o.d}</small></span>
                  <span className="lp-precio">{precioDe(o.k)}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="lp-fieldset">
            <legend>2. Tus datos y los del auto</legend>
            <div className="lp-form-campos">
              <div className="lp-campo-caja lp-campo-ancho">
                <label htmlFor="turno-nombre">{agencia ? "Tu nombre o el de la agencia" : "Tu nombre"}</label>
                <input id="turno-nombre" className="lp-campo" required maxLength={120} autoComplete="name" value={nombre} onChange={(e) => setNombre(e.target.value)} />
              </div>
              {agencia && (
                <div className="lp-campo-caja lp-campo-ancho">
                  <label htmlFor="turno-unidades">¿Cuántas unidades?</label>
                  <input id="turno-unidades" className="lp-campo" required inputMode="numeric" maxLength={4} placeholder="1" value={unidades} onChange={(e) => setUnidades(e.target.value.replace(/\D/g, ""))} />
                </div>
              )}
              <CamposAuto valor={auto} onCambio={setAuto} />
            </div>
            {agencia && <p className="lp-form-nota">Cargá los datos de una unidad; el resto lo coordinamos por WhatsApp.</p>}
          </fieldset>

          {error && <p role="alert" className="lp-error">{error}</p>}
          <button type="submit" className="lp-btn lp-btn-grande">Solicitar turno por WhatsApp</button>
          <p className="lp-form-nota">Se abre WhatsApp con tu pedido y los datos del auto ya cargados; solo tenés que enviarlo.</p>
        </form>
      </section>
      <SitioPie />
    </main>
  );
}
