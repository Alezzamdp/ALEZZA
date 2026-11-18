"use client";

import type { DatosAuto } from "@/lib/auto";

// Modelo, año y patente del auto: los tres son obligatorios y van al WhatsApp. Estilos .lp-campo en globals.css.
export default function CamposAuto({ valor, onCambio }: { valor: DatosAuto; onCambio: (d: DatosAuto) => void }) {
  return (
    <>
      <div className="lp-campo-caja lp-campo-ancho">
        <label htmlFor="auto-modelo">Marca y modelo</label>
        <input id="auto-modelo" className="lp-campo" maxLength={80} placeholder="Ej.: Volkswagen Gol Trend" autoComplete="off" required
          value={valor.modelo} onChange={(e) => onCambio({ ...valor, modelo: e.target.value })} />
      </div>
      <div className="lp-campo-caja">
        <label htmlFor="auto-anio">Año</label>
        <input id="auto-anio" className="lp-campo" inputMode="numeric" maxLength={4} placeholder="2018" autoComplete="off" required
          value={valor.anio} onChange={(e) => onCambio({ ...valor, anio: e.target.value.replace(/\D/g, "") })} />
      </div>
      <div className="lp-campo-caja">
        <label htmlFor="auto-patente">Patente</label>
        <input id="auto-patente" className="lp-campo lp-campo-patente" maxLength={8} placeholder="AB123CD" autoComplete="off" autoCapitalize="characters" required
          value={valor.patente} onChange={(e) => onCambio({ ...valor, patente: e.target.value.toUpperCase().replace(/[^A-Z0-9 ]/g, "") })} />
      </div>
    </>
  );
}
