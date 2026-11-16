import Link from "next/link";
import { SitioCabecera, SitioPie } from "@/components/SitioMarco";
import { WA_AGENCIA, WA_CONSULTA, datosSitio, externo } from "@/lib/sitio";
import { PLANES, SERVICIOS, precioPlan } from "@/lib/turnos";

export const dynamic = "force-dynamic";

// Inicio de ALEZZA: una sola pantalla en escritorio, sin scroll. Propuesta a la izquierda,
// los cuatro servicios a la derecha y los planes de estética abajo; cada bloque con su acción.
// Estilos en globals.css (.lp).

const servicios = [
  { t: "Catálogo", d: "Unidades revisadas, listas para ver.", u: "/vehiculos", cta: "Ver unidades" },
  { t: "Permutas", d: "Tasación con referencias reales de mercado.", u: "/simulador", cta: "Tasar mi auto" },
  { t: "Financiación", d: "Cuotas en pesos, confirmadas por una persona.", u: "/financiacion", cta: "Calcular cuotas" },
  { t: "Estética", d: "Preparación de unidades, con turno online.", u: "/servicios", cta: "Ver servicios" },
];

export default async function Home() {
  const { perfil, config } = await datosSitio();
  const ubicacion = perfil.location || "Mar del Plata, Argentina";

  return (
    <main className="lp lp-pantalla">
      <SitioCabecera />

      <div className="lp-wrap lp-main">
        <div className="lp-dos">
          <section>
            <p className="lp-kicker lp-in">Asesoría automotor integral · Mar del Plata</p>
            <h1 className="lp-in" style={{ animationDelay: "80ms" }}>Autos seleccionados.<br />Operaciones claras.</h1>
            <p className="lp-lead lp-in" style={{ animationDelay: "160ms" }}>
              Compra, venta, permuta y preparación de unidades para particulares, vendedores y agencias. Cada operación la acompaña una persona.
            </p>
            <div className="lp-acciones lp-in" style={{ animationDelay: "240ms" }}>
              <Link href="/vehiculos" className="lp-btn">Ver catálogo</Link>
              <a href={WA_CONSULTA} {...externo} className="lp-btn lp-btn-linea">Escribir por WhatsApp</a>
            </div>
          </section>

          <nav className="lp-lista lp-in" style={{ animationDelay: "200ms" }} aria-label="Servicios">
            {servicios.map((s, i) => (
              <Link key={s.u} href={s.u} className="lp-fila">
                <span className="lp-num">{String(i + 1).padStart(2, "0")}</span>
                <span>
                  <h2>{s.t}</h2>
                  <p>{s.d}</p>
                </span>
                <span className="lp-ir">{s.cta} <span aria-hidden>→</span></span>
              </Link>
            ))}
          </nav>
        </div>

        <section className="lp-in" style={{ animationDelay: "320ms" }} aria-labelledby="estetica">
          <div className="lp-titulo">
            <h2 id="estetica" className="lp-kicker">Estética · precios en pesos</h2>
            <Link href="/servicios" className="lp-ir">Qué incluye cada plan <span aria-hidden>→</span></Link>
          </div>
          <div className="lp-planes">
            {PLANES.map((p) => {
              const agencia = p.k === "agencia";
              return (
                <a key={p.k} href={agencia ? WA_AGENCIA : `/turnos?servicio=${p.k}`} {...(agencia ? externo : {})} className="lp-plan">
                  <span>
                    <h3>{SERVICIOS[p.k]}</h3>
                    <p>{p.d}</p>
                  </span>
                  <span className="lp-plan-der">
                    <span className="lp-precio">{precioPlan(config, p.k)}</span>
                    <span className="lp-ir">{agencia ? "Coordinar" : "Pedir turno"} <span aria-hidden>→</span></span>
                  </span>
                </a>
              );
            })}
          </div>
        </section>
      </div>

      <SitioPie ubicacion={ubicacion} horario={perfil.business_hours} />
    </main>
  );
}
