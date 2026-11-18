// Datos del auto que se piden antes de mandar cualquier mensaje: así el WhatsApp sale con todo cargado.
import { normalizarPatente } from "@/lib/turnos";

export type DatosAuto = { modelo: string; anio: string; patente: string };
export const AUTO_VACIO: DatosAuto = { modelo: "", anio: "", patente: "" };
export type ErroresAuto = Partial<Record<keyof DatosAuto, string>>;

// Marca y modelo, año y patente son obligatorios (también para agencias). Devuelve un aviso por cada dato que falta o está mal.
export function erroresAuto(d: DatosAuto): ErroresAuto {
  const e: ErroresAuto = {};
  if (!d.modelo.trim()) e.modelo = "Falta la marca y el modelo.";
  else if (d.modelo.trim().length < 2) e.modelo = "Escribí la marca y el modelo completos.";

  const anio = Number(d.anio);
  if (!d.anio.trim()) e.anio = "Falta el año.";
  else if (!/^\d{4}$/.test(d.anio.trim()) || anio < 1960 || anio > new Date().getFullYear() + 1) e.anio = "Revisá el año: 4 números, por ejemplo 2018.";

  if (!d.patente.trim()) e.patente = "Falta la patente.";
  else if (!/^[A-Z0-9]{5,8}$/.test(normalizarPatente(d.patente))) e.patente = "Revisá la patente, por ejemplo AB123CD.";
  return e;
}

// Renglones del mensaje de WhatsApp (los vacíos no se mandan).
export const filasAuto = (d: DatosAuto): [string, string | null][] => [
  ["Vehículo", d.modelo.trim() || null],
  ["Año", d.anio.trim() || null],
  ["Patente", d.patente.trim() ? normalizarPatente(d.patente) : null],
];

// "A, B y C" para el aviso de datos faltantes.
export const listar = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(", ")} y ${xs[xs.length - 1]}` : xs[0] ?? "");
