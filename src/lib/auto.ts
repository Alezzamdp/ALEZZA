// Datos del auto que se piden antes de mandar cualquier mensaje: así el WhatsApp sale con todo cargado.
import { normalizarPatente } from "@/lib/turnos";

export type DatosAuto = { modelo: string; anio: string; patente: string };
export const AUTO_VACIO: DatosAuto = { modelo: "", anio: "", patente: "" };

// Marca y modelo, año y patente son obligatorios (también para agencias). Devuelve el texto del error, o "" si está bien.
export function errorAuto(d: DatosAuto): string {
  if (d.modelo.trim().length < 2) return "Escribí la marca y el modelo del auto.";
  const anio = Number(d.anio);
  if (!/^\d{4}$/.test(d.anio.trim()) || anio < 1960 || anio > new Date().getFullYear() + 1) return "Revisá el año: 4 números, por ejemplo 2018.";
  if (!/^[A-Z0-9]{5,8}$/.test(normalizarPatente(d.patente))) return "Revisá la patente, por ejemplo AB123CD o ABC123.";
  return "";
}

// Renglones del mensaje de WhatsApp (los vacíos no se mandan).
export const filasAuto = (d: DatosAuto): [string, string | null][] => [
  ["Vehículo", d.modelo.trim() || null],
  ["Año", d.anio.trim() || null],
  ["Patente", d.patente.trim() ? normalizarPatente(d.patente) : null],
];
