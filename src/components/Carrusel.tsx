"use client";

import { Children, type ReactNode, useRef, useState } from "react";

// Carrusel deslizable: se arrastra con el dedo (scroll-snap nativo), con flechas o con los puntos.
export default function Carrusel({ children, ancho = "min(86%, 380px)", etiqueta }: { children: ReactNode; ancho?: string; etiqueta: string }) {
  const pista = useRef<HTMLDivElement>(null);
  const [actual, setActual] = useState(0);
  const items = Children.toArray(children);

  const paso = () => (pista.current?.firstElementChild as HTMLElement | null)?.offsetWidth ?? 300;
  const ir = (i: number) => pista.current?.scrollTo({ left: i * (paso() + 20), behavior: "smooth" });

  return (
    <div className="relative" role="region" aria-roledescription="carrusel" aria-label={etiqueta}>
      <div ref={pista} onScroll={(e) => setActual(Math.round(e.currentTarget.scrollLeft / (paso() + 20)))}
        className="carrusel flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth pb-2">
        {items.map((c, i) => (
          <div key={i} className="shrink-0 snap-start transition-transform duration-300" style={{ width: ancho }} aria-roledescription="diapositiva" aria-label={`${i + 1} de ${items.length}`}>
            {c}
          </div>
        ))}
      </div>
      {items.length > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <button type="button" onClick={() => ir(Math.max(0, actual - 1))} disabled={actual === 0} aria-label="Anterior"
            className="grid h-9 w-9 place-items-center rounded-full border border-gray-300 transition hover:bg-[var(--tinta)] hover:text-white disabled:opacity-30">←</button>
          <div className="flex gap-1.5">
            {items.map((_, i) => (
              <button key={i} type="button" onClick={() => ir(i)} aria-label={`Ir a ${i + 1}`} aria-current={i === actual}
                className={`h-2 rounded-full transition-all duration-300 ${i === actual ? "w-6 bg-[var(--tinta)]" : "w-2 bg-gray-300"}`} />
            ))}
          </div>
          <button type="button" onClick={() => ir(Math.min(items.length - 1, actual + 1))} disabled={actual >= items.length - 1} aria-label="Siguiente"
            className="grid h-9 w-9 place-items-center rounded-full border border-gray-300 transition hover:bg-[var(--tinta)] hover:text-white disabled:opacity-30">→</button>
        </div>
      )}
    </div>
  );
}
