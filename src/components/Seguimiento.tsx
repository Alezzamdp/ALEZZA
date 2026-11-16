import type { Avance, EstadoOrden } from "@/lib/turnos";

// Lo que el cliente ve de su auto en el taller: etapa y checklist de trabajos.
// Se refresca solo desde la página que lo muestra (turno o seguimiento).
const ETAPAS: { t: string; estados: EstadoOrden[] }[] = [
  { t: "Recibido", estados: ["presupuesto", "aprobado"] },
  { t: "En trabajo", estados: ["en_trabajo"] },
  { t: "Listo para retirar", estados: ["listo"] },
  { t: "Entregado", estados: ["entregado"] },
];

export default function Seguimiento({ avance }: { avance: Avance }) {
  const etapa = ETAPAS.findIndex((e) => e.estados.includes(avance.estado));
  const hechos = avance.trabajos.filter((t) => t.hecho).length;
  const pct = avance.trabajos.length ? Math.round((hechos / avance.trabajos.length) * 100) : 0;

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-6" aria-live="polite">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl font-bold">Tu auto en el taller</h2>
        <span className="font-mono text-xs text-gray-500">
          Orden #{avance.numero} · actualizado {new Date(avance.updated_at).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}
        </span>
      </div>
      {avance.vehiculo && <p className="mt-1 text-gray-600">{avance.vehiculo}{avance.patente && <> · <span className="font-mono">{avance.patente}</span></>}</p>}

      <ol className="mt-5 grid grid-cols-4 gap-1">
        {ETAPAS.map((e, i) => (
          <li key={e.t} className="grid gap-1.5">
            <span className={`h-1.5 rounded-full ${i <= etapa ? "bg-[var(--tinta)]" : "bg-gray-200"} ${i === etapa && etapa < 3 ? "animate-pulse" : ""}`} />
            <span className={`text-xs ${i === etapa ? "font-semibold" : "text-gray-500"}`}>{e.t}</span>
          </li>
        ))}
      </ol>

      {avance.trabajos.length > 0 && (
        <>
          <div className="mt-6 flex items-center justify-between text-sm">
            <span className="font-medium">Checklist de trabajos</span>
            <span className="font-mono">{hechos}/{avance.trabajos.length} · {pct}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-[var(--mostaza)] transition-[width] duration-700" style={{ width: `${pct}%` }} />
          </div>
          <ul className="mt-4 grid gap-2">
            {avance.trabajos.map((t, i) => (
              <li key={i} className="flex items-center gap-3">
                <span aria-hidden className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border text-xs transition ${t.hecho ? "border-[var(--tinta)] bg-[var(--tinta)] text-white" : "border-gray-300"}`}>{t.hecho ? "✓" : ""}</span>
                <span className={t.hecho ? "text-gray-500 line-through" : ""}>{t.t}</span>
                <span className="sr-only">{t.hecho ? "hecho" : "pendiente"}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      {!!avance.notas?.length && (
        <div className="mt-6">
          <p className="text-sm font-medium">Novedades del taller</p>
          <ul className="mt-2 grid gap-2">
            {avance.notas.map((n, i) => (
              <li key={i} className="rounded-md border-l-2 border-[var(--mostaza)] bg-gray-50 px-3 py-2">
                <p className="whitespace-pre-line text-sm">{n.texto}</p>
                <p className="mt-1 font-mono text-[11px] text-gray-500">{new Date(n.en).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
      {avance.estado === "listo" && <p className="mt-5 rounded-md bg-[var(--tinta)] px-4 py-3 font-semibold text-[var(--papel)]">¡Tu auto está listo para retirar!</p>}
    </section>
  );
}
