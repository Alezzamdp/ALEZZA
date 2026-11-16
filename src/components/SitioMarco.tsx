import Link from "next/link";
import type { ReactNode } from "react";
import Logo from "@/components/Logo";
import { TALLER } from "@/lib/turnos";
import { INSTAGRAM, UBICACION, WA_CONSULTA, externo } from "@/lib/contacto";

// Cabecera y pie de todos los portales públicos. Estilos .lp en globals.css.

const SECCIONES = [
  { t: "Catálogo", u: "/vehiculos" },
  { t: "Permutas", u: "/simulador" },
  { t: "Financiación", u: "/financiacion" },
  { t: "Estética", u: "/servicios" },
];

// accion: reemplaza el botón "Pedir turno" (por ejemplo, el WhatsApp con los datos del turno).
export function SitioCabecera({ activa, accion }: { activa?: string; accion?: ReactNode }) {
  return (
    <header className="lp-header">
      <div className="lp-wrap lp-header-in">
        <Link href="/" aria-label="ALEZZA - Inicio"><Logo alto={20} /></Link>
        <nav className="lp-nav" aria-label="Secciones">
          {SECCIONES.map((s) => (
            <Link key={s.u} href={s.u} aria-current={s.u === activa ? "page" : undefined}>{s.t}</Link>
          ))}
        </nav>
        {accion ?? <Link href="/turnos" className="lp-btn lp-btn-sm">Pedir turno</Link>}
      </div>
    </header>
  );
}

export function SitioPie({ ubicacion, horario }: { ubicacion?: string; horario?: string }) {
  return (
    <footer className="lp-footer">
      <div className="lp-wrap lp-footer-in">
        <p>{[ubicacion || UBICACION, horario?.replace(/\s*\n\s*/g, " · ")].filter(Boolean).join(" · ")}</p>
        <nav aria-label="Contacto">
          <a href={WA_CONSULTA} {...externo}>WhatsApp 223 421-2621</a>
          <a href={INSTAGRAM} {...externo}>Instagram</a>
          <a href={TALLER.maps} {...externo}>Cómo llegar</a>
        </nav>
        <p>© {new Date().getFullYear()} ALEZZA</p>
      </div>
    </footer>
  );
}
