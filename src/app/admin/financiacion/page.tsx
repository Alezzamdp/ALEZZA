"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminGate, { ui } from "@/components/AdminGate";
import { COTIZADOR_CREDITCAR, comisionAgencia } from "@/lib/financiacion";
import { supabase } from "@/lib/supabase";
import { pesos } from "@/lib/turnos";
import { getWhatsAppUrl } from "@/lib/whatsapp";

type Estado = "nueva" | "cargada" | "aprobada" | "rechazada" | "vendida" | "desistio";
type Solicitud = {
  id: string; creado: string; dni: string; nombre: string; whatsapp: string; vehiculo: string; anio: number;
  precio: number; monto: number; plazo: number; cuota_estimada: number | null; origen: string; estado: Estado;
  notas: string | null; visto: boolean;
};

// El embudo: de la solicitud con DNI a la venta.
const ESTADOS: Record<Estado, string> = {
  nueva: "Nueva", cargada: "Cargada en CreditCar", aprobada: "Aprobada", rechazada: "Rechazada", vendida: "Vendida", desistio: "Desistió",
};
const FIRMA = "ALEZZA · Asesoría automotor";
const MENSAJES: Partial<Record<Estado, (s: Solicitud) => string>> = {
  cargada: (s) => [`Hola ${s.nombre.split(" ")[0]}, ¿cómo estás?`, "", "Ya cargamos tu solicitud de financiación en *CreditCar*.", "",
    `• Vehículo: ${s.vehiculo}`, `• A financiar: ${pesos(Number(s.monto))}`, `• Plazo: ${s.plazo} meses`, "",
    "Te aviso apenas tengamos la respuesta.", "", FIRMA].join("\n"),
  aprobada: (s) => [`Hola ${s.nombre.split(" ")[0]}, ¿cómo estás?`, "", "¡Buenas noticias! Tu financiación quedó *aprobada*.", "",
    `• Vehículo: ${s.vehiculo}`, `• A financiar: ${pesos(Number(s.monto))}`, `• Plazo: ${s.plazo} meses`, "",
    "¿Coordinamos para avanzar con la operación?", "", FIRMA].join("\n"),
  rechazada: (s) => [`Hola ${s.nombre.split(" ")[0]}, ¿cómo estás?`, "", "CreditCar no aprobó la financiación en esta oportunidad.", "",
    "Podemos buscar otra alternativa: otro plazo, más aporte o una permuta. ¿Lo vemos juntos?", "", FIRMA].join("\n"),
};

export default function Page() {
  return <AdminGate titulo="Financiación · CreditCar" frase="Sacando cuentas…">{() => <Financiaciones />}</AdminGate>;
}

