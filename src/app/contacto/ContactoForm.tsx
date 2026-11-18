"use client";

import { useState } from "react";
import CamposAuto from "@/components/CamposAuto";
import { AUTO_VACIO, errorAuto, filasAuto, type DatosAuto } from "@/lib/auto";
import { INSTAGRAM, TEMAS, waMensaje, type Tema } from "@/lib/contacto";

// Por ahora el sitio es solo ALEZZA DETAIL: se ofrecen los temas del taller y de las agencias.
const ELEGIBLES: Tema[] = ["estetica", "agencia", "turno", "consulta"];

// Contacto: antes de abrir WhatsApp se cargan los datos del auto (modelo, año y patente) y el mensaje sale armado con ellos.
// Todos los datos son obligatorios. Para agencias se pide además nombre de la agencia, unidades por mes y los datos de una unidad.
export default function ContactoForm({ temaInicial, refInicial }: { temaInicial: Tema; refInicial?: string }) {
  const [tema, setTema] = useState<Tema>(temaInicial);
  const [nombre, setNombre] = useState("");
  const [unidades, setUnidades] = useState("");
  const [auto, setAuto] = useState<DatosAuto>(AUTO_VACIO);
  const [error, setError] = useState("");
  const agencia = tema === "agencia";

  function enviar() {
    const falla = nombre.trim().length < 2 ? (agencia ? "Escribí el nombre de la agencia." : "Escribí tu nombre.")
      : agencia && !/^[1-9]\d{0,3}$/.test(unidades.trim()) ? "Escribí cuántas unidades por mes (un número)."
      : errorAuto(auto);
    if (falla) { setError(falla); return; }
    setError("");
    const filas: [string, string | null][] = [
      [agencia ? "Agencia" : "Nombre", nombre.trim()],
      ...(agencia ? ([["Unidades por mes", unidades.trim()]] as [string, string | null][]) : []),
      ...filasAuto(auto),
    ];
    window.open(waMensaje(tema, filas, refInicial), "_blank", "noopener,noreferrer");
  }

  return (
    <div className="lp-contacto-grid">
      <form className="lp-form" onSubmit={(e) => { e.preventDefault(); enviar(); }} noValidate>
        <div className="lp-temas" role="group" aria-label="Tema de la consulta">
          {ELEGIBLES.map((k) => (
            <button key={k} type="button" aria-pressed={k === tema} className="lp-tema" onClick={() => { setTema(k); setError(""); }}>{TEMAS[k].t}</button>
          ))}
        </div>

        {refInicial && <p className="lp-form-ref">Sobre: {refInicial}</p>}

        <div className="lp-form-campos">
          <div className="lp-campo-caja lp-campo-ancho">
            <label htmlFor="contacto-nombre">{agencia ? "Nombre de la agencia" : "Tu nombre"}</label>
            <input id="contacto-nombre" className="lp-campo" required maxLength={120} autoComplete="name" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </div>
          {agencia && (
            <div className="lp-campo-caja lp-campo-ancho">
              <label htmlFor="contacto-unidades">Unidades por mes (aproximado)</label>
              <input id="contacto-unidades" className="lp-campo" required inputMode="numeric" maxLength={4} placeholder="Ej.: 10" value={unidades} onChange={(e) => setUnidades(e.target.value.replace(/\D/g, ""))} />
            </div>
          )}
          <p className="lp-form-sub lp-campo-ancho">{agencia ? "Datos de una unidad de ejemplo:" : "Datos del auto:"}</p>
          <CamposAuto valor={auto} onCambio={setAuto} />
        </div>

        {error && <p role="alert" className="lp-error">{error}</p>}
        <button type="submit" className="lp-btn lp-btn-grande">Escribir por WhatsApp</button>
        <p className="lp-form-nota">Se abre WhatsApp con tus datos ya cargados; solo tenés que enviarlo.</p>
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
