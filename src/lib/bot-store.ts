import { createHash, randomBytes } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { supabase } from "@/lib/supabase";
import { adminClient } from "@/lib/server-admin";

// Bot de Marketplace (extensión de Messenger) en Supabase (migración 202611160001):
// lo que sabe, cómo escribe Bruno, su clave, la actividad, las fichas de clientes y sus fotos.
// - Administrador: tablas bot_* con RLS (sesión del navegador → adminClient).
// - Extensión: sin sesión; solo funciones bot_* que verifican la clave del bot en la base.

export type Actividad = { at: string; cliente: string; publicacion: string; mensaje: string; entendido?: string; respuesta: string };
export type Ficha = {
  id: string; cliente: string; publicacion: string; etapa: string; pide: string; proximoPaso: string;
  permuta: string; financiacion: boolean; pendientes: string[]; hechos: string[]; fotos: string[];
  fotosInfo: Record<string, { tipo: string; desc: string }>; actualizado: string;
};

// Igual que private.bot_pendientes_validos en la migración.
export const PENDIENTES = [
  "pedir DNI", "recibir fotos del auto", "tasar permuta", "recibir recibo de sueldo",
  "precalificar financiación", "coordinar visita", "cerrar operación",
] as const;

export const MAX_FOTO = 5 * 1024 * 1024;
const TIPOS_FOTO: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const hash = (texto: string) => createHash("sha256").update(texto).digest("hex");
const corto = (v: unknown, n: number) => String(v ?? "").slice(0, n);

// ---------- Administrador ----------
export async function leerConfig(request: Request) {
  const { data, error } = await adminClient(request).from("bot_config").select("negocio, estilo, clave_hash, actualizado").eq("id", 1).maybeSingle();
  if (error) throw new Error(error.code === "42P01" || error.code === "PGRST205" ? "Falta ejecutar la migración 202611160001 en Supabase." : error.message);
  return { negocio: data?.negocio ?? "", estilo: data?.estilo ?? "", conClave: Boolean(data?.clave_hash), actualizado: data?.actualizado ?? null };
}

export async function guardarTextos(request: Request, negocio: string, estilo: string) {
  const { error } = await adminClient(request).from("bot_config")
    .update({ negocio: negocio.slice(0, 8000), estilo: estilo.slice(0, 8000), actualizado: new Date().toISOString() }).eq("id", 1);
  if (error) throw new Error(error.message);
}

/** Clave nueva para la extensión: se muestra una sola vez; en la base solo queda su hash. */
export async function nuevaClave(request: Request) {
  const clave = "alz_" + randomBytes(24).toString("base64url");
  const { error } = await adminClient(request).from("bot_config").update({ clave_hash: hash(clave) }).eq("id", 1);
  if (error) throw new Error(error.message);
  return clave;
}

export async function ultimasActividades(request: Request, limite = 200): Promise<Actividad[]> {
  const { data } = await adminClient(request).from("bot_actividad")
    .select("at, cliente, publicacion, mensaje, entendido, respuesta").order("at", { ascending: false }).limit(limite);
  return (data ?? []) as Actividad[];
}

export async function listarFichas(request: Request): Promise<Ficha[]> {
  const db = adminClient(request);
  const [{ data: fichas }, { data: fotos }] = await Promise.all([
    db.from("bot_fichas").select("*").order("actualizado", { ascending: false }).limit(300),
    db.from("bot_fotos").select("conv, nombre").order("creado"),
  ]);
  return (fichas ?? []).map((f) => ({
    id: f.id, cliente: f.cliente, publicacion: f.publicacion, etapa: f.etapa, pide: f.pide, proximoPaso: f.proximo_paso,
    permuta: f.permuta, financiacion: f.financiacion, pendientes: f.pendientes, hechos: f.hechos, fotosInfo: f.fotos_info ?? {},
    fotos: (fotos ?? []).filter((x) => x.conv === f.id).map((x) => x.nombre), actualizado: f.actualizado,
  }));
}

export async function marcarHecho(request: Request, id: string, pendiente: string, hecho: boolean) {
  const db = adminClient(request);
  const { data: f } = await db.from("bot_fichas").select("pendientes, hechos").eq("id", id).maybeSingle();
  if (!f || !f.pendientes.includes(pendiente)) return false;
  const hechos: string[] = hecho ? [...new Set([...f.hechos, pendiente])] : f.hechos.filter((x: string) => x !== pendiente);
  const { error } = await db.from("bot_fichas").update({ hechos }).eq("id", id);
  return !error;
}

