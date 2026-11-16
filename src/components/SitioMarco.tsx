import Link from "next/link";
import Logo from "@/components/Logo";
import { TALLER } from "@/lib/turnos";
import { INSTAGRAM, WA_CONSULTA, externo } from "@/lib/sitio";

// Cabecera y pie de las páginas públicas (Inicio y Servicios). Estilos .lp en globals.css.

const SECCIONES = [
  { t: "Catálogo", u: "/vehiculos" },
  { t: "Permutas", u: "/simulador" },
  { t: "Financiación", u: "/financiacion" },
  { t: "Estética", u: "/servicios" },
];

export function SitioCabecera({ activa }: { activa?: string }) {
  return (
    <header className="lp-header">
      <div className="lp-wrap lp-header-in">
        <Link href="/" aria-label="ALEZZA - Inicio"><Logo alto={20} /></Link>
        <nav className="lp-nav" aria-label="Secciones">
          {SECCIONES.map((s) => (
            <Link key={s.u} href={s.u} aria-current={s.u === activa ? "page" : undefined}>{s.t}</Link>
          ))}
        </nav>
        <Link href="/turnos" className="lp-btn lp-btn-sm">Pedir turno</Link>
      </div>
    </header>
  );
}

export function SitioPie({ ubicacion, horario }: { ubicacion: string; horario?: string }) {
  return (
    <footer className="lp-footer">
      <div className="lp-wrap lp-footer-in">
        <p>{[ubicacion, horario?.replace(/\s*\n\s*/g, " · ")].filter(Boolean).join(" · ")}</p>
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
