import Link from "next/link";
import AntesDespues from "@/components/AntesDespues";
import Revelar from "@/components/Revelar";
import { SitioCabecera, SitioPie, Titular } from "@/components/SitioMarco";
import { AREAS } from "@/lib/ecosistema";
import { contacto, datosSitio, trabajosPublicos } from "@/lib/sitio";
import { PLANES, SERVICIOS, precioPlan } from "@/lib/turnos";

export const dynamic = "force-dynamic";

// Inicio de ALEZZA: el ecosistema del auto en un solo lugar.
// Primera pantalla: la propuesta y la guía "¿Qué necesitás resolver?" (cada problema lleva a su servicio).
// Debajo: qué resuelve cada servicio, en detalle, y el taller de detail con precios y turno.
// Estilos en globals.css (.lp).
export default async function Home() {
  const [{ perfil, config }, trabajos] = await Promise.all([datosSitio(), trabajosPublicos()]);
  const trabajo = trabajos[0];

  return (
    <main className="lp">
      <div className="lp-pantalla">
        <SitioCabecera />

        <div className="lp-wrap lp-main">
          <div className="lp-dos">
            <section>
              <p className="lp-kicker lp-in">Asesoría automotor integral · Mar del Plata</p>
              <Titular lineas={["Todo lo de tu auto,", "en un solo lugar."]} desde={0} />
              <p className="lp-lead lp-in" style={{ animationDelay: "160ms" }}>
                Comprar, vender, permutar, financiar, cuidarlo y tener los papeles al día. Un solo equipo que te acompaña en cada paso.
              </p>
              <div className="lp-acciones lp-in" style={{ animationDelay: "220ms" }}>
                <Link href="/turnos" className="lp-btn">Pedir turno en el taller</Link>
                <a href="#servicios" className="lp-btn lp-btn-linea">Qué resuelve cada servicio</a>
              </div>
            </section>

            <nav className="lp-in" style={{ animationDelay: "120ms" }} aria-label="¿Qué necesitás resolver?">
              <p className="lp-kicker">¿Qué necesitás resolver?</p>
              <ul className="lp-lista lp-guia">
                {AREAS.map((a) => (
                  <li key={a.k}>
                    <Link href={a.href} className="lp-fila lp-fila-guia">
                      <span>
                        <h2>“{a.problema}”</h2>
                        <p>{a.nombre}</p>
                      </span>
                      <span className="lp-ir" aria-hidden><span>→</span></span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
      </div>

      <section id="servicios" className="lp-wrap lp-seccion">
        <p className="lp-kicker">El ecosistema ALEZZA</p>
        <h2>Qué resuelve cada servicio</h2>
        <div className="lp-areas">
          {AREAS.map((a, i) => (
            <Revelar key={a.k} como="article" className="lp-detalle">
              <header>
                <span className="lp-num">{String(i + 1).padStart(2, "0")}</span>
                <h3>{a.nombre}</h3>
              </header>
              <p>{a.resuelve}</p>
              <dl>
                <div><dt>Es para vos si</dt><dd>{a.problema}</dd></div>
                <div><dt>Incluye</dt><dd><ul>{a.incluye.map((x) => <li key={x}>{x}</li>)}</ul></dd></div>
              </dl>
              <Link href={a.href} className="lp-ir">{a.accion} <span aria-hidden>→</span></Link>
            </Revelar>
          ))}
        </div>
      </section>

      <section className="lp-wrap lp-seccion">
        <p className="lp-kicker">Taller ALEZZA DETAIL</p>
        <h2>Estética vehicular, con turno online</h2>
        <div className={trabajo ? "lp-dos" : undefined}>
          {trabajo && <AntesDespues {...trabajo} className="ad-hero" />}
          <div className="lp-planes-col" aria-label="Planes de estética, precios en pesos">
            {PLANES.map((p) => {
              const agencia = p.k === "agencia";
              return (
                <Link key={p.k} href={agencia ? contacto("agencia") : `/turnos?servicio=${p.k}`} className="lp-plan">
                  <span>
                    <h3>{SERVICIOS[p.k]}</h3>
                    <p>{p.d}</p>
                  </span>
                  <span className="lp-plan-der">
                    <span className="lp-precio">{precioPlan(config, p.k)}</span>
                    <span className="lp-ir">{agencia ? "Coordinar" : "Pedir turno"} <span aria-hidden>→</span></span>
                  </span>
                </Link>
              );
            })}
            <Link href="/servicios" className="lp-ir">Ver todos los servicios y cuál elegir <span aria-hidden>→</span></Link>
          </div>
        </div>
      </section>

      <SitioPie ubicacion={perfil.location} horario={perfil.business_hours} />
    </main>
  );
}
