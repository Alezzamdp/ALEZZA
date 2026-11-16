"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type CSSProperties, useEffect, useState } from "react";
import { TALLER } from "@/lib/turnos";
import { INSTAGRAM, WA_CONSULTA, externo } from "@/lib/contacto";

// Menú escalonado del sitio público: dos capas entran desde la derecha, después el panel,
// y los renglones suben de a uno. Sin librerías: transiciones CSS (estilos .sm-* en globals.css).

const ITEMS = [
  { t: "Inicio", u: "/" },
  { t: "Estética", u: "/servicios" },
  { t: "Catálogo", u: "/vehiculos" },
  { t: "Financiación", u: "/financiacion" },
  { t: "Pedir turno", u: "/turnos" },
];

export default function SitioMenu() {
  const ruta = usePathname();
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    if (!abierto) return;
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") setAbierto(false); };
    document.addEventListener("keydown", tecla);
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", tecla);
      document.documentElement.style.overflow = "";
    };
  }, [abierto]);

  return (
    <div className="sm" data-abierto={abierto || undefined}>
      <button type="button" className="sm-toggle" aria-expanded={abierto} aria-controls="sm-panel" onClick={() => setAbierto((a) => !a)}>
        <span className="sm-toggle-txt" aria-hidden>
          <span>Menú</span>
          <span>Cerrar</span>
        </span>
        <span className="sr-only">{abierto ? "Cerrar el menú" : "Abrir el menú"}</span>
        <span className="sm-icono" aria-hidden />
      </button>

      <div className="sm-fondo" onClick={() => setAbierto(false)} aria-hidden />
      <div className="sm-capa sm-capa-1" aria-hidden />
      <div className="sm-capa sm-capa-2" aria-hidden />
      <nav id="sm-panel" className="sm-capa sm-panel" aria-label="Secciones" inert={!abierto}>
        <ul className="sm-lista">
          {ITEMS.map((it, i) => (
            <li key={it.u}>
              <Link href={it.u} className="sm-item" style={{ "--i": i } as CSSProperties}
                aria-current={it.u === ruta ? "page" : undefined} onClick={() => setAbierto(false)}>
                <span className="sm-item-txt">{it.t}</span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="sm-contacto">
          <p>Contacto</p>
          <a href={WA_CONSULTA} {...externo}>WhatsApp</a>
          <a href={INSTAGRAM} {...externo}>Instagram</a>
          <a href={TALLER.maps} {...externo}>Cómo llegar</a>
        </div>
      </nav>
    </div>
  );
}
