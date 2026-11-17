"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import PixelBlast from "@/components/PixelBlast";

// Fondo de píxeles de todo el sitio público (PixelBlast de React Bits), detrás del contenido y sin tapar clics.
// Se monta una sola vez en el layout, así no se reinicia al cambiar de página. Sigue el modo claro/oscuro
// y no aparece en BRUNO OS ni en el panel. Estilos en globals.css (.fondo-pixeles).
export default function FondoPixeles() {
  const ruta = usePathname();
  const [oscuro, setOscuro] = useState<boolean | null>(null);

  useEffect(() => {
    const leer = () => setOscuro(document.documentElement.dataset.tema !== "claro");
    leer();
    const observador = new MutationObserver(leer);
    observador.observe(document.documentElement, { attributes: true, attributeFilter: ["data-tema"] });
    return () => observador.disconnect();
  }, []);

  if (oscuro === null || ruta.startsWith("/admin") || ruta.startsWith("/os")) return null;

  return (
    <div className="fondo-pixeles" aria-hidden>
      <PixelBlast
        key={oscuro ? "oscuro" : "claro"}
        variant="square"
        pixelSize={4}
        color={oscuro ? "#ffffff" : "#0a0a0a"}
        lightMode={!oscuro}
        patternScale={2.2}
        patternDensity={0.9}
        softness={0.6}
        glow={0.25}
        twinkle={0.15}
        speed={0.3}
        drift={0.15}
        hoverEffect="reveal"
        hoverRadius={120}
        enableRipples
        edgeFade={0.2}
        dpr={1.5}
      />
    </div>
  );
}
