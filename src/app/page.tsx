import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import CatalogoTrabajos from "@/components/CatalogoTrabajos";
import EstrellasFila from "@/components/EstrellasFila";
import GoogleEstrellas from "@/components/GoogleEstrellas";
import BarraMovil from "@/components/BarraMovil";
import GaleriaUnidades from "@/components/GaleriaUnidades";
import MapaDiferido from "@/components/MapaDiferido";
import { SitioCabecera, SitioPie, Titular } from "@/components/SitioMarco";
import { SEO_DESCRIPCION, SEO_TITULO, jsonLdNegocio, jsonLdPreguntas, jsonSeguro, preguntas } from "@/lib/seo";
import { contacto, datosSitio, trabajosPublicos } from "@/lib/sitio";
import { CASOS, DETALLE_EXTRAS, ETAPAS_INTEGRAL, PLANES, ahorroIntegral, pesos, precioPlan, valorSeparado, type Extra } from "@/lib/turnos";

export const dynamic = "force-dynamic";

// Título y descripción propios de la home para Google (el título es "absolute": no lleva el sufijo de las otras páginas).
export const metadata: Metadata = {
  title: { absolute: SEO_TITULO },
  description: SEO_DESCRIPCION,
  alternates: { canonical: "/" },
};

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
  const faq = preguntas(config);

  return (
    <main className="lp lp-con-barra">
      {/* Datos estructurados para Google: el negocio (con sus servicios y precios) y las preguntas frecuentes */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonSeguro(jsonLdNegocio(config)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonSeguro(jsonLdPreguntas(faq)) }} />
      <div className="lp-pantalla">
        <SitioCabecera />

        <div className="lp-wrap lp-main">
          <div className="lp-dos">
            <section>
              <p className="lp-kicker lp-in">ALEZZA DETAIL · Estética vehicular · Mar del Plata</p>
              <Titular lineas={["Tus autos listos", "para vender."]} />
              <p className="lp-lead lp-in" style={{ animationDelay: "160ms" }}>
                Taller de detail y estética vehicular en Mar del Plata. Preparamos el stock de agencias para que se publique mejor y rote más rápido.
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
          <figure className="lp-visual">
            <Image src="/fotos/detalle-faro.webp" width={600} height={800} sizes="(max-width: 760px) 200px, 240px" alt="Faro y paragolpes de un Volkswagen Vento blanco, limpios y con brillo" />
          </figure>
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

      {/* Servicios sueltos: foto chica al costado y la lista con precios (cada uno lleva a pedir turno con ese servicio) */}
      <section id="sueltos" className="lp-wrap lp-seccion">
        <p className="lp-kicker">Servicios sueltos</p>
        <h2>Si necesitás una sola cosa</h2>
        <p className="lp-intro">Pedí solo lo que tu auto necesita, con el precio a la vista.</p>
        <div className="lp-sueltos">
          <figure className="lp-sueltos-foto">
            <Image src="/fotos/detalle-interior.webp" width={600} height={800} sizes="60px" alt="" aria-hidden className="lp-sueltos-fondo" />
            <Image src="/fotos/detalle-interior.webp" width={600} height={800} sizes="(max-width: 560px) 128px, (max-width: 900px) 180px, 220px" alt="Interior de un Volkswagen Vento: volante, tablero y butacas de cuero" className="lp-sueltos-principal" />
          </figure>
          <ul className="lp-sueltos-lista">
            {(Object.keys(DETALLE_EXTRAS) as Extra[]).map((k) => (
              <li key={k}>
                <Link href={`/turnos?extra=${k}`} className="lp-suelto">
                  <span>
                    <b>{DETALLE_EXTRAS[k][0]}</b>
                    <small>{DETALLE_EXTRAS[k][1]}</small>
                  </span>
                  <span className="lp-precio">{precioPlan(config, k)}</span>
                </Link>
              </li>
            ))}
          </ul>
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

      {/* Quién está detrás del taller: Bruno, fundador */}
      <section id="equipo" className="lp-wrap lp-seccion">
        <div className="lp-persona">
          <Image src="/fotos/bruno-2.webp" width={800} height={800} sizes="(max-width: 760px) 60vw, 280px" className="lp-persona-foto" alt="Bruno, fundador de ALEZZA, frente al taller" />
          <div>
            <p className="lp-kicker">Quién está detrás</p>
            <h2>Soy Bruno, fundador de ALEZZA</h2>
            <p className="lp-persona-bio">Creé este proyecto a partir de mi experiencia en la compra y venta de vehículos, donde identifiqué la necesidad de ofrecer soluciones de estética pensadas para las agencias y las necesidades reales del mercado automotor.</p>
            <p className="lp-persona-bio">Hoy, con más de 30 operaciones comerciales y 70 servicios realizados, integro ambas experiencias en cada trabajo.</p>
            {/* Calificación como vendedor en Marketplace (se muestra el puntaje y la insignia, no la cantidad de reseñas) */}
            <div className="lp-calif" aria-label="Calificación como vendedor en Marketplace: 4,9 sobre 5">
              <div className="lp-calif-fila">
                <EstrellasFila tam={20} />
                <b>4,9</b>
                <span className="lp-insignia">Calificación alta</span>
              </div>
              <p className="lp-calif-texto">Calificación como vendedor en Marketplace</p>
            </div>
            <ul className="lp-cifras" aria-label="En números">
              <li><b>+30</b><span>operaciones comerciales</span></li>
              <li><b>+70</b><span>servicios realizados</span></li>
            </ul>
            <div className="lp-acciones">
              <Link href={contacto("agencia")} className="lp-btn">Hablar con Bruno</Link>
            </div>
          </div>
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

      {/* Preguntas frecuentes (también como FAQPage para Google) */}
      <section id="preguntas" className="lp-wrap lp-seccion">
        <p className="lp-kicker">Preguntas frecuentes</p>
        <h2>Todo sobre el detail de tu auto</h2>
        <div className="lp-faq">
          {faq.map((x) => (
            <details key={x.p}>
              <summary>{x.p}</summary>
              <p>{x.r}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Dónde estamos */}
      <section className="lp-wrap lp-seccion">
        <p className="lp-kicker">Taller ALEZZA DETAIL</p>
        <h2>Dónde estamos</h2>
        <MapaDiferido alto={300} />
      </section>

      <SitioPie ubicacion={perfil.location} horario={perfil.business_hours} />
      <BarraMovil />
    </main>
  );
}
