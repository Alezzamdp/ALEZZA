"use client";

import { usePathname } from "next/navigation";
import PixelBlast from "@/components/PixelBlast";
import { useOscuro } from "@/lib/useTema";

// Fondo animado y minimalista de todo el sitio público (PixelBlast de React Bits): píxeles rosas que se mueven despacio y se
// encienden cerca del cursor. Sigue el modo claro/oscuro que elige quien visita. Va detrás del contenido y sin tapar clics;
// se monta una sola vez en el layout (no se reinicia al cambiar de página) y no aparece en BRUNO OS ni en el panel.
// La legibilidad del texto se cuida en globals.css (.fondo-pixeles): opacidad baja y más tenue en el centro.
export default function FondoPixeles() {
  const ruta = usePathname();
  const oscuro = useOscuro();
  if (oscuro === null || ruta.startsWith("/admin") || ruta.startsWith("/os")) return null;

  return (
    <div className="fondo-pixeles" aria-hidden>
      <PixelBlast
        variant="square"
        pixelSize={4}
        color="#ff2e93"
        lightMode={!oscuro}
        patternScale={2.2}
        patternDensity={0.8}
        softness={0.6}
        glow={0.15}
        twinkle={0.1}
        speed={0.25}
        drift={0.12}
        hoverEffect="reveal"
        hoverRadius={110}
        enableRipples={false}
        edgeFade={0.2}
        dpr={1.5}
      />
    </div>
  );
}
