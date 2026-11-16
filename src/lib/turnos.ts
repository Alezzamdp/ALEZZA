// Turnos y órdenes de taller: textos, estados y mensajes rápidos de WhatsApp.
// Tablas y funciones: supabase/migrations/202611150001_turnos_taller.sql

export const SERVICIOS = {
  // Las claves (lavado, puesta, agencia) son las de la base; solo cambia el nombre que se muestra.
  lavado: "Preparación base",
  puesta: "Preparación integral",
  agencia: "Agencias",
  otro: "Otro / a definir",
} as const;
export type Servicio = keyof typeof SERVICIOS;

// "Otro / a definir": el cliente elige uno o más de estos.
export const EXTRAS = {
  interiores: "Interiores",
  motor: "Motor",
  butacas: "Butacas",
  pulido2: "Pulido en 2 pasos (corrección y brillo)",
  pulido1: "Pulido en 1 paso (brillo)",
} as const;
export type Extra = keyof typeof EXTRAS;

export type TurnosConfig = {
  dias: number[]; // ISO: 1 lunes … 7 domingo
  cupo: number;
  sena: number; // seña fija de respaldo, para lo que está a cotizar
  porcentaje_sena: number;
  precios: Partial<Record<Servicio | Extra, number>>; // 0 o vacío = a cotizar
  anticipacion: number;
  horizonte: number;
  alias: string;
  cbu: string;
  titular: string;
};

export const CONFIG_INICIAL: TurnosConfig = {
  dias: [1, 2, 3, 4, 5], cupo: 2, sena: 30000, porcentaje_sena: 50,
  precios: { lavado: 60000, puesta: 250000 }, anticipacion: 1, horizonte: 45, alias: "", cbu: "", titular: "",
};

// Misma cuenta que private.precio_turno y pedir_turno en la base (la base es la que manda).
export function calcularPrecio(c: TurnosConfig, servicio: Servicio, extras: Extra[]): number | null {
  const claves: (Servicio | Extra)[] = servicio === "otro" ? extras : [servicio];
  if (!claves.length || claves.some((k) => !(Number(c.precios[k]) > 0))) return null;
  return claves.reduce((s, k) => s + Number(c.precios[k]), 0);
}
export function calcularSena(c: TurnosConfig, precio: number | null) {
  return precio === null ? c.sena : Math.round((precio * c.porcentaje_sena) / 100);
}

// Planes de estética que se muestran en el Inicio y en /servicios. El precio sale de la configuración
// (el mismo que cobra pedir_turno); sin precio cargado se muestra "A convenir".
export const PLANES: { k: Exclude<Servicio, "otro">; para: string; d: string; items: string[] }[] = [
  { k: "lavado", para: "Particulares y vendedores", d: "Lavado detallado y técnico.",
    items: ["Lavado exterior detallado", "Interior, tablero y plásticos", "Lista para fotos de publicación"] },
  { k: "puesta", para: "La unidad lista para vender", d: "Barniz, motor e interior.",
    items: ["Abrillantado de barniz", "Acondicionado de vano motor", "Saneamiento de habitáculo"] },
  { k: "agencia", para: "Agencias y flotas", d: "Preparación de stock por volumen.",
    items: ["Tarifa por volumen", "Turnos por lote, con prioridad", "Mismo estándar en todo el stock"] },
];
export const precioPlan = (c: TurnosConfig, k: Servicio) =>
  Number(c.precios[k]) > 0 ? pesos(Number(c.precios[k])) : "A convenir";

export type Avance = {
  numero: number; estado: EstadoOrden; updated_at: string; vehiculo: string | null; patente: string | null;
  nombre: string; trabajos: { t: string; hecho: boolean }[];
  notas?: { en: string; texto: string }[]; // notas que el taller comparte con el cliente
};

