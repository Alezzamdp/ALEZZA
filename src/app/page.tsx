import Link from "next/link";
import CatalogoTrabajos from "@/components/CatalogoTrabajos";
import GoogleEstrellas from "@/components/GoogleEstrellas";
import GaleriaUnidades from "@/components/GaleriaUnidades";
import MapaDiferido from "@/components/MapaDiferido";
import { SitioCabecera, SitioPie, Titular } from "@/components/SitioMarco";
import { contacto, datosSitio, trabajosPublicos } from "@/lib/sitio";
import { CASOS, ETAPAS_INTEGRAL, PLANES, ahorroIntegral, pesos, precioPlan, valorSeparado } from "@/lib/turnos";

export const dynamic = "force-dynamic";

// ALEZZA DETAIL: una sola página para vender el taller a agencias (Plan Agencias = Preparación integral) y atender a particulares
// (Preparación base). Cuatro bloques: la oferta de agencias, particulares, cómo trabajamos y dónde estamos.
// Negro, blanco y rosa. Estilos en globals.css (.lp).

const PASOS = [
  ["Nos contás tu stock", "Cuántas unidades por mes y qué necesitan."],
  ["Coordinamos por WhatsApp", "Acordamos tarifa, días y turnos por lote, con prioridad en el taller."],
  ["Trabajamos por lote", "Todas las unidades con la misma terminación."],
  ["Seguís cada unidad", "Un enlace por trabajo muestra qué se hizo y en qué etapa está."],
];

export default async function Home() {
  const [{ perfil, config }, trabajos] = await Promise.all([datosSitio(), trabajosPublicos()]);
  const base = PLANES[0];
  const integral = PLANES[1];
  const separado = valorSeparado(config);
  const ahorro = ahorroIntegral(config);

  return (
    <main className="lp">
      <div className="lp-pantalla">
        <SitioCabecera />

        <div className="lp-wrap lp-main">
          <div className="lp-dos">
            <section>
              <p className="lp-kicker lp-in">ALEZZA DETAIL · Estética vehicular · Mar del Plata</p>
              <Titular lineas={["Tus autos listos", "para vender."]} />
              <p className="lp-lead lp-in" style={{ animationDelay: "160ms" }}>
                Taller de estética vehicular en Mar del Plata. Preparamos el stock de agencias para que se publique mejor y rote más rápido.
              </p>
              <div className="lp-acciones lp-in" style={{ animationDelay: "220ms" }}>
                <Link href={contacto("agencia")} className="lp-btn">Coordinar con mi agencia</Link>
                <Link href="/turnos" className="lp-btn lp-btn-linea">Solicitar turno</Link>
              </div>
              <GoogleEstrellas className="lp-in" />
            </section>

            {/* Plan Agencias = Preparación integral: la oferta principal */}
            <article id="plan" className="lp-card lp-card-top lp-in" style={{ animationDelay: "120ms" }}>
              <span className="lp-chip">Plan Agencias</span>
              <h2>Preparación integral</h2>
              <p className="lp-resuelve"><b>Resuelve:</b> {CASOS.agencia.problema}</p>
              <ul>
                {integral.items.map((x) => <li key={x}>{x}</li>)}
                <li>Turnos por lote, con prioridad</li>
              </ul>
              <div className="lp-precio-fila">
                <span className="lp-precio-top">{precioPlan(config, "puesta")}</span>
                <span className="lp-por">por unidad</span>
              </div>
              {ahorro !== null && separado !== null && (
                <p className="lp-ahorro">Ahorrás {pesos(ahorro)}: por separado costaría {pesos(separado)}</p>
              )}
              {separado !== null && (
                <details className="lp-det">
                  <summary>Ver qué incluye y cuánto cuesta por separado</summary>
                  <table>
                    <tbody>
                      {ETAPAS_INTEGRAL.map(([k, nombre]) => (
                        <tr key={k}><th scope="row">{nombre}</th><td>{precioPlan(config, k)}</td></tr>
                      ))}
                      <tr className="lp-det-suma"><th scope="row">Total por separado</th><td>{pesos(separado)}</td></tr>
                      <tr className="lp-det-top"><th scope="row">Preparación integral</th><td>{precioPlan(config, "puesta")}</td></tr>
                    </tbody>
                  </table>
                </details>
              )}
              <Link href="/turnos?servicio=puesta" className="lp-btn">Probar con una unidad</Link>
            </article>
          </div>
        </div>
      </div>

      {/* Particulares */}
      <section id="particulares" className="lp-wrap lp-seccion">
        <div className="lp-part">
          <div>
            <p className="lp-kicker">Para particulares</p>
            <h2>Preparación base</h2>
            <p className="lp-resuelve"><b>Resuelve:</b> {CASOS.lavado.problema}</p>
            <ul className="lp-checks">{base.items.map((x) => <li key={x}>{x}</li>)}</ul>
          </div>
          <div className="lp-part-der">
            <span className="lp-precio-top">{precioPlan(config, "lavado")}</span>
            <Link href="/turnos?servicio=lavado" className="lp-btn lp-btn-linea">Solicitar turno</Link>
          </div>
        </div>
      </section>

      {/* Cómo trabajamos con una agencia */}
      <section id="como" className="lp-wrap lp-seccion">
        <p className="lp-kicker">Alianza para agencias</p>
        <h2>Cómo trabajamos con tu agencia</h2>
        <p className="lp-intro">Una unidad sin preparar tarda más en venderse y se ve peor en la publicación. Nos ocupamos de que todo tu stock salga con el mismo nivel.</p>
        <ol className="lp-proceso">
          {PASOS.map(([t, d], i) => (
            <li key={t}>
              <span className="lp-num">{String(i + 1).padStart(2, "0")}</span>
              <b>{t}</b>
              <span>{d}</span>
            </li>
          ))}
        </ol>
        <div className="lp-acciones">
          <Link href={contacto("agencia")} className="lp-btn">Coordinar con mi agencia</Link>
        </div>
      </section>

      {/* Unidades que pasaron por el taller (fotos igualadas en color) */}
      <section id="unidades" className="lp-wrap lp-seccion">
        <p className="lp-kicker">Unidades preparadas</p>
        <h2>Así salen del taller</h2>
        <p className="lp-intro">Autos que pasaron por ALEZZA DETAIL. Pasá el mouse o tocá una foto para verla completa.</p>
        <GaleriaUnidades />
      </section>

      <CatalogoTrabajos items={trabajos} />

      {/* Dónde estamos */}
      <section className="lp-wrap lp-seccion">
        <p className="lp-kicker">Taller ALEZZA DETAIL</p>
        <h2>Dónde estamos</h2>
        <MapaDiferido alto={300} />
      </section>

      <SitioPie ubicacion={perfil.location} horario={perfil.business_hours} />
    </main>
  );
}
