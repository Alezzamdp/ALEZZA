"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

// Mostrador de unidades preparadas en el taller (AccordionGallery de React Bits). Las fotos están igualadas en color y edición
// (public/fotos). El mostrador y GSAP se cargan recién cuando la sección está por entrar en pantalla, para no pesar en el arranque.
const Mostrador = dynamic(() => import("@/components/AccordionGallery"), { ssr: false });

// Nombres de las unidades de las fotos (confirmar con el taller si cambian).
const FOTOS = [
  { image: "/fotos/unidad-4.webp", label: "Chevrolet Tracker", alt: "Chevrolet Tracker bordó frente al taller ALEZZA" },
  { image: "/fotos/unidad-3.webp", label: "Volkswagen Vento", alt: "Volkswagen Vento blanco frente al taller ALEZZA" },
  { image: "/fotos/unidad-2.webp", label: "Volkswagen Passat CC", alt: "Volkswagen Passat CC con las puertas abiertas frente al taller ALEZZA" },
  { image: "/fotos/unidad-1.webp", label: "Volkswagen SpaceFox", alt: "Volkswagen SpaceFox negra frente al taller ALEZZA" },
  { image: "/fotos/unidad-5.webp", label: "Volkswagen Gol Trend", alt: "Volkswagen Gol Trend gris frente al taller ALEZZA" },
  { image: "/fotos/unidad-6.webp", label: "Passat CC, detalle", alt: "Lateral trasero de un Passat CC junto al cartel de ALEZZA" },
];

export default function GaleriaUnidades() {
  const caja = useRef<HTMLDivElement>(null);
  const [cerca, setCerca] = useState(false);

  useEffect(() => {
    const el = caja.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setCerca(true); io.disconnect(); } }, { rootMargin: "300px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={caja} className="lp-galeria">
      {cerca && (
        <Mostrador
          items={FOTOS}
          defaultIndex={2}
          expandRatio={0.5}
          height={520}
          gap={10}
          radius={18}
          trigger="hover"
          accentColor="#ff2e93"
          overlayColor="#0a0a0a"
          ariaLabel="Unidades preparadas en el taller"
        />
      )}
    </div>
  );
}
