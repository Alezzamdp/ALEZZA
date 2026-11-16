import Cargando from "@/components/Cargando";

// Carga del sitio público: mismo fondo que las páginas, sin frases de BRUNO OS.
export default function Loading() {
  return <main className="lp lp-pantalla" style={{ justifyContent: "center" }}><Cargando frase="Cargando…" /></main>;
}
