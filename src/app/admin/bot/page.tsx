"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import AdminGate, { ui } from "@/components/AdminGate";
import { supabase } from "@/lib/supabase";

// Portal del bot de Marketplace: clientes (fichas de Marketplace + oportunidades de la web con su
// checklist), lo que fue respondiendo, y qué sabe / cómo escribe Bruno / la clave de la extensión.
type Actividad = { at: string; cliente: string; publicacion: string; mensaje: string; entendido?: string; respuesta: string };
type Ficha = {
  id: string; cliente: string; publicacion: string; etapa: string; pide: string; proximoPaso: string;
  permuta: string; financiacion: boolean; pendientes: string[]; hechos: string[]; fotos?: string[]; fotosInfo?: Record<string, { tipo: string; desc: string }>; actualizado: string;
};
type Oportunidad = {
  id: string; customer_name: string | null; phone: string | null; status: string; created_at: string;
  next_followup_date: string | null; next_followup_note: string | null;
  trade_vehicle: { brand?: string; model?: string; year?: number } | null;
};
type Pestana = "clientes" | "actividad" | "config";

async function api(ruta: string, init?: RequestInit) {
  const { data } = await supabase.auth.getSession();
  const res = await fetch(ruta, { ...init, headers: { Authorization: `Bearer ${data.session?.access_token ?? ""}`, "Content-Type": "application/json" }, cache: "no-store" });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? `HTTP ${res.status}`);
  return res.json();
}

const hora = (iso: string) => new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Argentina/Buenos_Aires" }).format(new Date(iso));
const ESTADO_WEB: Record<string, string> = { new: "nueva", contacted: "contactado", negotiation: "negociando", completed: "cerrada", discarded: "descartada" };

export default function BotPage() {
  return <AdminGate titulo="Bot de Marketplace" frase="Despertando al bot…">{() => <Bot />}</AdminGate>;
}

function Bot() {
  const [pestana, setPestana] = useState<Pestana>("clientes");
  const tab = (p: Pestana, t: string) => (
    <button onClick={() => setPestana(p)} className={`border-b-2 px-1 pb-2 text-sm font-semibold ${pestana === p ? "border-[var(--mostaza)]" : "border-transparent text-[var(--n500)]"}`}>{t}</button>
  );
  return (
    <div className="grid gap-5">
      <nav className="flex gap-6 border-b border-[var(--n200)]">{tab("clientes", "Clientes")}{tab("actividad", "Actividad")}{tab("config", "Configuración")}</nav>
      {pestana === "clientes" && <Clientes />}
      {pestana === "actividad" && <ActividadLista />}
      {pestana === "config" && <Config />}
    </div>
  );
}

