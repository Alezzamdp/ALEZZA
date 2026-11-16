"use client";

import { type InputHTMLAttributes, useCallback, useEffect, useMemo, useState } from "react";
import AdminGate, { ui } from "@/components/AdminGate";
import { achicarFoto } from "@/lib/fotos";
import { supabase } from "@/lib/supabase";
import { getWhatsAppUrl } from "@/lib/whatsapp";
import {
  ESTADOS_ORDEN, EXTRAS, MENSAJE_DE_ESTADO, PLANTILLAS, SERVICIOS, armarMensaje, normalizarPatente, pesos, totalTrabajos,
  type EstadoOrden, type Evento, type Orden, type Plantilla, type Trabajo, type Turno,
} from "@/lib/turnos";

// Órdenes de taller: presupuesto o toma de servicio en persona, fotos antes/después,
// estado del trabajo y mensajes rápidos al cliente. Pensado también para usar en el celular.

type Borrador = Omit<Orden, "id" | "numero" | "creado" | "updated_at" | "token"> & { id?: string; numero?: number; updated_at?: string; token?: string };

const VACIA: Borrador = {
  turno_id: null, estado: "presupuesto", cliente_nombre: "", cliente_whatsapp: "", cliente_email: "", direccion: "",
  patente: "", marca: "", modelo: "", anio: null, km: null, color: "", trabajos: [], notas: "",
  fotos_antes: [], fotos_despues: [], historial: [], publicar: false, titulo_publico: "",
};
const MENSAJES_TALLER: Plantilla[] = ["recibido", "presupuesto", "en_trabajo", "demora", "listo"];

export default function Page() {
  return <AdminGate titulo="Taller · órdenes de trabajo" frase="Abriendo el portón del taller…">{() => <Taller />}</AdminGate>;
}

