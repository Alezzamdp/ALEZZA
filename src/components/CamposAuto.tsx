"use client";

import type { DatosAuto, ErroresAuto } from "@/lib/auto";

// Modelo, año y patente del auto: los tres son obligatorios y van al WhatsApp. Cada campo muestra su aviso si falta o está mal.
// Estilos .lp-campo en globals.css.
export default function CamposAuto({ valor, onCambio, errores = {} }: { valor: DatosAuto; onCambio: (d: DatosAuto) => void; errores?: ErroresAuto }) {
  return (
    <>
      <div className="lp-campo-caja lp-campo-ancho">
        <label htmlFor="auto-modelo">Marca y modelo</label>
        <input id="auto-modelo" className="lp-campo" maxLength={80} placeholder="Ej.: Volkswagen Gol Trend" autoComplete="off"
          aria-invalid={!!errores.modelo} aria-describedby={errores.modelo ? "auto-modelo-error" : undefined}
          value={valor.modelo} onChange={(e) => onCambio({ ...valor, modelo: e.target.value })} />
        {errores.modelo && <p id="auto-modelo-error" className="lp-campo-error">{errores.modelo}</p>}
      </div>
      <div className="lp-campo-caja">
        <label htmlFor="auto-anio">Año</label>
        <input id="auto-anio" className="lp-campo" inputMode="numeric" maxLength={4} placeholder="2018" autoComplete="off"
          aria-invalid={!!errores.anio} aria-describedby={errores.anio ? "auto-anio-error" : undefined}
          value={valor.anio} onChange={(e) => onCambio({ ...valor, anio: e.target.value.replace(/\D/g, "") })} />
        {errores.anio && <p id="auto-anio-error" className="lp-campo-error">{errores.anio}</p>}
      </div>
      <div className="lp-campo-caja">
        <label htmlFor="auto-patente">Patente</label>
        <input id="auto-patente" className="lp-campo lp-campo-patente" maxLength={8} placeholder="AB123CD" autoComplete="off" autoCapitalize="characters"
          aria-invalid={!!errores.patente} aria-describedby={errores.patente ? "auto-patente-error" : undefined}
          value={valor.patente} onChange={(e) => onCambio({ ...valor, patente: e.target.value.toUpperCase().replace(/[^A-Z0-9 ]/g, "") })} />
        {errores.patente && <p id="auto-patente-error" className="lp-campo-error">{errores.patente}</p>}
      </div>
    </>
  );
}
