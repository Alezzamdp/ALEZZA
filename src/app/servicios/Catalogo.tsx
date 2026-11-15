"use client";

import { useEffect, useState } from "react";
import Carrusel from "@/components/Carrusel";
import { supabase } from "@/lib/supabase";

// Trabajos marcados en el Taller para mostrar: antes y después, con un deslizador para comparar.
type Trabajo = { id: string; titulo: string; trabajos: string[]; antes: string[]; despues: string[] };
type Tarjeta = { id: string; titulo: string; trabajos: string[]; antes: string; despues: string };

export default function Catalogo() {
  const [items, setItems] = useState<Tarjeta[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("trabajos_publicos");
      const lista = (data ?? []) as Trabajo[];
      if (!lista.length) return;
      const rutas = lista.flatMap((t) => [t.antes[0], t.despues[0]]);
      const { data: firmadas } = await supabase.storage.from("orden-fotos").createSignedUrls(rutas, 3600);
      const url = new Map((firmadas ?? []).map((f) => [f.path, f.signedUrl]));
      setItems(lista.flatMap((t) => {
        const antes = url.get(t.antes[0]), despues = url.get(t.despues[0]);
        return antes && despues ? [{ id: t.id, titulo: t.titulo, trabajos: t.trabajos, antes, despues }] : [];
      }));
    })();
  }, []);

  if (!items.length) return null;

  return (
    <section className="mx-auto max-w-6xl px-6 py-12">
      <h2 className="text-2xl font-bold">Antes y después <span className="font-mono text-sm font-normal text-gray-500">trabajos reales del taller</span></h2>
      <div className="mt-6">
        <Carrusel etiqueta="Trabajos antes y después">
          {items.map((t) => <Comparador key={t.id} {...t} />)}
        </Carrusel>
      </div>
    </section>
  );
}

function Comparador({ titulo, trabajos, antes, despues }: Tarjeta) {
  const [p, setP] = useState(50);
  return (
    <figure className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="relative aspect-[4/3] select-none overflow-hidden bg-gray-100">
        {/* eslint-disable @next/next/no-img-element -- URLs firmadas y temporales de un bucket privado */}
        <img src={despues} alt={`${titulo}, después`} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
        <img src={antes} alt={`${titulo}, antes`} className="absolute inset-0 h-full w-full object-cover" loading="lazy" style={{ clipPath: `inset(0 ${100 - p}% 0 0)` }} />
        {/* eslint-enable @next/next/no-img-element */}
        <span className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow-[0_0_0_1px_rgba(0,0,0,.15)]" style={{ left: `${p}%` }}>
          <span className="absolute left-1/2 top-1/2 grid h-8 w-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[#17150f] text-xs text-[#f3efe6]">⇆</span>
        </span>
        <span className="pointer-events-none absolute left-2 top-2 rounded bg-black/65 px-2 py-0.5 font-mono text-[11px] uppercase tracking-wider text-[#f3efe6]">Antes</span>
        <span className="pointer-events-none absolute right-2 top-2 rounded bg-[#d4a017] px-2 py-0.5 font-mono text-[11px] uppercase tracking-wider text-[#17150f]">Después</span>
        <input type="range" min={0} max={100} value={p} onChange={(e) => setP(Number(e.target.value))} aria-label={`Comparar antes y después: ${titulo}`}
          className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0" />
      </div>
      <figcaption className="p-4">
        <p className="font-semibold">{titulo}</p>
        {trabajos.length > 0 && <p className="mt-1 text-sm text-gray-600">{trabajos.join(" · ")}</p>}
      </figcaption>
    </figure>
  );
}
