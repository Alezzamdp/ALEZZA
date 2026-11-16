"use client";

import { useEffect, useState } from "react";

// Comparador de antes y después: se arrastra el divisor para ver el cambio.
// Con `barrido`, al cargar el divisor recorre la foto solo, para que se entienda que se puede mover.
export type TrabajoPublico = { id: string; titulo: string; trabajos: string[]; antes: string; despues: string };

export default function AntesDespues({ titulo, trabajos, antes, despues, barrido = false, className = "" }: TrabajoPublico & { barrido?: boolean; className?: string }) {
  const [p, setP] = useState(barrido ? 96 : 50);
  const [suave, setSuave] = useState(barrido);

  useEffect(() => {
    if (!barrido) return;
    const a = setTimeout(() => setP(50), 500);
    const b = setTimeout(() => setSuave(false), 2200);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [barrido]);

  return (
    <figure className={`ad ${suave ? "ad-suave" : ""} ${className}`}>
      <div className="ad-marco">
        {/* eslint-disable @next/next/no-img-element -- URLs firmadas y temporales de un bucket privado */}
        <img src={despues} alt={`${titulo}, después`} loading={barrido ? "eager" : "lazy"} />
        <img src={antes} alt={`${titulo}, antes`} loading={barrido ? "eager" : "lazy"} style={{ clipPath: `inset(0 ${100 - p}% 0 0)` }} />
        {/* eslint-enable @next/next/no-img-element */}
        <span className="ad-linea" style={{ left: `${p}%` }} aria-hidden><span>⇆</span></span>
        <span className="ad-chapa ad-chapa-izq" aria-hidden>Antes</span>
        <span className="ad-chapa ad-chapa-der" aria-hidden>Después</span>
        <input type="range" min={0} max={100} value={p} aria-label={`Comparar antes y después: ${titulo}`}
          onChange={(e) => { setSuave(false); setP(Number(e.target.value)); }} />
      </div>
      <figcaption>
        <b>{titulo}</b>
        {trabajos.length > 0 && <span>{trabajos.join(" · ")}</span>}
      </figcaption>
    </figure>
  );
}