function Taller() {
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [abierta, setAbierta] = useState<Borrador | null>(null);
  const [filtro, setFiltro] = useState<EstadoOrden | "activas">("activas");
  const [busca, setBusca] = useState("");
  const [aviso, setAviso] = useState("");

  const cargar = useCallback(async () => {
    const { data, error } = await supabase.from("ordenes").select("*").order("updated_at", { ascending: false }).limit(300);
    if (error) { setAviso(error.code === "PGRST205" ? "Falta crear las tablas del taller en Supabase (migración 202611150001)." : "No se pudieron cargar las órdenes: " + error.message); return []; }
    setOrdenes(data as Orden[]);
    return data as Orden[];
  }, []);

  // ?orden=<id> abre una orden; ?turno=<id> arranca una nueva con los datos del turno.
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga de datos: el setState ocurre después del await
    cargar().then(async (lista) => {
      const id = q.get("orden");
      if (id) { const o = lista.find((x) => x.id === id); if (o) setAbierta(o); return; }
      const turnoId = q.get("turno");
      if (!turnoId) return;
      const ya = lista.find((x) => x.turno_id === turnoId);
      if (ya) { setAbierta(ya); return; }
      const { data } = await supabase.from("turnos").select("*").eq("id", turnoId).maybeSingle();
      const t = data as Turno | null;
      if (t) setAbierta({
        ...VACIA, turno_id: t.id, cliente_nombre: t.nombre, cliente_whatsapp: t.whatsapp, direccion: t.direccion ?? "",
        patente: t.patente, modelo: t.vehiculo, notas: t.notas ?? "",
        trabajos: (t.servicio === "otro" && t.extras?.length ? t.extras.map((x) => EXTRAS[x]) : [SERVICIOS[t.servicio]])
          .map((nombre) => ({ t: nombre, precio: null, hecho: false })),
      });
    });
  }, [cargar]);

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return ordenes.filter((o) =>
      (filtro === "activas" ? !["entregado", "cancelado"].includes(o.estado) : o.estado === filtro) &&
      (!q || [o.cliente_nombre, o.patente, o.marca, o.modelo, String(o.numero)].some((v) => (v ?? "").toLowerCase().includes(q))));
  }, [ordenes, filtro, busca]);

  if (abierta) {
    return <Editor inicial={abierta} alCerrar={() => { setAbierta(null); history.replaceState(null, "", location.pathname); void cargar(); }} />;
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setAbierta({ ...VACIA })} className={ui.boton}>+ Nueva orden</button>
        <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Cliente, patente, auto o número…" className={`${ui.campo} max-w-xs`} />
        {(["activas", ...Object.keys(ESTADOS_ORDEN)] as (EstadoOrden | "activas")[]).map((f) => (
          <button key={f} onClick={() => setFiltro(f)} aria-pressed={filtro === f}
            className={`rounded-full border px-3 py-1 text-sm ${filtro === f ? "border-[var(--tinta)] bg-[var(--tinta)] text-[var(--papel)]" : "border-[var(--n300)]"}`}>
            {f === "activas" ? "Activas" : ESTADOS_ORDEN[f]}
          </button>
        ))}
      </div>
      {aviso && <p role="status" className={`${ui.tarjeta} px-4 py-3 text-sm`}>{aviso}</p>}
      {lista.length === 0 && !aviso && <p className="text-[var(--n500)]">No hay órdenes acá.</p>}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {lista.map((o) => (
          <button key={o.id} onClick={() => setAbierta(o)} className={`${ui.tarjeta} grid gap-1 p-4 text-left hover:border-[var(--tinta)]`}>
            <span className="flex items-center justify-between font-mono text-xs text-[var(--n500)]">
              <span>#{o.numero}</span>
              <span className={`rounded-full px-2 py-0.5 ${o.estado === "listo" ? "bg-[var(--mostaza)] text-[#17150f]" : o.estado === "en_trabajo" ? "bg-[var(--tinta)] text-[var(--papel)]" : "border border-[var(--n300)]"}`}>{ESTADOS_ORDEN[o.estado]}</span>
            </span>
            <span className="font-semibold">{o.cliente_nombre}</span>
            <span className="text-sm text-[var(--n600)]">{[o.patente, o.marca, o.modelo].filter(Boolean).join(" · ") || "Sin datos del auto"}</span>
            <span className="font-mono text-xs text-[var(--n500)]">{o.trabajos.length} trabajos · {pesos(totalTrabajos(o.trabajos))} · {o.fotos_antes.length + o.fotos_despues.length} fotos</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Editor({ inicial, alCerrar }: { inicial: Borrador; alCerrar: () => void }) {
  const [o, setO] = useState<Borrador>(inicial);
  const [cambios, setCambios] = useState(!inicial.id);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState("");
  const [libre, setLibre] = useState("");
  const [nota, setNota] = useState("");
  const set = <K extends keyof Borrador>(k: K, v: Borrador[K]) => { setO((x) => ({ ...x, [k]: v })); setCambios(true); };
  const evento = (tipo: Evento["tipo"], texto: string): Evento => ({ en: new Date().toISOString(), tipo, texto });

  async function guardar(extra: Partial<Borrador> = {}): Promise<Borrador | null> {
    const datos = { ...o, ...extra };
    if (!datos.cliente_nombre.trim()) { setAviso("Falta el nombre del cliente."); return null; }
    setOcupado(true);
    const fila = {
      turno_id: datos.turno_id, estado: datos.estado, cliente_nombre: datos.cliente_nombre.trim(),
      cliente_whatsapp: datos.cliente_whatsapp?.trim() || null, cliente_email: datos.cliente_email?.trim() || null,
      direccion: datos.direccion?.trim() || null, patente: datos.patente ? normalizarPatente(datos.patente) : null,
      marca: datos.marca?.trim() || null, modelo: datos.modelo?.trim() || null, anio: datos.anio, km: datos.km,
      color: datos.color?.trim() || null, trabajos: datos.trabajos.filter((t) => t.t.trim()), notas: datos.notas?.trim() || null,
      fotos_antes: datos.fotos_antes, fotos_despues: datos.fotos_despues, historial: datos.historial,
      publicar: datos.publicar, titulo_publico: datos.titulo_publico?.trim() || null,
    };
    const res = datos.id
      ? await supabase.from("ordenes").update(fila).eq("id", datos.id).select().single()
      : await supabase.from("ordenes").insert(fila).select().single();
    setOcupado(false);
    if (res.error) { setAviso("No se pudo guardar: " + res.error.message); return null; }
    const guardada = res.data as Orden;
    setO(guardada);
    setCambios(false);
    setAviso(`Orden #${guardada.numero} guardada.`);
    return guardada;
  }

  // base: la orden recién guardada, si la hay (el estado "o" de este render puede estar viejo).
  function mandar(texto: string, etiqueta: string, base: Borrador = o) {
    const url = base.cliente_whatsapp ? getWhatsAppUrl(base.cliente_whatsapp, texto) : null;
    if (!url) { setAviso("Cargá un WhatsApp válido del cliente."); return; }
    window.open(url, "_blank", "noopener");
    void guardar({ ...base, historial: [...base.historial, evento("mensaje", etiqueta)] });
  }

  const enlace = o.token ? `${location.origin}/seguimiento/${o.token}` : "";
  const datosMensaje = () => ({
    enlace,
    nombre: o.cliente_nombre, patente: o.patente ?? "",
    vehiculo: [o.marca, o.modelo].filter(Boolean).join(" ") || "auto",
    total: pesos(totalTrabajos(o.trabajos)), trabajos: o.trabajos.map((t) => t.t).filter(Boolean).join(", ").toLowerCase(),
  });

  async function cambiarEstado(estado: EstadoOrden) {
    const ok = await guardar({ estado, historial: [...o.historial, evento("estado", ESTADOS_ORDEN[estado])] });
    const sugerido = MENSAJE_DE_ESTADO[estado];
    if (ok && sugerido && o.cliente_whatsapp && confirm(`¿Avisarle al cliente por WhatsApp? (“${PLANTILLAS[sugerido].t}”)`)) {
      mandar(armarMensaje(sugerido, datosMensaje()), PLANTILLAS[sugerido].t, ok);
    }
  }

  async function subirFotos(cual: "fotos_antes" | "fotos_despues", files: FileList | null) {
    if (!files?.length) return;
    const base = o.id ? o : await guardar(); // las fotos van en la carpeta de la orden: primero hay que tenerla guardada
    if (!base?.id) return;
    setOcupado(true);
    const nuevas: string[] = [];
    for (const [i, f] of [...files].entries()) {
      setAviso(`Subiendo foto ${i + 1} de ${files.length}…`);
      try {
        const ruta = `${base.id}/${cual === "fotos_antes" ? "antes" : "despues"}-${crypto.randomUUID()}.jpg`;
        const { error } = await supabase.storage.from("orden-fotos").upload(ruta, await achicarFoto(f), { contentType: "image/jpeg" });
        if (error) throw error;
        nuevas.push(ruta);
      } catch (e) {
        setAviso("No se pudo subir una foto: " + (e instanceof Error ? e.message : ""));
      }
    }
    setOcupado(false);
    if (nuevas.length) await guardar({ ...base, [cual]: [...base[cual], ...nuevas] });
  }

  async function quitarFoto(cual: "fotos_antes" | "fotos_despues", ruta: string) {
    if (!confirm("¿Borrar esta foto?")) return;
    await supabase.storage.from("orden-fotos").remove([ruta]);
    await guardar({ [cual]: o[cual].filter((r) => r !== ruta) });
  }

  const trabajo = (i: number, cambio: Partial<Trabajo>) => set("trabajos", o.trabajos.map((t, j) => (j === i ? { ...t, ...cambio } : t)));
  // Tildar un trabajo se guarda al instante: el cliente lo ve en su checklist en vivo.
  const tildar = (i: number, hecho: boolean) => {
    const trabajos = o.trabajos.map((t, j) => (j === i ? { ...t, hecho } : t));
    if (o.id) void guardar({ trabajos }); else set("trabajos", trabajos);
  };
  const texto = (k: keyof Borrador, etiqueta: string, props: InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label className={ui.etiqueta} htmlFor={`o-${k}`}>{etiqueta}</label>
      <input id={`o-${k}`} value={(o[k] as string | number | null) ?? ""} className={ui.campo} {...props}
        onChange={(e) => set(k, (props.type === "number" ? (e.target.value === "" ? null : Number(e.target.value)) : e.target.value) as never)} />
    </div>
  );

  return (
    <div className="grid gap-5 pb-24">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => (!cambios || confirm("Hay cambios sin guardar. ¿Salir igual?")) && alCerrar()} className={ui.botonSuave}>← Órdenes</button>
        <h2 className="text-xl font-semibold">{o.numero ? `Orden #${o.numero}` : "Nueva orden"}</h2>
        <span className="ml-auto" />
        <button onClick={() => guardar()} disabled={ocupado} className={ui.boton}>{ocupado ? "Guardando…" : cambios ? "Guardar" : "Guardado ✓"}</button>
      </div>
      {aviso && <p role="status" className={`${ui.tarjeta} px-4 py-3 text-sm`}>{aviso}</p>}

      <section className={`${ui.tarjeta} p-5`}>
        <h3 className="mb-3 font-semibold">Estado</h3>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(ESTADOS_ORDEN) as EstadoOrden[]).map((e) => (
            <button key={e} onClick={() => e !== o.estado && cambiarEstado(e)} disabled={ocupado} aria-pressed={o.estado === e}
              className={`rounded-full border px-4 py-2 text-sm ${o.estado === e ? "border-[var(--tinta)] bg-[var(--tinta)] text-[var(--papel)]" : "border-[var(--n300)] hover:bg-[var(--n100)]"}`}>
              {ESTADOS_ORDEN[e]}
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className={`${ui.tarjeta} grid gap-3 p-5 sm:grid-cols-2`}>
          <h3 className="font-semibold sm:col-span-2">Cliente</h3>
          {texto("cliente_nombre", "Nombre", { autoComplete: "off" })}
          {texto("cliente_whatsapp", "WhatsApp", { type: "tel", inputMode: "tel" })}
          {texto("cliente_email", "Correo (opcional)", { type: "email" })}
          {texto("direccion", "Dirección")}
        </section>
        <section className={`${ui.tarjeta} grid gap-3 p-5 sm:grid-cols-3`}>
          <h3 className="font-semibold sm:col-span-3">Vehículo</h3>
          {texto("patente", "Patente", { className: `${ui.campo} uppercase` })}
          {texto("marca", "Marca")}
          {texto("modelo", "Modelo / versión")}
          {texto("anio", "Año", { type: "number", min: 1950, max: 2100 })}
          {texto("km", "Kilómetros", { type: "number", min: 0, inputMode: "numeric" })}
          {texto("color", "Color")}
        </section>
      </div>

      <section className={`${ui.tarjeta} p-5`}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold">Trabajos a realizar</h3>
          <span className="font-mono text-sm">Total {pesos(totalTrabajos(o.trabajos))}</span>
        </div>
        <div className="grid gap-2">
          {o.trabajos.map((t, i) => (
            <div key={i} className="flex items-center gap-2">
              <input type="checkbox" checked={t.hecho} onChange={(e) => tildar(i, e.target.checked)} aria-label="Hecho" className="h-5 w-5 accent-[var(--tinta)]" />
              <input value={t.t} onChange={(e) => trabajo(i, { t: e.target.value })} placeholder="Ej.: abrillantado de barniz" className={`${ui.campo} ${t.hecho ? "line-through opacity-60" : ""}`} />
              <input type="number" min={0} inputMode="numeric" value={t.precio ?? ""} placeholder="$" onChange={(e) => trabajo(i, { precio: e.target.value === "" ? null : Number(e.target.value) })} className={`${ui.campo} w-32`} aria-label="Precio" />
              <button onClick={() => set("trabajos", o.trabajos.filter((_, j) => j !== i))} aria-label="Quitar" className={ui.botonSuave}>×</button>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={() => set("trabajos", [...o.trabajos, { t: "", precio: null, hecho: false }])} className={ui.botonSuave}>+ Trabajo</button>
          {["Abrillantado de barniz", "Acondicionado de vano motor", "Saneamiento de habitáculo", "Preparación base"].map((s) => (
            <button key={s} onClick={() => set("trabajos", [...o.trabajos, { t: s, precio: null, hecho: false }])} className={`${ui.botonSuave} text-xs`}>+ {s}</button>
          ))}
        </div>
        <label className={`${ui.etiqueta} mt-4`} htmlFor="o-notas">Notas (estado general, daños, pedidos del cliente)</label>
        <textarea id="o-notas" rows={3} value={o.notas ?? ""} onChange={(e) => set("notas", e.target.value)} className={ui.campo} />
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <Fotos titulo="Antes" rutas={o.fotos_antes} ocupado={ocupado} alSubir={(f) => subirFotos("fotos_antes", f)} alQuitar={(r) => quitarFoto("fotos_antes", r)} />
        <Fotos titulo="Después" rutas={o.fotos_despues} ocupado={ocupado} alSubir={(f) => subirFotos("fotos_despues", f)} alQuitar={(r) => quitarFoto("fotos_despues", r)} />
      </div>

      <section className={`${ui.tarjeta} grid gap-3 p-5`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold">Catálogo de Servicios</h3>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={o.publicar} disabled={!o.fotos_antes.length || !o.fotos_despues.length}
              onChange={(e) => void guardar({ publicar: e.target.checked })} className="h-5 w-5 accent-[var(--tinta)]" />
            Mostrar este trabajo en /servicios
          </label>
        </div>
        <p className="text-sm text-[var(--n500)]">
          Se publica la primera foto de antes y de después, sin patente ni datos del cliente en el texto.
          {(!o.fotos_antes.length || !o.fotos_despues.length) && " Necesita al menos una foto de antes y una de después."}
          {" "}Revisá que en las fotos no se lea la patente y que el cliente esté de acuerdo.
        </p>
        <div>
          <label className={ui.etiqueta} htmlFor="o-titulo_publico">Título en el catálogo</label>
          <input id="o-titulo_publico" value={o.titulo_publico ?? ""} placeholder={[o.marca, o.modelo].filter(Boolean).join(" ") || "Ej.: Amarok V6 · puesta en valor"}
            onChange={(e) => set("titulo_publico", e.target.value)} maxLength={120} className={ui.campo} />
        </div>
      </section>

      <section className={`${ui.tarjeta} p-5`}>
        <h3 className="font-semibold">Contacto con el cliente</h3>
        <p className="mb-3 text-sm text-[var(--n500)]">Abre tu WhatsApp con el mensaje listo y queda registrado abajo. Los mensajes llevan el enlace de seguimiento, donde el cliente ve el checklist en vivo.</p>
        {enlace && (
          <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="font-mono text-xs text-[var(--n500)]">Seguimiento:</span>
            <a href={enlace} target="_blank" rel="noopener noreferrer" className="underline">ver como el cliente ↗</a>
            <button onClick={() => navigator.clipboard.writeText(enlace).then(() => setAviso("Enlace de seguimiento copiado."))} className={ui.botonSuave}>Copiar enlace</button>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {MENSAJES_TALLER.map((k) => (
            <button key={k} onClick={() => mandar(armarMensaje(k, datosMensaje()), PLANTILLAS[k].t)} disabled={ocupado} title={armarMensaje(k, datosMensaje())} className={ui.botonSuave}>
              {PLANTILLAS[k].t}
            </button>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <input value={libre} onChange={(e) => setLibre(e.target.value)} placeholder="Mensaje propio…" className={ui.campo} />
          <button onClick={() => { if (libre.trim()) { mandar(libre.trim(), "Mensaje: " + libre.trim().slice(0, 80)); setLibre(""); } }} className={ui.boton}>Enviar</button>
        </div>
        <div className="mt-4 border-t border-[var(--n200)] pt-4">
          <label className={ui.etiqueta} htmlFor="o-nota">Nota para el cliente (la ve en su seguimiento)</label>
          <div className="flex gap-2">
            <textarea id="o-nota" rows={2} maxLength={600} value={nota} onChange={(e) => setNota(e.target.value)}
              placeholder="Ej.: Encontramos un rayón en la puerta trasera; lo estamos corrigiendo sin costo." className={ui.campo} />
            <button disabled={!nota.trim() || ocupado}
              onClick={async () => { if (await guardar({ historial: [...o.historial, evento("nota", nota.trim())] })) { setNota(""); setAviso("Nota publicada en el seguimiento del cliente."); } }}
              className={ui.boton}>Publicar</button>
          </div>
        </div>
        {o.historial.length > 0 && (
          <ol className="mt-4 grid gap-1 border-t border-[var(--n200)] pt-3 text-sm">
            {[...o.historial].reverse().map((h, i) => (
              <li key={i} className="flex gap-3">
                <span className="w-32 shrink-0 font-mono text-xs text-[var(--n500)]">{new Date(h.en).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}</span>
                <span>{h.tipo === "estado" ? `Estado → ${h.texto}` : h.tipo === "mensaje" ? `WhatsApp: ${h.texto}` : `Nota al cliente: ${h.texto}`}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function Fotos({ titulo, rutas, ocupado, alSubir, alQuitar }: {
  titulo: string; rutas: string[]; ocupado: boolean; alSubir: (f: FileList | null) => void; alQuitar: (ruta: string) => void;
}) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!rutas.length) return;
    supabase.storage.from("orden-fotos").createSignedUrls(rutas, 3600).then(({ data }) =>
      setUrls(Object.fromEntries((data ?? []).filter((d) => d.signedUrl).map((d) => [d.path, d.signedUrl]))));
  }, [rutas]);

  return (
    <section className={`${ui.tarjeta} p-5`}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold">Fotos · {titulo} <span className="font-mono text-sm text-[var(--n500)]">{rutas.length}</span></h3>
        <label className={`${ui.boton} cursor-pointer ${ocupado ? "pointer-events-none opacity-50" : ""}`}>
          + Agregar
          <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => { alSubir(e.target.files); e.target.value = ""; }} />
        </label>
      </div>
      {rutas.length === 0 ? (
        <p className="text-sm text-[var(--n500)]">Sin fotos. En el celular, “Agregar” abre la cámara o la galería.</p>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {rutas.map((r) => (
            <div key={r} className="group relative aspect-square overflow-hidden rounded-md bg-[var(--n100)]">
              {urls[r] && (
                <a href={urls[r]} target="_blank" rel="noopener noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element -- URL firmada y temporal de un bucket privado */}
                  <img src={urls[r]} alt={`Foto ${titulo.toLowerCase()}`} className="h-full w-full object-cover" />
                </a>
              )}
              <button onClick={() => alQuitar(r)} aria-label="Borrar foto" className="absolute right-1 top-1 rounded bg-black/70 px-2 text-sm text-[#f3efe6] opacity-80 hover:opacity-100">×</button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
