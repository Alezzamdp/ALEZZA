"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AdminGate, { ui } from "@/components/AdminGate";
import { aFila } from "@/lib/bruno";
import { supabase } from "@/lib/supabase";
import { getWhatsAppUrl } from "@/lib/whatsapp";
import { PAGO_TEXTO, SERVICIOS, armarMensaje, fechaLarga, pesos, servicioTexto, type Plantilla, type Turno } from "@/lib/turnos";

type Filtro = "atender" | "proximos" | "todos";
const hoy = () => new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10); // Argentina, UTC-3

const atender = (t: Turno) => t.estado !== "cancelado" && (!t.visto || t.pago_estado === "informado" || t.estado === "solicitado");

export default function Page() {
  return <AdminGate titulo="Turnos" frase="Revisando la agenda del taller…">{() => <Turnos />}</AdminGate>;
}

function Turnos() {
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [filtro, setFiltro] = useState<Filtro>("atender");
  const [aviso, setAviso] = useState("");
  const [permiso, setPermiso] = useState<NotificationPermission | "no">("default");
  const conocidos = useRef<Set<string> | null>(null);

  const cargar = useCallback(async () => {
    const desde = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
    const { data, error } = await supabase.from("turnos").select("*").gte("fecha", desde).order("fecha").order("creado").limit(500);
    if (error) { setAviso(error.code === "PGRST205" ? "Falta crear las tablas de turnos en Supabase (migración 202611150001)." : "No se pudieron cargar los turnos: " + error.message); return; }
    const lista = data as Turno[];
    // Aviso del navegador por cada turno o pago nuevo desde la última vez que miramos.
    const nuevos = lista.filter((t) => !t.visto).map((t) => t.id + t.pago_estado);
    if (conocidos.current && "Notification" in window && Notification.permission === "granted") {
      for (const t of lista) {
        if (!t.visto && !conocidos.current.has(t.id + t.pago_estado)) {
          new Notification(t.pago_estado === "informado" ? "ALEZZA · Comprobante para verificar" : t.pago_estado === "confirmado" ? "ALEZZA · Seña acreditada" : "ALEZZA · Turno nuevo",
            { body: `${t.nombre} · ${t.patente} · ${fechaLarga(t.fecha)}`, tag: t.id });
        }
      }
    }
    conocidos.current = new Set(nuevos);
    setTurnos(lista);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- el permiso de avisos solo existe en el navegador
    setPermiso("Notification" in window ? Notification.permission : "no");
    void cargar();
    const t = setInterval(cargar, 60000);
    return () => clearInterval(t);
  }, [cargar]);

  const pendientes = turnos.filter((t) => !t.visto).length;
  useEffect(() => { document.title = (pendientes ? `(${pendientes}) ` : "") + "Turnos · ALEZZA"; }, [pendientes]);

  const lista = useMemo(() => turnos.filter((t) =>
    filtro === "todos" ? true : filtro === "atender" ? atender(t) : t.fecha >= hoy() && t.estado !== "cancelado"), [turnos, filtro]);

  async function cambiar(t: Turno, cambios: Partial<Turno>, texto: string) {
    const { error } = await supabase.from("turnos").update({ ...cambios, visto: true }).eq("id", t.id);
    setAviso(error ? "No se pudo guardar: " + error.message : texto);
    await cargar();
    return !error;
  }

  // El turno confirmado va a la agenda de BRUNO OS con todos los datos del cliente.
  async function agendar(t: Turno) {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return false;
    const fila = aFila({
      id: "t" + t.id.replace(/-/g, ""),
      tipo: "evento",
      titulo: [`Turno ${servicioTexto(t.servicio, t.extras ?? [])}`, t.patente, t.vehiculo, t.nombre, `WhatsApp ${t.whatsapp}`, t.direccion].filter(Boolean).join(" · "),
      fecha: t.fecha,
      area: "Turnos",
    });
    const { error } = await supabase.from("bruno_items").upsert({ ...fila, user_id: data.user.id }, { onConflict: "user_id,id" });
    return !error;
  }

  async function confirmarTurno(t: Turno) {
    if (!(await cambiar(t, { estado: "confirmado" }, "Turno confirmado."))) return;
    const ok = await agendar(t);
    setAviso(ok ? "Turno confirmado y anotado en la agenda de BRUNO OS." : "Turno confirmado. No se pudo anotar en la agenda (¿falta la tabla de BRUNO OS?).");
  }

  async function verComprobante(t: Turno) {
    if (!t.comprobante) return;
    const { data, error } = await supabase.storage.from("turno-comprobantes").createSignedUrl(t.comprobante, 600);
    if (error || !data) { setAviso("No se pudo abrir el comprobante."); return; }
    window.open(data.signedUrl, "_blank", "noopener");
  }

  function whatsapp(t: Turno, clave: Plantilla) {
    const url = getWhatsAppUrl(t.whatsapp, armarMensaje(clave, { nombre: t.nombre, vehiculo: t.vehiculo, patente: t.patente, fecha: fechaLarga(t.fecha), enlace: `${location.origin}/turnos/${t.token}` }));
    if (url) window.open(url, "_blank", "noopener"); else setAviso("El número de WhatsApp no es válido.");
  }

  async function activarAvisos() {
    setPermiso(await Notification.requestPermission());
  }

  async function marcarVistos() {
    const ids = turnos.filter((t) => !t.visto).map((t) => t.id);
    if (ids.length) await supabase.from("turnos").update({ visto: true }).in("id", ids);
    await cargar();
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {(["atender", "proximos", "todos"] as Filtro[]).map((f) => (
          <button key={f} onClick={() => setFiltro(f)} aria-pressed={filtro === f}
            className={`rounded-full border px-4 py-1.5 text-sm ${filtro === f ? "border-[var(--tinta)] bg-[var(--tinta)] text-[var(--papel)]" : "border-[var(--n300)]"}`}>
            {f === "atender" ? `Por atender (${turnos.filter(atender).length})` : f === "proximos" ? "Próximos" : "Todos"}
          </button>
        ))}
        <span className="ml-auto flex flex-wrap items-center gap-2 text-sm">
          {pendientes > 0 && <span className="rounded-full bg-[var(--mostaza)] px-3 py-1 font-semibold text-[#17150f]">{pendientes} sin ver</span>}
          {pendientes > 0 && <button onClick={marcarVistos} className={ui.botonSuave}>Marcar vistos</button>}
          {permiso === "default" && <button onClick={activarAvisos} className={ui.botonSuave}>Activar avisos</button>}
          <Link href="/turnos" target="_blank" className={ui.botonSuave}>Página pública ↗</Link>
        </span>
      </div>

      {aviso && <p role="status" className={`${ui.tarjeta} px-4 py-3 text-sm`}>{aviso}</p>}
      {lista.length === 0 && <p className="text-[var(--n500)]">No hay turnos acá.</p>}

      {lista.map((t) => (
        <article key={t.id} className={`${ui.tarjeta} grid gap-4 p-5 lg:grid-cols-[1fr_auto] ${t.visto ? "" : "border-l-4 border-l-[var(--mostaza)]"}`}>
          <div className="grid gap-1">
            <p className="font-mono text-xs uppercase tracking-wider text-[var(--m700)]">
              {fechaLarga(t.fecha)} · {servicioTexto(t.servicio, t.extras ?? [])}{t.precio !== null && <> · {pesos(Number(t.precio))}</>} {!t.visto && <b className="ml-2 text-[var(--tinta)]">● nuevo</b>}
            </p>
            <h2 className="text-lg font-semibold">{t.nombre} · <span className="font-mono">{t.patente}</span> · {t.vehiculo}</h2>
            <p className="text-sm text-[var(--n600)]">
              WhatsApp {t.whatsapp}{t.direccion && <> · {t.direccion}</>}
            </p>
            {t.notas && <p className="text-sm italic text-[var(--n600)]">“{t.notas}”</p>}
            <p className="mt-1 flex flex-wrap gap-2 text-xs">
              <span className={`rounded-full px-2.5 py-1 ${t.pago_estado === "confirmado" ? "bg-[var(--tinta)] text-[var(--papel)]" : t.pago_estado === "informado" ? "bg-[var(--mostaza)] text-[#17150f]" : "border border-[var(--n300)]"}`}>
                {PAGO_TEXTO[t.pago_estado]} · {pesos(Number(t.sena))}{t.pago_metodo && ` · ${t.pago_metodo}`}
              </span>
              <span className="rounded-full border border-[var(--n300)] px-2.5 py-1 capitalize">{t.estado}</span>
            </p>
          </div>
          <div className="flex flex-wrap content-start gap-2 lg:max-w-sm lg:justify-end">
            {t.comprobante && <button onClick={() => verComprobante(t)} className={ui.botonSuave}>Ver comprobante</button>}
            {t.pago_estado !== "confirmado" && t.estado !== "cancelado" && (
              <button onClick={async () => { if (await cambiar(t, { pago_estado: "confirmado", pago_metodo: t.pago_metodo ?? "transferencia" }, "Seña confirmada.")) whatsapp(t, "pago_recibido"); }} className={ui.botonSuave}>Confirmar pago</button>
            )}
            {t.pago_estado === "informado" && (
              <button onClick={async () => { if (await cambiar(t, { pago_estado: "rechazado" }, "Pago marcado como no recibido.")) whatsapp(t, "pago_rechazado"); }} className={ui.botonSuave}>Rechazar pago</button>
            )}
            {t.estado === "solicitado" && <button onClick={async () => { await confirmarTurno(t); whatsapp(t, "turno_confirmado"); }} className={ui.boton}>Confirmar turno</button>}
            {t.estado === "confirmado" && <button onClick={() => agendar(t).then((ok) => setAviso(ok ? "Anotado en la agenda." : "No se pudo anotar en la agenda."))} className={ui.botonSuave}>Anotar en agenda</button>}
            <Link href={`/admin/taller?turno=${t.id}`} className={ui.botonSuave}>Abrir orden de taller</Link>
            <select aria-label="Mandar mensaje" value="" onChange={(e) => e.target.value && whatsapp(t, e.target.value as Plantilla)} className={`${ui.botonSuave} bg-transparent`}>
              <option value="">WhatsApp…</option>
              <option value="turno_confirmado">Turno confirmado</option>
              <option value="pago_recibido">Pago recibido</option>
              <option value="pago_rechazado">Pago no recibido</option>
            </select>
            <button onClick={() => navigator.clipboard.writeText(`${location.origin}/turnos/${t.token}`).then(() => setAviso("Enlace del cliente copiado."))} className={ui.botonSuave}>Copiar enlace</button>
            {!t.visto && <button onClick={() => cambiar(t, {}, "Marcado como visto.")} className={ui.botonSuave}>Visto</button>}
            {t.estado === "confirmado" && <button onClick={() => cambiar(t, { estado: "realizado" }, "Turno realizado.")} className={ui.botonSuave}>Realizado</button>}
            {t.estado !== "cancelado" && t.estado !== "realizado" && (
              <button onClick={() => confirm("¿Cancelar este turno? Libera el lugar del día.") && cambiar(t, { estado: "cancelado" }, "Turno cancelado.")} className={`${ui.botonSuave} text-red-700`}>Cancelar</button>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