export async function leerFoto(request: Request, conv: string, nombre: string) {
  if (!/^\d{1,30}$/.test(conv) || !/^[a-f0-9]{24}\.(jpg|png|webp)$/.test(nombre)) return null;
  const { data } = await adminClient(request).from("bot_fotos").select("tipo, datos").eq("conv", conv).eq("nombre", nombre).maybeSingle();
  if (!data) return null;
  // PostgREST devuelve bytea como "\x" + hexadecimal.
  return { tipo: data.tipo as string, datos: Buffer.from(String(data.datos).replace(/^\\x/, ""), "hex") };
}

// ---------- Extensión (clave del bot) ----------
const sinClave = (error: { code?: string } | null) => error?.code === "28000";

export async function botConfig(clave: string) {
  const { data, error } = await supabase.rpc("bot_leer_config", { p_clave: clave });
  if (error) return sinClave(error) ? null : Promise.reject(new Error(error.message));
  return data as { negocio: string; estilo: string };
}

export async function registrar(clave: string, item: Partial<Actividad>) {
  const { error } = await supabase.rpc("bot_registrar", { p_clave: clave, p: item });
  return !error;
}

export async function guardarFicha(clave: string, item: Record<string, unknown>) {
  const { error } = await supabase.rpc("bot_guardar_ficha", { p_clave: clave, p: item });
  return !error;
}

export async function guardarFoto(clave: string, conv: string, mensaje: string, tipo: string, datos: Buffer, info?: { tipo: string; desc: string }) {
  const ext = TIPOS_FOTO[tipo];
  if (!/^\d{1,30}$/.test(conv) || !ext || datos.length === 0 || datos.length > MAX_FOTO) return null;
  const nombre = hash(mensaje).slice(0, 24) + "." + ext;
  const { error } = await supabase.rpc("bot_guardar_foto", {
    p_clave: clave, p_conv: conv, p_nombre: nombre, p_tipo: tipo, p_datos: datos.toString("base64"), p_info: info ?? {},
  });
  return error ? null : nombre;
}

// ---------- Traer lo que había en archivos de esta PC (una sola vez) ----------
export async function importarDeEstaPC(request: Request) {
  const dir = path.join(process.env.LOCALAPPDATA || os.homedir(), "ALEZZA", "bot");
  const leer = (archivo: string) => readFile(path.join(dir, archivo), "utf8").catch(() => "");
  const db = adminClient(request);
  const resumen = { config: false, actividad: 0, fichas: 0, fotos: 0 };

  const config = JSON.parse((await leer("config.json")) || "{}");
  if (config.negocio || config.estilo || config.claveHash) {
    await db.from("bot_config").update({
      negocio: corto(config.negocio, 8000), estilo: corto(config.estilo, 8000),
      ...(config.claveHash ? { clave_hash: config.claveHash } : {}), actualizado: new Date().toISOString(),
    }).eq("id", 1);
    resumen.config = true;
  }

  const filas = (await leer("actividad.jsonl")).split("\n").filter(Boolean).map((l) => JSON.parse(l));
  if (filas.length) {
    const { error } = await db.from("bot_actividad").insert(filas.map((a) => ({
      at: a.at, cliente: corto(a.cliente, 120), publicacion: corto(a.publicacion, 200),
      mensaje: corto(a.mensaje, 2000), entendido: corto(a.entendido, 500), respuesta: corto(a.respuesta, 4000),
    })));
    if (!error) resumen.actividad = filas.length;
  }

  const fichas = Object.values(JSON.parse((await leer("fichas.json")) || "{}")) as Partial<Ficha>[];
  for (const f of fichas) {
    const { error } = await db.from("bot_fichas").upsert({
      id: f.id, cliente: corto(f.cliente, 120), publicacion: corto(f.publicacion, 200), etapa: corto(f.etapa, 40) || "consulta",
      pide: corto(f.pide, 500), proximo_paso: corto(f.proximoPaso, 300), permuta: corto(f.permuta, 120),
      financiacion: Boolean(f.financiacion), pendientes: f.pendientes ?? [], hechos: f.hechos ?? [], fotos_info: f.fotosInfo ?? {},
      actualizado: f.actualizado ?? new Date().toISOString(),
    });
    if (error) continue;
    resumen.fichas++;
    const carpeta = path.join(dir, "fotos", String(f.id));
    for (const nombre of await readdir(carpeta).catch(() => [] as string[])) {
      const ext = nombre.split(".").pop() ?? "";
      const tipo = Object.keys(TIPOS_FOTO).find((t) => TIPOS_FOTO[t] === ext);
      if (!tipo || !/^[a-f0-9]{24}\.(jpg|png|webp)$/.test(nombre)) continue;
      const datos = await readFile(path.join(carpeta, nombre));
      const { error: e } = await db.from("bot_fotos").upsert({ conv: f.id, nombre, tipo, datos: "\\x" + datos.toString("hex") });
      if (!e) resumen.fotos++;
    }
  }
  return resumen;
}
