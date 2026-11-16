import type { Metadata } from "next";
import Link from "next/link";
import MapaTaller from "@/components/MapaTaller";
import Revelar from "@/components/Revelar";
import { SitioCabecera, SitioPie, Titular } from "@/components/SitioMarco";
import { contacto, datosSitio, trabajosPublicos } from "@/lib/sitio";
import { DETALLE_EXTRAS, ELEGILO_SI, PLANES, SERVICIOS, precioPlan, type Extra } from "@/lib/turnos";
import Catalogo from "./Catalogo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Estética automotriz · ALEZZA Mar del Plata",
  description: "Preparación base, preparación integral, servicios individuales y planes para agencias. Estética automotriz en Mar del Plata, con turno online.",
  openGraph: {
    title: "ALEZZA — Tu auto vale más cuando se ve.",
    description: "Preparación de unidades para particulares, vendedores y agencias en Mar del Plata.",
  },
};

const PASOS = ["Pedís turno y señás online", "Evaluamos la unidad", "Trabajamos en el taller", "Retirás el auto listo"];

// Primera pantalla: propuesta, proceso y los tres planes con precio. Debajo, cada servicio en detalle,
// los trabajos reales (antes y después) y el mapa del taller.
export default async function Servicios() {
  const [{ perfil, config }, trabajos] = await Promise.all([datosSitio(), trabajosPublicos()]);

  return (
    <main className="lp">
      <div className="lp-pantalla">
        <SitioCabecera />

        <div className="lp-wrap lp-main">
          <div className="lp-dos">
            <section>
              <p className="lp-kicker lp-in">Estética automotriz · Mar del Plata</p>
              <Titular lineas={["Tu auto vale más", "cuando se ve."]} desde={0} />
              <p className="lp-lead lp-in" style={{ animationDelay: "160ms" }}>
                Preparamos unidades para vender mejor y más rápido: particulares, vendedores y agencias que necesitan rotar stock.
              </p>
              <div className="lp-acciones lp-in" style={{ animationDelay: "220ms" }}>
                <Link href="/turnos" className="lp-btn">Pedir turno</Link>
                <a href="#elegir" className="lp-btn lp-btn-linea">¿Cuál elijo?</a>
              </div>
              <ol className="lp-pasos lp-in" style={{ animationDelay: "280ms" }} aria-label="Cómo trabajamos">
                {PASOS.map((p, i) => (
                  <li key={p}><span className="lp-num">{String(i + 1).padStart(2, "0")}</span>{p}</li>
                ))}
              </ol>
            </section>

            <section className="lp-fichas" aria-label="Planes y precios en pesos">
              {PLANES.map((p, i) => {
                const agencia = p.k === "agencia";
                return (
                  <article key={p.k} className="lp-ficha lp-in" style={{ animationDelay: `${120 + i * 50}ms` }}>
                    <div>
                      <p className="lp-num">{p.para}</p>
                      <h2>{SERVICIOS[p.k]}</h2>
                      <ul>{p.items.map((x) => <li key={x}>{x}</li>)}</ul>
                    </div>
                    <div className="lp-plan-der">
                      <span className="lp-precio">{precioPlan(config, p.k)}</span>
                      {agencia
                        ? <Link href={contacto("agencia")} className="lp-btn lp-btn-sm lp-btn-linea">Coordinar</Link>
                        : <Link href={`/turnos?servicio=${p.k}`} className="lp-btn lp-btn-sm">Pedir turno</Link>}
                    </div>
                  </article>
                );
              })}
            </section>
          </div>
        </div>
      </div>

      <section id="elegir" className="lp-wrap lp-seccion">
        <p className="lp-kicker">Guía para elegir</p>
        <h2>Qué resuelve cada plan</h2>
        <div className="lp-detalles">
          {PLANES.map((p, i) => {
            const agencia = p.k === "agencia";
            return (
              <Revelar key={p.k} como="article" className="lp-detalle">
                <header>
                  <span className="lp-num">{String(i + 1).padStart(2, "0")}</span>
                  <h3>{SERVICIOS[p.k]}</h3>
                  <span className="lp-precio">{precioPlan(config, p.k)}</span>
                </header>
                <p className="lp-elegilo"><b>Elegilo si:</b> {ELEGILO_SI[p.k]}</p>
                <p>{p.detalle}</p>
                <dl>
                  {p.etapas.map(([t, d]) => (
                    <div key={t}><dt>{t}</dt><dd>{d}</dd></div>
                  ))}
                </dl>
                {agencia
                  ? <Link href={contacto("agencia")} className="lp-ir">Coordinar por lote <span aria-hidden>→</span></Link>
                  : <Link href={`/turnos?servicio=${p.k}`} className="lp-ir">Pedir turno <span aria-hidden>→</span></Link>}
              </Revelar>
            );
          })}
        </div>
      </section>

      <section className="lp-wrap lp-seccion">
        <p className="lp-kicker">Para sumar o pedir por separado</p>
        <h2>Servicios individuales</h2>
        <ul className="lp-lista">
          {(Object.keys(DETALLE_EXTRAS) as Extra[]).map((k, i) => (
            <Revelar key={k} como="li">
              <Link href={`/turnos?extra=${k}`} className="lp-fila lp-fila-precio">
                <span className="lp-num">{String(i + 1).padStart(2, "0")}</span>
                <span>
                  <h3>{DETALLE_EXTRAS[k][0]}</h3>
                  <p>{DETALLE_EXTRAS[k][1]}</p>
                  <p><b>Elegilo si:</b> {ELEGILO_SI[k].charAt(0).toLowerCase() + ELEGILO_SI[k].slice(1)}</p>
                </span>
                <span className="lp-precio">{precioPlan(config, k)}</span>
                <span className="lp-ir">Pedir turno <span aria-hidden>→</span></span>
              </Link>
            </Revelar>
          ))}
        </ul>
      </section>

      <Catalogo items={trabajos} />

      <section className="lp-wrap lp-seccion">
        <p className="lp-kicker">Taller ALEZZA DETAIL</p>
        <h2>Dónde estamos</h2>
        <MapaTaller alto={320} />
      </section>

      <SitioPie ubicacion={perfil.location} horario={perfil.business_hours} />
    </main>
  );
}
