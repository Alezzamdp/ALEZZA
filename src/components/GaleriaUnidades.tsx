"use client";

import dynamic from "next/dynamic";
import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";

// Mostrador de unidades preparadas en el taller (AccordionGallery de React Bits). Pensado primero para celular: ahí se apila en
// vertical y se abre la foto tocada; en pantallas anchas es una fila. El alto se calcula para que la foto abierta quede en 3:2 y se
// vea el auto entero. Las fotos (public/fotos) están igualadas en color y recortadas 3:2. El mostrador y GSAP se cargan recién
// cuando la sección está por entrar en pantalla.
const Mostrador = dynamic(() => import("@/components/AccordionGallery"), { ssr: false });

// Nombres de las unidades de las fotos (confirmar con el taller si cambian).
const FOTOS = [
  { image: "/fotos/unidad-4.webp", label: "Chevrolet Tracker", alt: "Chevrolet Tracker bordó frente al taller ALEZZA" },
  { image: "/fotos/unidad-3.webp", label: "Volkswagen Vento", alt: "Volkswagen Vento blanco frente al taller ALEZZA" },
  { image: "/fotos/unidad-2.webp", label: "Volkswagen Passat CC", alt: "Volkswagen Passat CC con las puertas abiertas frente al taller ALEZZA" },
  { image: "/fotos/unidad-1.webp", label: "Volkswagen Suran", alt: "Volkswagen Suran negra frente al taller ALEZZA" },
  { image: "/fotos/unidad-5.webp", label: "Volkswagen Gol Trend", alt: "Volkswagen Gol Trend gris frente al taller ALEZZA" },
];
const GAP = 10;
const ASPECTO = 1.5; // foto abierta en 3:2

export default function GaleriaUnidades() {
  const caja = useRef<HTMLDivElement>(null);
  const [estado, setEstado] = useState({ cerca: false, ancho: 0 });

  useEffect(() => {
    const el = caja.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setEstado((s) => ({ ...s, cerca: true })); io.disconnect(); } }, { rootMargin: "300px 0px" });
    const ro = new ResizeObserver(() => setEstado((s) => ({ ...s, ancho: el.clientWidth })));
    io.observe(el);
    ro.observe(el);
    return () => { io.disconnect(); ro.disconnect(); };
  }, []);

  const vertical = estado.ancho > 0 && estado.ancho < 600;
  const ratio = vertical ? 0.5 : 0.62;
  const ancho = estado.ancho || 360;
  // Alto total para que el panel abierto tenga proporción 3:2: ancho completo en vertical, o la parte del ratio en horizontal.
  const abiertoAncho = vertical ? ancho : (ancho - GAP * (FOTOS.length - 1)) * ratio;
  const abiertoAlto = abiertoAncho / ASPECTO;
  const alto = vertical ? Math.round(abiertoAlto / ratio + GAP * (FOTOS.length - 1)) : Math.max(260, Math.round(abiertoAlto));

  return (
    <div ref={caja} className="lp-galeria" style={{ minHeight: alto, "--galeria-alto": `${alto}px` } as CSSProperties}>
      {estado.cerca && (
        <Mostrador
          items={FOTOS}
          defaultIndex={2}
          expandRatio={ratio}
          orientation={vertical ? "vertical" : "horizontal"}
          height={vertical ? alto / 1.6 : alto}
          gap={GAP}
          radius={vertical ? 14 : 18}
          trigger="hover"
          parallax={0}
          tilt={vertical ? 0 : 5}
          grayscale={false}
          dim={0.22}
          accentColor="#ff2e93"
          overlayColor="#0a0a0a"
          ariaLabel="Unidades preparadas en el taller"
        />
      )}
    </div>
  );
}
