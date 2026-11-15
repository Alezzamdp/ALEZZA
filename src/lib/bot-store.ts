import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { access } from "node:fs/promises";
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { excedido } from "@/lib/limite";

// Datos del bot de Marketplace (extensión de Messenger): lo que sabe, cómo escribe Bruno,
// la clave con la que se conecta y su registro de actividad.
// Viven en archivos privados de esta PC (como el token de Mercado Libre), no en Supabase.
// ponytail: archivos locales; si el portal se publica en un servidor, pasarlo a una tabla con RLS.

const DIR = path.join(process.env.LOCALAPPDATA || os.homedir(), "ALEZZA", "bot");
const CONFIG = path.join(DIR, "config.json");
const ACTIVIDAD = path.join(DIR, "actividad.jsonl");

export type BotConfig = { negocio: string; estilo: string; claveHash: string | null; actualizado: string | null };
export type Actividad = { at: string; cliente: string; publicacion: string; mensaje: string; entendido?: string; respuesta: string };

const vacia: BotConfig = { negocio: "", estilo: "", claveHash: null, actualizado: null };
const hash = (clave: string) => createHash("sha256").update(clave).digest("hex");

export async function leerConfig(): Promise<BotConfig> {
  try {
    return { ...vacia, ...JSON.parse(await readFile(CONFIG, "utf8")) };
  } catch {
    return { ...vacia };
  }
}

async function escribirConfig(config: BotConfig) {
  await mkdir(DIR, { recursive: true });
  await writeFile(CONFIG, JSON.stringify(config, null, 2), { mode: 0o600 });
}

export async function guardarTextos(negocio: string, estilo: string) {
  const config = await leerConfig();
  await escribirConfig({ ...config, negocio: negocio.slice(0, 8000), estilo: estilo.slice(0, 8000), actualizado: new Date().toISOString() });
}

/** Clave nueva para la extensión: se muestra una sola vez; acá solo queda su hash. */
export async function nuevaClave() {
  const clave = "alz_" + randomBytes(24).toString("base64url");
  await escribirConfig({ ...(await leerConfig()), claveHash: hash(clave) });
  return clave;
}

