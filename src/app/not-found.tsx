import Link from "next/link";
import Logo from "@/components/Logo";

export default function NoEncontrada() {
  return (
    <main className="lp lp-pantalla">
      <div className="lp-wrap lp-main" style={{ justifyItems: "start" }}>
        <section>
          <Logo alto={20} />
          <h1>Esta página no existe.</h1>
          <p className="lp-lead">El enlace puede estar vencido o mal escrito.</p>
          <div className="lp-acciones">
            <Link href="/" className="lp-btn">Ir al inicio</Link>
            <Link href="/vehiculos" className="lp-btn lp-btn-linea">Ver catálogo</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
