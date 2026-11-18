"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

// El mapa (Leaflet) está al final de la página: se carga recién cuando está por entrar en pantalla, para que el arranque pese menos.
const MapaTaller = dynamic(() => import("@/components/MapaTaller"), { ssr: false });

export default function MapaDiferido({ alto = 300 }: { alto?: number }) {
  const caja = useRef<HTMLDivElement>(null);
  const [cerca, setCerca] = useState(false);

  useEffect(() => {
    const el = caja.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setCerca(true); io.disconnect(); } }, { rootMargin: "400px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return <div ref={caja} className="lp-mapa" style={{ minHeight: alto }}>{cerca && <MapaTaller alto={alto} />}</div>;
}
