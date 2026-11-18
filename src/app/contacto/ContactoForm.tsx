"use client";

import { useState } from "react";
import CamposAuto from "@/components/CamposAuto";
import { AUTO_VACIO, erroresAuto, filasAuto, listar, type DatosAuto } from "@/lib/auto";
import { INSTAGRAM, TEMAS, waMensaje, type Tema } from "@/lib/contacto";

// Por ahora el sitio es solo ALEZZA DETAIL: se ofrecen los temas del taller y de las agencias.
const ELEGIBLES: Tema[] = ["estetica", "agencia", "turno", "consulta"];

type Campo = "nombre" | "unidades" | "modelo" | "anio" | "patente";
type Errores = Partial<Record<Campo, string>>;
const ORDEN: Campo[] = ["nombre", "unidades", "modelo", "anio", "patente"];
const IDS: Record<Campo, string> = { nombre: "contacto-nombre", unidades: "contacto-unidades", modelo: "auto-modelo", anio: "auto-anio", patente: "auto-patente" };

// Contacto: todos los datos son obligatorios. Si falta alguno, se avisa cuáles (arriba y en cada campo); si está todo, se lleva
// directo a WhatsApp con el mensaje armado (nombre, auto, año y patente). Para agencias se pide además el nombre de la agencia
// y las unidades por mes.
export default function ContactoForm({ temaInicial, refInicial }: { temaInicial: Tema; refInicial?: string }) {
  const [tema, setTema] = useState<Tema>(temaInicial);
  const [nombre, setNombre] = useState("");
  const [unidades, setUnidades] = useState("");
  const [auto, setAuto] = useState<DatosAuto>(AUTO_VACIO);
  const [errores, setErrores] = useState<Errores>({});
  const [destino, setDestino] = useState("");
  const agencia = tema === "agencia";
  const etiquetas: Record<Campo, string> = { nombre: agencia ? "Nombre de la agencia" : "Tu nombre", unidades: "Unidades por mes", modelo: "Marca y modelo", anio: "Año", patente: "Patente" };
  const faltan = ORDEN.filter((k) => errores[k]);

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
    if (nombre.trim().length < 2) e.nombre = agencia ? "Falta el nombre de la agencia." : "Falta tu nombre.";
    if (agencia && !/^[1-9]\d{0,3}$/.test(unidades.trim())) e.unidades = "Falta cuántas unidades por mes (un número).";
    Object.assign(e, erroresAuto(auto));
    const primero = ORDEN.find((k) => e[k]);
    if (primero) {
      setErrores(e);
      setDestino("");
      document.getElementById(IDS[primero])?.focus();
      return;
    }
    setErrores({});
    const filas: [string, string | null][] = [
      [agencia ? "Agencia" : "Nombre", nombre.trim()],
      ...(agencia ? ([["Unidades por mes", unidades.trim()]] as [string, string | null][]) : []),
      ...filasAuto(auto),
    ];
    const url = waMensaje(tema, filas, refInicial);
    setDestino(url);
    window.location.assign(url);
  }

  return (
    <div className="lp-contacto-grid">
      <form className="lp-form" onSubmit={(e) => { e.preventDefault(); enviar(); }} noValidate>
        <div className="lp-temas" role="group" aria-label="Tema de la consulta">
          {ELEGIBLES.map((k) => (
            <button key={k} type="button" aria-pressed={k === tema} className="lp-tema" onClick={() => { setTema(k); setErrores({}); setDestino(""); }}>{TEMAS[k].t}</button>
          ))}
        </div>

        {refInicial && <p className="lp-form-ref">Sobre: {refInicial}</p>}

        <div className="lp-form-campos">
          <div className="lp-campo-caja lp-campo-ancho">
            <label htmlFor={IDS.nombre}>{etiquetas.nombre}</label>
            <input id={IDS.nombre} className="lp-campo" maxLength={120} autoComplete="name" aria-invalid={!!errores.nombre} aria-describedby={errores.nombre ? "contacto-nombre-error" : undefined}
              value={nombre} onChange={(e) => { setNombre(e.target.value); limpiar("nombre"); }} />
            {errores.nombre && <p id="contacto-nombre-error" className="lp-campo-error">{errores.nombre}</p>}
          </div>
          {agencia && (
            <div className="lp-campo-caja lp-campo-ancho">
              <label htmlFor={IDS.unidades}>Unidades por mes (aproximado)</label>
              <input id={IDS.unidades} className="lp-campo" inputMode="numeric" maxLength={4} placeholder="Ej.: 10" aria-invalid={!!errores.unidades} aria-describedby={errores.unidades ? "contacto-unidades-error" : undefined}
                value={unidades} onChange={(e) => { setUnidades(e.target.value.replace(/\D/g, "")); limpiar("unidades"); }} />
              {errores.unidades && <p id="contacto-unidades-error" className="lp-campo-error">{errores.unidades}</p>}
            </div>
          )}
          <p className="lp-form-sub lp-campo-ancho">{agencia ? "Datos de una unidad de ejemplo:" : "Datos del auto:"}</p>
          <CamposAuto valor={auto} onCambio={cambiarAuto} errores={errores} />
        </div>

        {faltan.length > 0 && <p role="alert" className="lp-error">Faltan datos para continuar: {listar(faltan.map((k) => etiquetas[k]))}.</p>}
        <button type="submit" className="lp-btn lp-btn-grande">Escribir por WhatsApp</button>
        {destino
          ? <p className="lp-form-nota" role="status">Te llevamos a WhatsApp con el mensaje ya armado. Si no se abre, <a href={destino} className="lp-enlace">tocá acá</a>.</p>
          : <p className="lp-form-nota">Al enviar te llevamos a WhatsApp con tus datos y el mensaje ya armado; solo tenés que enviarlo.</p>}
      </form>

      <a href={INSTAGRAM} target="_blank" rel="noopener noreferrer" className="lp-canal">
        <span className="lp-num">Instagram</span>
        <strong>@alezzamdp</strong>
        <span>Trabajos del taller, unidades y novedades.</span>
        <span className="lp-ir">Abrir Instagram <span aria-hidden>→</span></span>
      </a>
    </div>
  );
}