/** La extensión manda la clave en X-Bot-Key. */
export async function esBot(request: Request) {
  if (excedido(request, "bot", 60)) return false; // frena prueba de claves
  const clave = request.headers.get("x-bot-key") ?? "";
  const { claveHash } = await leerConfig();
  if (!clave || !claveHash) return false;
  const a = Buffer.from(hash(clave), "hex");
  const b = Buffer.from(claveHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

const corto = (v: unknown, n: number) => String(v ?? "").slice(0, n);

export async function registrar(item: Partial<Actividad>) {
  await mkdir(DIR, { recursive: true });
  const fila: Actividad = {
    at: new Date().toISOString(),
    cliente: corto(item.cliente, 120),
    publicacion: corto(item.publicacion, 200),
    mensaje: corto(item.mensaje, 2000),
    entendido: corto(item.entendido, 500),
    respuesta: corto(item.respuesta, 4000),
  };
  await appendFile(ACTIVIDAD, JSON.stringify(fila) + "\n", { mode: 0o600 });
}

// ponytail: lee el archivo entero; rotarlo si pasa de unos pocos MB.
export async function ultimasActividades(limite = 200): Promise<Actividad[]> {
  try {
    const lineas = (await readFile(ACTIVIDAD, "utf8")).trim().split("\n").filter(Boolean);
    return lineas.slice(-limite).reverse().map((l) => JSON.parse(l) as Actividad);
  } catch {
    return [];
  }
}

// ---- Fichas de clientes de Marketplace ----
// Una por chat: lo que el bot entendió, la etapa, el próximo paso y un checklist que vos tildás.
const FICHAS = path.join(DIR, "fichas.json");

export const PENDIENTES = [
  "pedir DNI",
  "recibir fotos del auto",
  "tasar permuta",
  "recibir recibo de sueldo",
  "precalificar financiación",
  "coordinar visita",
  "cerrar operación",
] as const;

export type Ficha = {
  id: string;
  cliente: string;
  publicacion: string;
  etapa: string;
  pide: string;
  proximoPaso: string;
  permuta: string;
  financiacion: boolean;
  pendientes: string[];
  hechos: string[];
  fotos: string[];
  fotosInfo?: Record<string, { tipo: string; desc: string }>;
  actualizado: string;
};

async function leerFichas(): Promise<Record<string, Ficha>> {
  try {
    return JSON.parse(await readFile(FICHAS, "utf8"));
  } catch {
    return {};
  }
}

// ponytail: un solo archivo reescrito entero; alcanza para cientos de chats.
async function escribirFichas(fichas: Record<string, Ficha>) {
  await mkdir(DIR, { recursive: true });
  await writeFile(FICHAS, JSON.stringify(fichas), { mode: 0o600 });
}

export async function guardarFicha(item: Partial<Ficha> & { id?: unknown }) {
  const id = corto(item.id, 40);
  if (!/^\d+$/.test(id)) return;
  const fichas = await leerFichas();
  const previa = fichas[id];
  const lista = (v: unknown) => (Array.isArray(v) ? v.map((x) => corto(x, 60)).filter((x) => (PENDIENTES as readonly string[]).includes(x)) : []);
  fichas[id] = {
    id,
    cliente: corto(item.cliente, 120) || previa?.cliente || "",
    publicacion: corto(item.publicacion, 200) || previa?.publicacion || "",
    etapa: corto(item.etapa, 40) || previa?.etapa || "consulta",
    pide: corto(item.pide, 500),
    proximoPaso: corto(item.proximoPaso, 300),
    permuta: corto(item.permuta, 120) || previa?.permuta || "",
    financiacion: Boolean(item.financiacion) || Boolean(previa?.financiacion),
    // Se suman los pendientes nuevos; los que tildaste quedan tildados.
    pendientes: [...new Set([...(previa?.pendientes ?? []), ...lista(item.pendientes)])],
    hechos: previa?.hechos ?? [],
    fotos: previa?.fotos ?? [],
    fotosInfo: previa?.fotosInfo ?? {},
    actualizado: new Date().toISOString(),
  };
  await escribirFichas(fichas);
}

export async function listarFichas(): Promise<Ficha[]> {
  return Object.values(await leerFichas()).sort((a, b) => b.actualizado.localeCompare(a.actualizado));
}

export async function marcarHecho(id: string, pendiente: string, hecho: boolean) {
  const fichas = await leerFichas();
  const f = fichas[id];
  if (!f || !f.pendientes.includes(pendiente)) return false;
  f.hechos = hecho ? [...new Set([...f.hechos, pendiente])] : f.hechos.filter((x) => x !== pendiente);
  await escribirFichas(fichas);
  return true;
}

// ---- Fotos que manda el cliente por el chat (auto, DNI, recibo) ----
// Privadas: quedan en esta PC y solo se ven desde el portal con sesión de administrador.
const FOTOS = path.join(DIR, "fotos");
const TIPOS_FOTO: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
export const MAX_FOTO = 8 * 1024 * 1024;

// Según lo que vio la IA en la foto, se tilda solo el pendiente que corresponde.
const TILDA: Record<string, string> = { auto: "recibir fotos del auto", dni: "pedir DNI", recibo: "recibir recibo de sueldo" };

export async function guardarFoto(conv: string, mensaje: string, tipo: string, datos: Buffer, info?: { tipo: string; desc: string }) {
  const ext = TIPOS_FOTO[tipo];
  if (!/^\d{1,30}$/.test(conv) || !ext || datos.length === 0 || datos.length > MAX_FOTO) return null;
  const nombre = createHash("sha256").update(mensaje).digest("hex").slice(0, 24) + "." + ext;
  const dir = path.join(FOTOS, conv);
  const archivo = path.join(dir, nombre);
  if (await access(archivo).then(() => true, () => false)) return nombre; // ya estaba
  await mkdir(dir, { recursive: true });
  await writeFile(archivo, datos, { mode: 0o600 });

  const fichas = await leerFichas();
  const f = fichas[conv] ?? { id: conv, cliente: "", publicacion: "", etapa: "consulta", pide: "", proximoPaso: "", permuta: "", financiacion: false, pendientes: [], hechos: [], fotos: [], actualizado: "" };
  f.fotos = [...new Set([...(f.fotos ?? []), nombre])];
  if (info?.tipo) {
    f.fotosInfo = { ...(f.fotosInfo ?? {}), [nombre]: info };
    const tarea = TILDA[info.tipo];
    if (tarea) {
      f.pendientes = [...new Set([...f.pendientes, tarea])];
      f.hechos = [...new Set([...f.hechos, tarea])];
    }
  }
  f.actualizado = new Date().toISOString();
  fichas[conv] = f;
  await escribirFichas(fichas);
  return nombre;
}

export async function leerFoto(conv: string, nombre: string) {
  if (!/^\d{1,30}$/.test(conv) || !/^[a-f0-9]{24}\.(jpg|png|webp)$/.test(nombre)) return null;
  try {
    const datos = await readFile(path.join(FOTOS, conv, nombre));
    const tipo = Object.keys(TIPOS_FOTO).find((t) => nombre.endsWith(TIPOS_FOTO[t]))!;
    return { datos, tipo };
  } catch {
    return null;
  }
}
