// BRUNO OS ↔ tabla public.bruno_items. Valida todo lo que entra (también copias restauradas).

export type BrunoItem = Record<string, unknown> & { id: string; tipo: string };

export type BrunoRow = {
  id: string;
  tipo: string;
  titulo: string;
  fecha: string | null;
  hora: string | null;
  area: string | null;
  estado: "pendiente" | "hecha";
  prioridad: boolean;
  hecho: string | null;
  creado: string;
  extra: Record<string, unknown>;
};

const PROPIAS = ["id", "tipo", "titulo", "fecha", "hora", "area", "estado", "prioridad", "hecho", "creado"];
const str = (v: unknown) => (typeof v === "string" ? v : "");
const fechaIso = (v: unknown) => {
  const s = str(v);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) ? s : null;
};
const instante = (v: unknown) => {
  const s = str(v);
  return s && !Number.isNaN(Date.parse(s)) ? new Date(s).toISOString() : null;
};
export const nuevoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export function aFila(item: Record<string, unknown>): BrunoRow {
  const extra: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(item)) if (!PROPIAS.includes(k) && k.length <= 40) extra[k] = v;
  const extraOk = JSON.stringify(extra).length <= 4000 ? extra : {};
  const id = str(item.id);
  const hora = str(item.hora);
  return {
    id: /^[a-z0-9]{6,40}$/.test(id) ? id : nuevoId(),
    tipo: /^[a-z]{1,20}$/.test(str(item.tipo)) ? str(item.tipo) : "nota",
    titulo: str(item.titulo).slice(0, 500),
    fecha: fechaIso(item.fecha),
    hora: /^([01]\d|2[0-3]):[0-5]\d$/.test(hora) ? hora : null,
    area: str(item.area).slice(0, 40) || null,
    estado: item.estado === "hecha" ? "hecha" : "pendiente",
    prioridad: item.prioridad === true,
    hecho: instante(item.hecho),
    creado: instante(item.creado) ?? new Date().toISOString(),
    extra: extraOk,
  };
}

export function deFila(r: BrunoRow): BrunoItem {
  return { ...r.extra, id: r.id, tipo: r.tipo, titulo: r.titulo, fecha: r.fecha, hora: r.hora,
    area: r.area, estado: r.estado, prioridad: r.prioridad, hecho: r.hecho, creado: r.creado };
}
