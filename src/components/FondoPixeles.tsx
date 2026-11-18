"use client";

import { usePathname } from "next/navigation";
import PixelBlast from "@/components/PixelBlast";

// Fondo rosa de píxeles de todo el sitio público (PixelBlast de React Bits), detrás del contenido y sin tapar clics.
// Se monta una sola vez en el layout, así no se reinicia al cambiar de página; no aparece en BRUNO OS ni en el panel.
// La legibilidad del texto se cuida en globals.css (.fondo-pixeles): opacidad baja y más tenue en el centro.
export default function FondoPixeles() {
  const ruta = usePathname();
  if (ruta.startsWith("/admin") || ruta.startsWith("/os")) return null;

  return (
    <div className="fondo-pixeles" aria-hidden>
      <PixelBlast
        variant="square"
        pixelSize={4}
        color="#ff2e93"
        patternScale={2.2}
        patternDensity={0.8}
        softness={0.6}
        glow={0.15}
        twinkle={0.1}
        speed={0.25}
        drift={0.12}
        hoverEffect="none"
        enableRipples={false}
        edgeFade={0.2}
        dpr={1.5}
      />
    </div>
  );
}
