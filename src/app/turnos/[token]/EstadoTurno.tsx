"use client";

import Link from "next/link";
import QRCode from "qrcode";
import { useCallback, useEffect, useState } from "react";
import Cargando from "@/components/Cargando";
import Logo from "@/components/Logo";
import MapaTaller from "@/components/MapaTaller";
import Seguimiento from "@/components/Seguimiento";
import { supabase } from "@/lib/supabase";
import {
  CONFIG_INICIAL, PAGO_TEXTO, fechaLarga, mensajeAlezza, pesos, servicioTexto, waAlezza,
  type Avance, type Turno, type TurnosConfig,
} from "@/lib/turnos";

type Publico = Pick<Turno, "id" | "fecha" | "servicio" | "extras" | "nombre" | "patente" | "vehiculo" | "precio" | "sena" | "estado" | "pago_estado" | "pago_metodo"> & { orden: Avance | null };

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" };

export default function EstadoTurno({ token, mp }: { token: string; mp: boolean }) {
  const [turno, setTurno] = useState<Publico | null | undefined>(undefined);
  const [config, setConfig] = useState<TurnosConfig>(CONFIG_INICIAL);
  const [aviso, setAviso] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [pagoMp, setPagoMp] = useState<{ url: string; qr: string } | null>(null);

  const cargar = useCallback(async () => {
    const { data } = await supabase.rpc("turno_publico", { p_token: token });
    setTurno((data as Publico | null) ?? null);
  }, [token]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga de datos: el setState ocurre después del await
    void cargar();
    supabase.from("app_settings").select("value").eq("key", "turnos").maybeSingle()
      .then(({ data }) => { if (data?.value) setConfig({ ...CONFIG_INICIAL, ...(data.value as Partial<TurnosConfig>) }); });
    // Vuelta de Mercado Pago: se confirma leyendo el pago en el servidor, no por lo que diga la dirección.
    const pago = new URLSearchParams(location.search).get("payment_id");
    if (pago && mp) {
      setAviso("Verificando el pago con Mercado Pago…");
      fetch("/api/turnos/mercadopago/verificar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, pago }) })
        .then((r) => r.json())
        .then((r) => {
          setAviso(r.estado === "approved" ? "¡Pago acreditado!"
            : r.estado === "pending" || r.estado === "in_process" ? "El pago está en proceso. Esta página se actualiza cuando se acredite."
            : "El pago no se completó. Podés intentar de nuevo.");
          void cargar();
        })
        .catch(() => setAviso("No pudimos verificar el pago todavía. Actualizá en un rato."));
      history.replaceState(null, "", location.pathname);
    }
  }, [cargar, mp, token]);

  const espera = !!turno && turno.estado !== "cancelado" && (turno.pago_estado === "pendiente" || turno.pago_estado === "rechazado");

  // Link y QR de Mercado Pago: se arman una vez, cuando el turno espera la seña.
  useEffect(() => {
    if (!mp || !espera || pagoMp) return;
    fetch("/api/turnos/mercadopago", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) })
      .then((x) => x.json())
      .then(async (r) => { if (r.url) setPagoMp({ url: r.url, qr: await QRCode.toDataURL(r.url, { margin: 1, width: 360, color: { dark: "#17150f", light: "#ffffff" } }) }); })
      .catch(() => {});
  }, [mp, espera, pagoMp, token]);

  // Se actualiza sola: pago verificado, turno confirmado y el checklist del taller en vivo.
  const terminado = !turno || turno.estado === "cancelado" || turno.orden?.estado === "entregado";
  useEffect(() => {
    if (terminado) return;
    const t = setInterval(cargar, 15000);
    return () => clearInterval(t);
  }, [terminado, cargar]);

  async function subirComprobante(file: File | undefined) {
    if (!file) return;
    const ext = EXT[file.type];
    if (!ext) { setAviso("Subí una foto (JPG, PNG o WebP) o un PDF."); return; }
    if (file.size > 5 * 1024 * 1024) { setAviso("El archivo pesa más de 5 MB."); return; }
    setOcupado(true);
    setAviso("Subiendo comprobante…");
    const ruta = `${token}/comprobante-${crypto.randomUUID()}.${ext}`;
    const up = await supabase.storage.from("turno-comprobantes").upload(ruta, file, { contentType: file.type });
    const { error } = up.error ? up : await supabase.rpc("informar_pago", { p_token: token, p_comprobante: ruta });
    setAviso(error ? "No se pudo enviar el comprobante. Probá de nuevo o mandalo por WhatsApp." : "¡Listo! Recibimos el comprobante; lo verificamos y te confirmamos.");
    setOcupado(false);
    void cargar();
  }

  if (turno === undefined) return <main className="min-h-screen"><Cargando frase="Buscando tu turno…" /></main>;
  if (turno === null) {
    return (
      <main className="grid min-h-screen place-items-center px-6 text-center">
        <div>
          <Logo alto={22} />
          <p className="mt-6">No encontramos ese turno. <Link href="/turnos" className="underline">Pedí uno nuevo</Link> o <a href={waAlezza(mensajeAlezza("No encuentro mi turno, ¿me ayudan?"))} className="underline">escribinos</a>.</p>
        </div>
      </main>
    );
  }

  const servicio = servicioTexto(turno.servicio, turno.extras ?? []);
  const enlace = typeof window === "undefined" ? "" : location.origin + location.pathname;
  const fila: [string, string][] = [
    ["Servicio", servicio], ["Día", fechaLarga(turno.fecha)], ["Vehículo", turno.vehiculo],
    ["Patente", turno.patente], ["Nombre", turno.nombre], ["Seña", pesos(Number(turno.sena))],
  ];
  const wa = {
    dudas: waAlezza(mensajeAlezza("Tengo una consulta sobre mi turno.", fila, enlace)),
    datos: waAlezza(mensajeAlezza("¿Me pasan los datos para transferir la seña?", fila, enlace)),
    comprobante: waAlezza(mensajeAlezza("Les mando el comprobante de la seña (lo adjunto en el próximo mensaje).", fila, enlace)),
  };
  const pasos = [
    { t: "Turno pedido", ok: true },
    { t: PAGO_TEXTO[turno.pago_estado], ok: turno.pago_estado === "confirmado" },
    { t: turno.estado === "cancelado" ? "Turno cancelado" : "Turno confirmado", ok: turno.estado === "confirmado" || turno.estado === "realizado" },
  ];

  return (
    <main className="min-h-screen text-[var(--tinta)]">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
        <Link href="/" aria-label="ALEZZA - Inicio"><Logo alto={22} /></Link>
        <a href={wa.dudas} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-600 hover:underline">¿Dudas? WhatsApp</a>
      </header>

      <section className="mx-auto grid max-w-3xl gap-6 px-6 pb-16">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-gray-500">Tu turno</p>
          <h1 className="mt-2 text-3xl font-extrabold first-letter:uppercase">{fechaLarga(turno.fecha)}</h1>
          <p className="mt-1 text-gray-600">{servicio} · {turno.vehiculo} · <span className="font-mono">{turno.patente}</span></p>
          {turno.precio !== null && <p className="mt-1 font-mono text-sm">Total {pesos(Number(turno.precio))}</p>}
        </div>

        <ol className="grid gap-2 sm:grid-cols-3">
          {pasos.map((p, i) => (
            <li key={i} className={`rounded-md border px-4 py-3 text-sm ${p.ok ? "border-[var(--tinta)] bg-[var(--tinta)] text-white" : "border-gray-200 bg-white"}`}>
              <span className="mr-2 font-mono text-xs opacity-70">0{i + 1}</span>{p.t}
            </li>
          ))}
        </ol>

        {aviso && <p role="status" className="rounded-md border border-gray-300 bg-white px-4 py-3 text-sm">{aviso}</p>}
        {turno.pago_estado === "informado" && (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Recibimos tu comprobante. Lo verificamos y esta página se actualiza sola.</p>
        )}
        {turno.pago_estado === "rechazado" && (
          <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">No pudimos verificar el pago anterior. Probá de nuevo o escribinos.</p>
        )}

        {turno.orden && <Seguimiento avance={turno.orden} />}

        {espera && (
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="text-xl font-bold">Seña: {pesos(Number(turno.sena))}</h2>
            <p className="mt-1 text-sm text-gray-600">
              {turno.precio !== null ? `Es el ${config.porcentaje_sena}% del servicio y se descuenta del total.` : "Se descuenta del total, que te confirmamos al ver el auto."}
            </p>
            <div className={`mt-5 grid gap-6 ${mp ? "md:grid-cols-2" : ""}`}>
              {mp && (
                <div>
                  <h3 className="font-semibold">Mercado Pago</h3>
                  <p className="mt-1 text-sm text-gray-600">Escaneá el QR con la app de Mercado Pago o tocá el botón. Se confirma al instante.</p>
                  {pagoMp ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element -- QR generado en el navegador */}
                      <img src={pagoMp.qr} alt="QR para pagar la seña con Mercado Pago" width={180} height={180} className="mt-3 rounded-md border border-gray-200" />
                      <a href={pagoMp.url} className="mt-3 inline-block rounded-md bg-[var(--tinta)] px-5 py-2.5 text-sm font-semibold text-white">Pagar con Mercado Pago</a>
                    </>
                  ) : (
                    <Cargando frase="Generando el QR de pago…" pantalla={false} />
                  )}
                </div>
              )}
              <div>
                <h3 className="font-semibold">Transferencia</h3>
                {config.alias || config.cbu ? (
                  <>
                    <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-mono text-sm">
                      {config.alias && <><dt className="text-gray-500">Alias</dt><dd className="select-all">{config.alias}</dd></>}
                      {config.cbu && <><dt className="text-gray-500">CBU/CVU</dt><dd className="select-all break-all">{config.cbu}</dd></>}
                      {config.titular && <><dt className="text-gray-500">Titular</dt><dd>{config.titular}</dd></>}
                    </dl>
                    <button type="button" onClick={() => navigator.clipboard.writeText(config.alias || config.cbu).then(() => setAviso("Copiado. Pegalo en la app de tu banco o billetera."))}
                      className="mt-3 rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">
                      Copiar {config.alias ? "alias" : "CBU"}
                    </button>
                  </>
                ) : (
                  <p className="mt-1 text-sm text-gray-600">Pedinos los datos por <a href={wa.datos} target="_blank" rel="noopener noreferrer" className="underline">WhatsApp</a>.</p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <label className={`cursor-pointer rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold hover:bg-gray-50 ${ocupado ? "pointer-events-none opacity-60" : ""}`}>
                    Subir comprobante
                    <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="sr-only" onChange={(e) => subirComprobante(e.target.files?.[0])} />
                  </label>
                  <a href={wa.comprobante} target="_blank" rel="noopener noreferrer" className="rounded-md px-4 py-2 text-sm underline">o mandarlo por WhatsApp</a>
                </div>
              </div>
            </div>
          </div>
        )}

        {turno.estado !== "cancelado" && <MapaTaller alto={260} />}

        <p className="text-sm text-gray-500">Guardá este enlace: acá ves el estado de tu turno y, cuando el auto esté en el taller, cómo avanza el trabajo.</p>
      </section>
    </main>
  );
}