export type Turno = {
  id: string;
  token: string;
  creado: string;
  fecha: string;
  servicio: Servicio;
  extras: Extra[];
  precio: number | null;
  nombre: string;
  whatsapp: string;
  patente: string;
  vehiculo: string;
  direccion: string | null;
  notas: string | null;
  sena: number;
  estado: "solicitado" | "confirmado" | "realizado" | "cancelado";
  pago_estado: "pendiente" | "informado" | "confirmado" | "rechazado";
  pago_metodo: "transferencia" | "mercadopago" | null;
  comprobante: string | null;
  visto: boolean;
};

export const PAGO_TEXTO: Record<Turno["pago_estado"], string> = {
  pendiente: "Seña pendiente",
  informado: "Pago informado · a verificar",
  confirmado: "Seña confirmada",
  rechazado: "Pago rechazado",
};

export const ESTADOS_ORDEN = {
  presupuesto: "Presupuesto",
  aprobado: "Aprobado",
  en_trabajo: "En trabajo",
  listo: "Listo para retirar",
  entregado: "Entregado",
  cancelado: "Cancelado",
} as const;
export type EstadoOrden = keyof typeof ESTADOS_ORDEN;

export type Trabajo = { t: string; precio: number | null; hecho: boolean };
export type Evento = { en: string; tipo: "estado" | "mensaje" | "nota"; texto: string };

export type Orden = {
  id: string;
  numero: number;
  token: string;
  publicar: boolean;
  titulo_publico: string | null;
  creado: string;
  updated_at: string;
  turno_id: string | null;
  estado: EstadoOrden;
  cliente_nombre: string;
  cliente_whatsapp: string | null;
  cliente_email: string | null;
  direccion: string | null;
  patente: string | null;
  marca: string | null;
  modelo: string | null;
  anio: number | null;
  km: number | null;
  color: string | null;
  trabajos: Trabajo[];
  notas: string | null;
  fotos_antes: string[];
  fotos_despues: string[];
  historial: Evento[];
};

export const pesos = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

export const normalizarPatente = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");

export const fechaLarga = (iso: string) =>
  new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })
    .format(new Date(iso + "T00:00:00Z"));

export const totalTrabajos = (ts: Trabajo[]) => ts.reduce((s, t) => s + (t.precio ?? 0), 0);

type DatosMensaje = { nombre: string; vehiculo: string; patente: string; total?: string; trabajos?: string; fecha?: string; enlace?: string };

export const servicioTexto = (servicio: Servicio, extras: Extra[] = []) =>
  servicio === "otro" && extras.length ? extras.map((e) => EXTRAS[e]).join(", ") : SERVICIOS[servicio];

// Mensajes que el cliente nos manda (wa.me de ALEZZA): ya salen con lo que necesitamos saber.
export const WA_ALEZZA = "542234212621";
export const waAlezza = (texto: string) => "https://wa.me/" + WA_ALEZZA + "?text=" + encodeURIComponent(texto);

// Mensajes rápidos al cliente: saludo, el dato importante en negrita (*así* en WhatsApp),
// los datos en renglones y la firma. Un renglón con un {campo} vacío no se manda.
const FIRMA = "ALEZZA · Estética técnica automotriz";
const msj = (...renglones: string[]) => [...renglones, "", FIRMA].join("\n");

// Taller ALEZZA DETAIL (Mar del Plata).
export const TALLER = {
  lat: -38.0581289,
  lng: -57.5981737,
  maps: "https://www.google.com/maps/place/ALEZZA+DETAIL/@-38.0578581,-57.5983338,144m/data=!3m1!1e3!4m6!3m5!1s0x9584df0051c1e4ff:0x4421b9b16f425b5f!8m2!3d-38.0581289!4d-57.5981737!16s%2Fg%2F11xdw603st",
  comoLlegar: "https://www.google.com/maps/dir/?api=1&destination=-38.0581289,-57.5981737",
};