function Clientes() {
  const [fichas, setFichas] = useState<Ficha[]>([]);
  const [web, setWeb] = useState<Oportunidad[]>([]);
  const [aviso, setAviso] = useState("");

  const cargar = useCallback(async () => {
    api("/api/bot/ficha").then((r) => setFichas(r.fichas)).catch((e) => setAviso(e.message));
    const { data } = await supabase.from("opportunities")
      .select("id, customer_name, phone, status, created_at, next_followup_date, next_followup_note, trade_vehicle")
      .not("status", "in", "(completed,discarded)").order("created_at", { ascending: false }).limit(50);
    setWeb((data ?? []) as Oportunidad[]);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial desde el servidor y Supabase
    void cargar();
    const t = setInterval(cargar, 30_000);
    return () => clearInterval(t);
  }, [cargar]);

  async function tildar(f: Ficha, pendiente: string, hecho: boolean) {
    setFichas((xs) => xs.map((x) => x.id === f.id ? { ...x, hechos: hecho ? [...x.hechos, pendiente] : x.hechos.filter((h) => h !== pendiente) } : x));
    await api("/api/bot/ficha", { method: "PATCH", body: JSON.stringify({ id: f.id, pendiente, hecho }) }).catch((e) => setAviso(e.message));
  }

  // Primero los que tienen algo pendiente sin hacer.
  const abiertas = (f: Ficha) => f.pendientes.filter((p) => !f.hechos.includes(p)).length;
  const orden = [...fichas].sort((a, b) => Number(abiertas(b) > 0) - Number(abiertas(a) > 0));

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <section className="grid content-start gap-3">
        <p className={ui.etiqueta}>Marketplace · {fichas.length} chats</p>
        {aviso && <p className="text-sm text-red-700">{aviso}</p>}
        {orden.length === 0 && <p className="text-sm text-[var(--n500)]">Cuando el bot responda, acá aparece la ficha de cada cliente.</p>}
        {orden.map((f) => (
          <article key={f.id} className={`${ui.tarjeta} grid gap-2 p-4`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-semibold">{f.cliente || "Cliente"} <span className="font-normal text-[var(--n500)]">· {f.publicacion}</span></p>
              <span className="rounded-full bg-[var(--m50)] px-2 py-0.5 font-mono text-xs">{f.etapa}</span>
            </div>
            {f.pide && <p className="text-sm text-[var(--n600)]">Último pedido: {f.pide}</p>}
            <div className="flex flex-wrap gap-x-4 text-xs text-[var(--n500)]">
              {f.permuta && <span>Permuta: {f.permuta}</span>}
              {f.financiacion && <span>Quiere financiar</span>}
              <span>{hora(f.actualizado)}</span>
            </div>
            {f.proximoPaso && <p className="text-sm"><b>Próximo paso:</b> {f.proximoPaso}</p>}
            {f.pendientes.length > 0 && (
              <ul className="grid gap-1 sm:grid-cols-2">
                {f.pendientes.map((p) => (
                  <li key={p}>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={f.hechos.includes(p)} onChange={(e) => tildar(f, p, e.target.checked)} className="h-4 w-4 accent-[var(--tinta)]" />
                      <span className={f.hechos.includes(p) ? "text-[var(--n500)] line-through" : ""}>{p}</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
            {Object.values(f.fotosInfo ?? {}).filter((i) => i.tipo === "auto").map((i, k) => (
              <p key={k} className="text-xs text-[var(--n600)]">Foto del auto: {i.desc}</p>
            ))}
            {(f.fotos?.length ?? 0) > 0 && (
              <div className="flex flex-wrap gap-2">
                {f.fotos!.map((n) => <Foto key={n} conv={f.id} nombre={n} info={f.fotosInfo?.[n]} />)}
              </div>
            )}
            <a href={`https://www.messenger.com/marketplace/t/${f.id}/`} target="_blank" rel="noopener noreferrer" className={`${ui.botonSuave} justify-self-start`}>Abrir chat</a>
          </article>
        ))}
      </section>

      <section className="grid content-start gap-3">
        <div className="flex items-baseline justify-between">
          <p className={ui.etiqueta}>Oportunidades de la web · {web.length}</p>
          <Link href="/admin" className="text-sm underline">Ver todas</Link>
        </div>
        {web.length === 0 && <p className="text-sm text-[var(--n500)]">No hay oportunidades abiertas del simulador.</p>}
        {web.map((o) => (
          <article key={o.id} className={`${ui.tarjeta} grid gap-1 p-4 text-sm`}>
            <div className="flex items-baseline justify-between gap-2">
              <p className="font-semibold">{o.customer_name || "Sin nombre"}</p>
              <span className="font-mono text-xs text-[var(--n500)]">{ESTADO_WEB[o.status] ?? o.status}</span>
            </div>
            {o.trade_vehicle?.brand && <p>Permuta: {o.trade_vehicle.brand} {o.trade_vehicle.model} {o.trade_vehicle.year}</p>}
            {o.next_followup_note && <p><b>Próximo paso:</b> {o.next_followup_note}{o.next_followup_date ? ` (${o.next_followup_date})` : ""}</p>}
            <p className="text-xs text-[var(--n500)]">{hora(o.created_at)}{o.phone ? ` · ${o.phone}` : ""}</p>
          </article>
        ))}
      </section>
    </div>
  );
}

function ActividadLista() {
  const [actividad, setActividad] = useState<Actividad[]>([]);
  const cargar = useCallback(() => api("/api/bot/actividad").then((r) => setActividad(r.actividad)).catch(() => {}), []);

  useEffect(() => {
    void cargar();
    const t = setInterval(cargar, 30_000);
    return () => clearInterval(t);
  }, [cargar]);

  return (
    <section className={`${ui.tarjeta} p-5`}>
      <div className="mb-3 flex items-baseline justify-between">
        <p className={ui.etiqueta}>Actividad del bot</p>
        <button onClick={cargar} className={ui.botonSuave}>Actualizar</button>
      </div>
      {actividad.length === 0 ? (
        <p className="text-sm text-[var(--n500)]">Todavía no respondió nada desde que se conectó.</p>
      ) : (
        <ol className="grid gap-3">
          {actividad.map((a) => (
            <li key={a.at + a.cliente} className="border-b border-[var(--n200)] pb-3 text-sm">
              <p className="font-mono text-xs text-[var(--n500)]">{hora(a.at)} · {a.cliente || "Cliente"}{a.publicacion && ` · ${a.publicacion}`}</p>
              {a.mensaje && <p className="mt-1 text-[var(--n600)]">“{a.mensaje}”</p>}
              {a.entendido && <p className="mt-1 text-xs text-[var(--m700)]">Entendió: {a.entendido}</p>}
              <p className="mt-1 whitespace-pre-line">{a.respuesta}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function Config() {
  const [negocio, setNegocio] = useState("");
  const [estilo, setEstilo] = useState("");
  const [conClave, setConClave] = useState(false);
  const [clave, setClave] = useState("");
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    api("/api/bot/admin").then((r) => { setNegocio(r.negocio); setEstilo(r.estilo); setConClave(r.conClave); }).catch((e) => setAviso(e.message));
  }, []);

  async function guardar() {
    setAviso("");
    try { await api("/api/bot/admin", { method: "PUT", body: JSON.stringify({ negocio, estilo }) }); setAviso("Guardado. El bot lo usa en la próxima respuesta."); }
    catch (e) { setAviso("No se pudo guardar: " + (e as Error).message); }
  }

  async function importar() {
    setAviso("Trayendo…");
    try {
      const r = await api("/api/bot/admin?importar=1", { method: "POST" });
      setAviso(`Listo: ${r.config ? "textos y clave, " : ""}${r.actividad} respuestas, ${r.fichas} fichas y ${r.fotos} fotos.`);
      const c = await api("/api/bot/admin");
      setNegocio(c.negocio); setEstilo(c.estilo); setConClave(c.conClave);
    } catch (e) { setAviso("No se pudo traer: " + (e as Error).message); }
  }

  async function generarClave() {
    if (conClave && !confirm("La clave actual deja de funcionar y vas a tener que pegar la nueva en la extensión. Seguimos?")) return;
    const r = await api("/api/bot/admin", { method: "POST" });
    setClave(r.clave); setConClave(true);
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className={`${ui.tarjeta} grid gap-4 p-5`}>
        <div>
          <label className={ui.etiqueta} htmlFor="negocio">Lo que sabe de ALEZZA</label>
          <textarea id="negocio" rows={14} value={negocio} onChange={(e) => setNegocio(e.target.value)} className={ui.campo} />
          <p className="mt-1 text-xs text-[var(--n500)]">Los autos, precios y km los toma solos del portal Vehículos.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={guardar} className={ui.boton}>Guardar</button>
          {aviso && <p className="text-sm text-[var(--n600)]">{aviso}</p>}
        </div>
      </div>
      <div className="grid content-start gap-5">
        <div className={`${ui.tarjeta} grid gap-2 p-5`}>
          <label className={ui.etiqueta} htmlFor="estilo">Cómo escribo yo</label>
          <textarea id="estilo" rows={14} value={estilo} onChange={(e) => setEstilo(e.target.value)} className={ui.campo} />
          <p className="text-xs text-[var(--n500)]">Cuantos más mensajes reales pegues, más va a sonar como vos. Se guarda con el botón Guardar.</p>
        </div>
        <div className={`${ui.tarjeta} grid gap-3 p-5`}>
          <p className={ui.etiqueta}>Conexión con la extensión</p>
          <p className="text-sm">{conClave ? "La extensión tiene una clave asignada." : "Todavía no hay clave: generala y pegala en el popup de la extensión."}</p>
          {clave && (
            <div className="rounded-md bg-[var(--m50)] p-3 text-sm">
              <p className="font-semibold">Copiala ahora, no se vuelve a mostrar:</p>
              <code className="mt-1 block break-all font-mono">{clave}</code>
            </div>
          )}
          <button onClick={generarClave} className={`${ui.botonSuave} justify-self-start`}>{conClave ? "Generar clave nueva" : "Generar clave"}</button>
        </div>
        <div className={`${ui.tarjeta} grid gap-3 p-5`}>
          <p className={ui.etiqueta}>Datos guardados en esta PC</p>
          <p className="text-sm">Antes el bot guardaba todo en archivos de la PC. Traelos una vez a Supabase (textos, clave, actividad, fichas y fotos). Funciona solo desde la PC donde estaban.</p>
          <button onClick={importar} className={`${ui.botonSuave} justify-self-start`}>Traer datos de esta PC</button>
        </div>
      </div>
    </div>
  );
}

// Las fotos son privadas: se piden con la sesión de administrador y se muestran desde memoria.
function Foto({ conv, nombre, info }: { conv: string; nombre: string; info?: { tipo: string; desc: string } }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    let creada = "";
    supabase.auth.getSession().then(({ data }) =>
      fetch(`/api/bot/foto?conv=${conv}&f=${nombre}`, { headers: { Authorization: `Bearer ${data.session?.access_token ?? ""}` }, cache: "no-store" }))
      .then((r) => (r.ok ? r.blob() : null))
      .then((b) => { if (b) { creada = URL.createObjectURL(b); setUrl(creada); } })
      .catch(() => {});
    return () => { if (creada) URL.revokeObjectURL(creada); };
  }, [conv, nombre]);
  if (!url) return <span className="h-20 w-20 animate-pulse rounded-md bg-[var(--n100)]" />;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" title={info?.desc} className="grid w-20 gap-1">
      {/* eslint-disable-next-line @next/next/no-img-element -- imagen privada en memoria (blob) */}
      <img src={url} alt={info?.desc || "Foto enviada por el cliente"} className="h-20 w-20 rounded-md object-cover" />
      {info?.tipo && <span className="truncate font-mono text-[10px] uppercase text-[var(--n500)]">{info.tipo}</span>}
    </a>
  );
}
