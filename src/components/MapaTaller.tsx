"use client";

import "leaflet/dist/leaflet.css";
import type { LayerGroup, Map as LMap } from "leaflet";
import { useEffect, useRef, useState } from "react";
import { TALLER } from "@/lib/turnos";

// Mapa real e interactivo del taller: modo oscuro, claro o satelital (mapas públicos de Esri, sin clave).
const ESRI = (s: string) => `https://server.arcgisonline.com/ArcGIS/rest/services/${s}/MapServer/tile/{z}/{y}/{x}`;
const CAPAS = {
  oscuro: { t: "Oscuro", fondo: ESRI("Canvas/World_Dark_Gray_Base"), nombres: ESRI("Canvas/World_Dark_Gray_Reference"), max: 16 },
  claro: { t: "Claro", fondo: ESRI("Canvas/World_Light_Gray_Base"), nombres: ESRI("Canvas/World_Light_Gray_Reference"), max: 16 },
  satelite: { t: "Satélite", fondo: ESRI("World_Imagery"), nombres: ESRI("Reference/World_Transportation"), max: 19 },
} as const;
const ATRIBUCION = "Mapas © Esri, HERE, Garmin, © OpenStreetMap";
type Capa = keyof typeof CAPAS;

// Fondo + nombres de calles; más allá del zoom nativo se agranda la última imagen.
const armar = (L: typeof import("leaflet"), c: Capa) => L.layerGroup([
  L.tileLayer(CAPAS[c].fondo, { attribution: ATRIBUCION, maxNativeZoom: CAPAS[c].max, maxZoom: 19 }),
  L.tileLayer(CAPAS[c].nombres, { maxNativeZoom: Math.min(CAPAS[c].max, 16), maxZoom: 19 }),
]);

export default function MapaTaller({ alto = 360 }: { alto?: number }) {
  const caja = useRef<HTMLDivElement>(null);
  const mapa = useRef<LMap | null>(null);
  const capa = useRef<LayerGroup | null>(null);
  const [modo, setModo] = useState<Capa>("oscuro");

  useEffect(() => {
    let vivo = true;
    import("leaflet").then((L) => {
      if (!vivo || !caja.current || mapa.current) return;
      const m = L.map(caja.current, { center: [TALLER.lat, TALLER.lng], zoom: 16, scrollWheelZoom: false, attributionControl: true });
      const pin = L.divIcon({ className: "pin-alezza", html: "<span></span>", iconSize: [28, 28], iconAnchor: [14, 28] });
      L.marker([TALLER.lat, TALLER.lng], { icon: pin, title: "ALEZZA DETAIL" }).addTo(m)
        .bindPopup("<b>ALEZZA DETAIL</b><br>Estética técnica automotriz");
      m.on("click", () => m.scrollWheelZoom.enable()); // la rueda hace zoom recién después de tocar el mapa
      mapa.current = m;
      capa.current = armar(L, "oscuro").addTo(m);
    });
    return () => { vivo = false; mapa.current?.remove(); mapa.current = null; };
  }, []);

  function cambiar(c: Capa) {
    setModo(c);
    import("leaflet").then((L) => {
      if (!mapa.current) return;
      capa.current?.remove();
      capa.current = armar(L, c).addTo(mapa.current);
    });
  }

  return (
    <figure className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="relative">
        <div ref={caja} style={{ height: alto }} className="z-0" aria-label="Mapa del taller ALEZZA DETAIL" role="region" />
        <div className="absolute right-3 top-3 z-[400] flex overflow-hidden rounded-md border border-black/20 bg-[#17150f]/90 text-xs font-semibold text-[#f3efe6] shadow-lg backdrop-blur">
          {(Object.keys(CAPAS) as Capa[]).map((c) => (
            <button key={c} type="button" onClick={() => cambiar(c)} aria-pressed={modo === c}
              className={`px-3 py-1.5 transition ${modo === c ? "bg-[#d4a017] text-[#17150f]" : "hover:bg-white/10"}`}>
              {CAPAS[c].t}
            </button>
          ))}
        </div>
      </div>
      <figcaption className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <p className="font-semibold">ALEZZA DETAIL · Mar del Plata</p>
          <p className="text-sm text-gray-600">Taller de estética técnica automotriz</p>
        </div>
        <div className="flex gap-2">
          <a href={TALLER.comoLlegar} target="_blank" rel="noopener noreferrer" className="rounded-md bg-[var(--tinta)] px-4 py-2 text-sm font-semibold text-white">Cómo llegar</a>
          <a href={TALLER.maps} target="_blank" rel="noopener noreferrer" className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">Google Maps ↗</a>
        </div>
      </figcaption>
    </figure>
  );
}