export const PLANTILLAS = {
  turno_confirmado: { t: "Turno confirmado", m: msj(
    "Hola {nombre}, ¿cómo estás?", "",
    "Tu turno en ALEZZA quedó *confirmado*.", "",
    "• Día: {fecha}", "• Vehículo: {vehiculo}", "• Patente: {patente}", "",
    "Cualquier cambio, avisanos por acá. ¡Te esperamos!") },
  pago_recibido: { t: "Pago recibido", m: msj(
    "Hola {nombre}, ¿cómo estás?", "",
    "Recibimos la *seña* de tu turno del {fecha}. ¡Gracias!", "",
    "Seguí el estado de tu turno acá: {enlace}") },
  pago_rechazado: { t: "Pago no recibido", m: msj(
    "Hola {nombre}, ¿cómo estás?", "",
    "No pudimos verificar el pago de la seña de tu turno del {fecha}.", "",
    "¿Nos reenviás el comprobante? Podés subirlo acá: {enlace}") },
  recibido: { t: "Auto recibido", m: msj(
    "Hola {nombre}, ¿cómo estás?", "",
    "Ya tenemos tu *{vehiculo}* ({patente}) en el taller.", "",
    "Podés seguir el avance en vivo acá: {enlace}") },
  presupuesto: { t: "Presupuesto", m: msj(
    "Hola {nombre}, ¿cómo estás?", "",
    "Te paso el presupuesto para tu *{vehiculo}* ({patente}):", "",
    "{lista}", "",
    "*Total: {total}*", "",
    "¿Avanzamos? Respondé este mensaje y coordinamos.") },
  en_trabajo: { t: "En trabajo", m: msj(
    "Hola {nombre}, ¿cómo estás?", "",
    "Ya estamos *trabajando* en tu {vehiculo}.", "",
    "Mirá cómo avanza acá: {enlace}") },
  demora: { t: "Todavía no está", m: msj(
    "Hola {nombre}, ¿cómo estás?", "",
    "Tu {vehiculo} todavía no está terminado: necesitamos un poco más de tiempo para dejarlo impecable.", "",
    "Te aviso apenas esté.", "Mientras tanto, seguí el avance acá: {enlace}") },
  listo: { t: "Listo para retirar", m: msj(
    "Hola {nombre}, ¿cómo estás?", "",
    "¡Tu *{vehiculo}* ({patente}) está *listo para retirar*!", "",
    "Te esperamos en el taller. Cómo llegar: {mapa}") },
} as const;
export type Plantilla = keyof typeof PLANTILLAS;

export function armarMensaje(clave: Plantilla, d: DatosMensaje) {
  const valores: Record<string, string | undefined> = {
    ...d, nombre: d.nombre.split(" ")[0], mapa: TALLER.comoLlegar,
    lista: d.trabajos ? d.trabajos.split(", ").filter(Boolean).map((t) => "• " + t.charAt(0).toUpperCase() + t.slice(1)).join("\n") : "",
  };
  return PLANTILLAS[clave].m.split("\n")
    .filter((l) => [...l.matchAll(/\{(\w+)\}/g)].every((m) => valores[m[1]]))
    .join("\n")
    .replace(/\{(\w+)\}/g, (_, k: string) => valores[k] || "")
    .replace(/\n{3,}/g, "\n\n");
}

// Mensaje del cliente hacia ALEZZA, ordenado: qué quiere, los datos en renglones y el enlace.
export function mensajeAlezza(pedido: string, datos: [string, string | null | undefined][] = [], enlace?: string) {
  const filas = datos.filter(([, v]) => v).map(([k, v]) => "• " + k + ": " + v);
  return ["Hola ALEZZA, ¿cómo están?", "", pedido, ...(filas.length ? ["", ...filas] : []), ...(enlace ? ["", enlace] : [])].join("\n");
}

// El mensaje que conviene mandar cuando la orden cambia a ese estado.
export const MENSAJE_DE_ESTADO: Partial<Record<EstadoOrden, Plantilla>> = {
  presupuesto: "presupuesto",
  en_trabajo: "en_trabajo",
  listo: "listo",
};
