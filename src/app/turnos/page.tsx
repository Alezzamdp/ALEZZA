"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import CamposAuto from "@/components/CamposAuto";
import { SitioCabecera, SitioPie } from "@/components/SitioMarco";
import { AUTO_VACIO, erroresAuto, filasAuto, listar, type DatosAuto } from "@/lib/auto";
import { contacto } from "@/lib/contacto";
import { supabase } from "@/lib/supabase";
import { CONFIG_INICIAL, mensajeAlezza, pesos, waAlezza, type TurnosConfig } from "@/lib/turnos";

type Opcion = "puesta" | "lavado" | "otro";
type Campo = "nombre" | "unidades" | "modelo" | "anio" | "patente";
type Errores = Partial<Record<Campo, string>>;
const ORDEN: Campo[] = ["nombre", "unidades", "modelo", "anio", "patente"];
const IDS: Record<Campo, string> = { nombre: "turno-nombre", unidades: "turno-unidades", modelo: "auto-modelo", anio: "auto-anio", patente: "auto-patente" };

const OPCIONES: { k: Opcion; t: string; d: string }[] = [
  { k: "puesta", t: "Plan Agencias · Preparación integral", d: "Para las unidades de una agencia: barniz, motor e interior." },
  { k: "lavado", t: "Preparación base", d: "Para particulares: lavado detallado, interior y listo para fotos." },
  { k: "otro", t: "Otro servicio", d: "Pulido, motor, interior o butacas: lo coordinamos por WhatsApp." },
];

// Solicitud de turno sin calendario: elegís qué necesitás, cargás tus datos y los del auto (modelo, año y patente) y te llevamos
// a WhatsApp con el mensaje armado. El día y la hora se coordinan por WhatsApp. Todos los datos son obligatorios (para agencias,
// los de una unidad); si falta alguno se avisa cuáles.
export default function SolicitarTurno() {
  const [config, setConfig] = useState<TurnosConfig>(CONFIG_INICIAL);
  const [opcion, setOpcion] = useState<Opcion>("puesta");
  const [nombre, setNombre] = useState("");
  const [unidades, setUnidades] = useState("");
  const [auto, setAuto] = useState<DatosAuto>(AUTO_VACIO);
  const [errores, setErrores] = useState<Errores>({});
  const [destino, setDestino] = useState("");
  const agencia = opcion === "puesta";
  const etiquetas: Record<Campo, string> = { nombre: agencia ? "Nombre o agencia" : "Tu nombre", unidades: "Unidades", modelo: "Marca y modelo", anio: "Año", patente: "Patente" };
  const faltan = ORDEN.filter((k) => errores[k]);

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

  function limpiar(...campos: Campo[]) {
    setErrores((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => !campos.includes(k as Campo))) as Errores);
  }
  function cambiarAuto(d: DatosAuto) {
    const tocados: Campo[] = [];
    if (d.modelo !== auto.modelo) tocados.push("modelo");
    if (d.anio !== auto.anio) tocados.push("anio");
    if (d.patente !== auto.patente) tocados.push("patente");
    setAuto(d);
    limpiar(...tocados);
  }

  function enviar() {
    const e: Errores = {};
    if (nombre.trim().length < 2) e.nombre = agencia ? "Falta tu nombre o el de la agencia." : "Falta tu nombre.";
    if (agencia && !/^[1-9]\d{0,3}$/.test(unidades.trim())) e.unidades = "Falta cuántas unidades son (un número).";
    Object.assign(e, erroresAuto(auto));
    const primero = ORDEN.find((k) => e[k]);
    if (primero) {
      setErrores(e);
      setDestino("");
      document.getElementById(IDS[primero])?.focus();
      return;
    }
    setErrores({});
    const url = waAlezza(mensajeAlezza("Quiero solicitar un turno en el taller.", [
      ["Servicio", elegida.t],
      ["Unidades", agencia ? unidades.trim() : null],
      [agencia ? "Agencia" : "Nombre", nombre.trim()],
      ...filasAuto(auto),
    ]));
    setDestino(url);
    window.location.assign(url);
  }

  return (
    <main className="lp min-h-screen">
      <SitioCabecera accion={<Link href={contacto("turno")} className="lp-btn lp-btn-sm lp-btn-linea">¿Dudas?</Link>} />

      <section className="lp-form-pagina">
        <p className="lp-kicker">Taller ALEZZA DETAIL · Mar del Plata</p>
        <h1 className="lp-titular">Solicitar turno</h1>
        <p className="lp-lead">Contanos qué necesitás y cargá los datos del auto: te llevamos a WhatsApp con el mensaje armado para coordinar el día y la hora.</p>

        <form className="lp-form" onSubmit={(e) => { e.preventDefault(); enviar(); }} noValidate>
          <fieldset className="lp-fieldset">
            <legend>1. ¿Qué necesitás?</legend>
            <div className="lp-opciones">
              {OPCIONES.map((o) => (
                <button key={o.k} type="button" aria-pressed={opcion === o.k} onClick={() => { setOpcion(o.k); setErrores({}); setDestino(""); }} className="tu-op">
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
                <label htmlFor={IDS.nombre}>{agencia ? "Tu nombre o el de la agencia" : "Tu nombre"}</label>
                <input id={IDS.nombre} className="lp-campo" maxLength={120} autoComplete="name" aria-invalid={!!errores.nombre} aria-describedby={errores.nombre ? "turno-nombre-error" : undefined}
                  value={nombre} onChange={(e) => { setNombre(e.target.value); limpiar("nombre"); }} />
                {errores.nombre && <p id="turno-nombre-error" className="lp-campo-error">{errores.nombre}</p>}
              </div>
              {agencia && (
                <div className="lp-campo-caja lp-campo-ancho">
                  <label htmlFor={IDS.unidades}>¿Cuántas unidades?</label>
                  <input id={IDS.unidades} className="lp-campo" inputMode="numeric" maxLength={4} placeholder="1" aria-invalid={!!errores.unidades} aria-describedby={errores.unidades ? "turno-unidades-error" : undefined}
                    value={unidades} onChange={(e) => { setUnidades(e.target.value.replace(/\D/g, "")); limpiar("unidades"); }} />
                  {errores.unidades && <p id="turno-unidades-error" className="lp-campo-error">{errores.unidades}</p>}
                </div>
              )}
              <CamposAuto valor={auto} onCambio={cambiarAuto} errores={errores} />
            </div>
            {agencia && <p className="lp-form-nota">Cargá los datos de una unidad; el resto lo coordinamos por WhatsApp.</p>}
          </fieldset>

          {faltan.length > 0 && <p role="alert" className="lp-error">Faltan datos para continuar: {listar(faltan.map((k) => etiquetas[k]))}.</p>}
          <button type="submit" className="lp-btn lp-btn-grande">Solicitar turno por WhatsApp</button>
          {destino
            ? <p className="lp-form-nota" role="status">Te llevamos a WhatsApp con el mensaje ya armado. Si no se abre, <a href={destino} className="lp-enlace">tocá acá</a>.</p>
            : <p className="lp-form-nota">Al enviar te llevamos a WhatsApp con tu pedido y los datos del auto ya cargados; solo tenés que enviarlo.</p>}
        </form>
      </section>
      <SitioPie />
    </main>
  );
}
