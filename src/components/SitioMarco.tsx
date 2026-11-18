import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import Logo from "@/components/Logo";
import SitioMenu from "@/components/SitioMenu";
import { TALLER } from "@/lib/turnos";
import { UBICACION, externo } from "@/lib/contacto";

// Cabecera, pie y titular de todos los portales públicos. Estilos .lp en globals.css.
// El contacto (WhatsApp e Instagram) vive solo en /contacto: acá se enlaza, no se repite.

// accion: reemplaza el botón "Solicitar turno" (por ejemplo, "¿Dudas?" en la página de un turno).
export function SitioCabecera({ accion }: { activa?: string; accion?: ReactNode }) {
  return (
    <header className="lp-header">
      <div className="lp-wrap lp-header-in">
        <Link href="/" aria-label="ALEZZA - Inicio" className="lp-logo"><Logo alto={20} /></Link>
        <div className="lp-header-der">
          {accion ?? <Link href="/turnos" className="lp-btn lp-btn-sm">Solicitar turno</Link>}
          <SitioMenu />
        </div>
      </div>
    </header>
  );
}

// Titular que entra palabra por palabra. Cada elemento de `lineas` es un renglón.
export function Titular({ lineas, desde = 0 }: { lineas: string[]; desde?: number }) {
  let n = 0;
  return (
    <h1 className="lp-titular" aria-label={lineas.join(" ")}>
      {lineas.map((linea) => (
        <span key={linea} className="lp-linea" aria-hidden>
          {linea.split(" ").map((palabra) => (
            <span key={n} className="lp-pal"><span style={{ "--d": `${desde + n++ * 35}ms` } as CSSProperties}>{palabra}</span></span>
          ))}
        </span>
      ))}
    </h1>
  );
}

export function SitioPie({ ubicacion, horario }: { ubicacion?: string; horario?: string }) {
  return (
    <footer className="lp-footer">
      <div className="lp-wrap lp-footer-in">
        <p>{[ubicacion || UBICACION, horario?.replace(/\s*\n\s*/g, " · ")].filter(Boolean).join(" · ")}</p>
        <nav aria-label="Contacto y ubicación">
          <Link href="/contacto">Contacto</Link>
          <a href={TALLER.maps} {...externo}>Cómo llegar</a>
        </nav>
        <p>© {new Date().getFullYear()} ALEZZA</p>
      </div>
    </footer>
  );
}
