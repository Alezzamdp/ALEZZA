import Link from "next/link";
import AntesDespues from "@/components/AntesDespues";
import { SitioCabecera, SitioPie, Titular } from "@/components/SitioMarco";
import { WA_AGENCIA, datosSitio, externo, trabajosPublicos } from "@/lib/sitio";
import { PLANES, SERVICIOS, precioPlan } from "@/lib/turnos";

export const dynamic = "force-dynamic";

// Inicio de ALEZZA: una pantalla que vende sola. A la izquierda la propuesta para agencias y vendedores;
// a la derecha un trabajo real (antes y después); abajo, los planes con precio y acción.
// Estilos en globals.css (.lp).

const ARGUMENTOS = [
  ["Turnos por lote", "Varias unidades juntas, con prioridad en la agenda."],
  ["Mismo estándar", "Todas las unidades salen con la misma terminación."],
  ["Seguimiento en vivo", "Cada trabajo se sigue desde un enlace, paso a paso."],
];

export default async function Home() {
  const [{ perfil, config }, trabajos] = await Promise.all([datosSitio(), trabajosPublicos()]);
  const trabajo = trabajos[0];

  return (
    <main className="lp lp-pantalla">
      <SitioCabecera />

      <div className="lp-wrap lp-main">
        <div className="lp-dos">
          <section>
            <p className="lp-kicker lp-in">Estética automotriz · Mar del Plata</p>
            <Titular lineas={["Tu stock,", "listo para vender."]} desde={120} />
            <p className="lp-lead lp-in" style={{ animationDelay: "420ms" }}>
              Preparamos cada unidad para que se venda mejor y más rápido. Trabajamos con agencias, vendedores y particulares.
            </p>
            <div className="lp-acciones lp-in" style={{ animationDelay: "500ms" }}>
              <a href={WA_AGENCIA} {...externo} className="lp-btn">Soy agencia</a>
              <Link href="/servicios" className="lp-btn lp-btn-linea">Ver servicios y precios</Link>
            </div>
            <p className="lp-tambien lp-in" style={{ animationDelay: "580ms" }}>
              También:
              <Link href="/vehiculos" className="lp-ir">Catálogo de unidades <span aria-hidden>→</span></Link>
              <Link href="/financiacion" className="lp-ir">Financiación en pesos <span aria-hidden>→</span></Link>
            </p>
          </section>

          {trabajo ? (
            <AntesDespues {...trabajo} barrido className="ad-hero lp-in" />
          ) : (
            <ul className="lp-lista lp-in" style={{ animationDelay: "300ms" }}>
              {ARGUMENTOS.map(([t, d], i) => (
                <li key={t} className="lp-fila">
                  <span className="lp-num">{String(i + 1).padStart(2, "0")}</span>
                  <span><h2>{t}</h2><p>{d}</p></span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <section className="lp-planes lp-in" style={{ animationDelay: "660ms" }} aria-label="Planes de estética, precios en pesos">
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
        </section>
      </div>

      <SitioPie ubicacion={perfil.location} horario={perfil.business_hours} />
    </main>
  );
}