function Financiaciones() {
  const [lista, setLista] = useState<Solicitud[]>([]);
  const [filtro, setFiltro] = useState<Estado | "activas">("activas");
  const [aviso, setAviso] = useState("");

  const cargar = useCallback(async () => {
    const { data, error } = await supabase.from("financiaciones").select("*").order("creado", { ascending: false }).limit(300);
    if (error) { setAviso(error.code === "PGRST205" ? "Falta crear la tabla de financiaciones en Supabase (migración 202611150003)." : "No se pudo cargar: " + error.message); return; }
    setLista(data as Solicitud[]);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga de datos: el setState ocurre después del await
    void cargar();
    const t = setInterval(cargar, 60000);
    return () => clearInterval(t);
  }, [cargar]);

  const visibles = useMemo(() => lista.filter((s) => (filtro === "activas" ? ["nueva", "cargada", "aprobada"].includes(s.estado) : s.estado === filtro)), [lista, filtro]);
  const vendidas = lista.filter((s) => s.estado === "vendida");
  const comision = vendidas.reduce((t, s) => t + comisionAgencia(Number(s.monto), s.anio, s.plazo), 0);

  async function cambiar(s: Solicitud, cambios: Partial<Solicitud>, texto: string) {
    const { error } = await supabase.from("financiaciones").update({ ...cambios, visto: true }).eq("id", s.id);
    setAviso(error ? "No se pudo guardar: " + error.message : texto);
    await cargar();
    return !error;
  }

  async function pasarA(s: Solicitud, estado: Estado) {
    if (!(await cambiar(s, { estado }, `Pasó a “${ESTADOS[estado]}”.`))) return;
    const m = MENSAJES[estado];
    const url = m ? getWhatsAppUrl(s.whatsapp, m(s)) : null;
    if (url && confirm("¿Avisarle al cliente por WhatsApp?")) window.open(url, "_blank", "noopener");
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          ["Nuevas", lista.filter((s) => s.estado === "nueva").length],
          ["En CreditCar", lista.filter((s) => s.estado === "cargada").length],
          ["Aprobadas", lista.filter((s) => s.estado === "aprobada").length],
          ["Vendidas · comisión", `${vendidas.length} · ${pesos(comision)}`],
        ].map(([t, v]) => (
          <div key={t} className={`${ui.tarjeta} p-4`}>
            <p className={ui.etiqueta}>{t}</p>
            <p className="text-2xl font-semibold">{v}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(["activas", ...Object.keys(ESTADOS)] as (Estado | "activas")[]).map((f) => (
          <button key={f} onClick={() => setFiltro(f)} aria-pressed={filtro === f}
            className={`rounded-full border px-3 py-1 text-sm ${filtro === f ? "border-[var(--tinta)] bg-[var(--tinta)] text-[var(--papel)]" : "border-[var(--n300)]"}`}>
            {f === "activas" ? "Activas" : ESTADOS[f]}
          </button>
        ))}
        <a href={COTIZADOR_CREDITCAR} target="_blank" rel="noopener noreferrer" className={`${ui.boton} ml-auto`}>Abrir cotizador CreditCar ↗</a>
      </div>

      {aviso && <p role="status" className={`${ui.tarjeta} px-4 py-3 text-sm`}>{aviso}</p>}
      {visibles.length === 0 && !aviso && <p className="text-[var(--n500)]">No hay solicitudes acá.</p>}

      {visibles.map((s) => (
        <article key={s.id} className={`${ui.tarjeta} grid gap-3 p-5 lg:grid-cols-[1fr_auto] ${s.visto ? "" : "border-l-4 border-l-[var(--mostaza)]"}`}>
          <div className="grid gap-1">
            <p className="font-mono text-xs uppercase tracking-wider text-[var(--m700)]">
              {new Date(s.creado).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })} · {ESTADOS[s.estado]}{s.origen === "tasacion" && " · desde tasación"}
            </p>
            <h2 className="text-lg font-semibold">{s.nombre} · DNI <span className="font-mono">{s.dni}</span></h2>
            <p className="text-sm">{s.vehiculo} ({s.anio}) · precio {pesos(Number(s.precio))}</p>
            <p className="font-mono text-sm">
              Financia {pesos(Number(s.monto))} · {s.plazo} meses{s.cuota_estimada ? ` · cuota est. ${pesos(Number(s.cuota_estimada))}` : ""}
              {" · "}comisión est. {pesos(comisionAgencia(Number(s.monto), s.anio, s.plazo))}
            </p>
            <textarea defaultValue={s.notas ?? ""} placeholder="Notas internas (respuesta de CreditCar, documentación, etc.)" rows={2}
              onBlur={(e) => e.target.value !== (s.notas ?? "") && cambiar(s, { notas: e.target.value }, "Nota guardada.")} className={`${ui.campo} mt-2 text-sm`} />
          </div>
          <div className="flex flex-wrap content-start gap-2 lg:max-w-xs lg:justify-end">
            <button onClick={() => navigator.clipboard.writeText(`DNI ${s.dni} · ${s.nombre} · ${s.vehiculo} ${s.anio} · monto ${s.monto} · ${s.plazo} meses`).then(() => setAviso("Datos copiados para el cotizador."))} className={ui.botonSuave}>Copiar datos</button>
            <a href={getWhatsAppUrl(s.whatsapp) ?? "#"} target="_blank" rel="noopener noreferrer" className={ui.botonSuave}>WhatsApp</a>
            {(Object.keys(ESTADOS) as Estado[]).filter((e) => e !== s.estado && e !== "nueva").map((e) => (
              <button key={e} onClick={() => pasarA(s, e)} className={e === "aprobada" || e === "vendida" ? ui.boton : ui.botonSuave}>{ESTADOS[e]}</button>
            ))}
          </div>
        </article>
      ))}
      <p className="text-xs text-[var(--n500)]">Comisión estimada según la gráfica de CreditCar: 2 % (2021–2026) o 3 % (2011–2020), con plazo de 12 meses o más.</p>
    </div>
  );
}
