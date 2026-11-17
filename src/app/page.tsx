import Link from "next/link";
import CatalogoTrabajos from "@/components/CatalogoTrabajos";
import GoogleEstrellas from "@/components/GoogleEstrellas";
import MapaTaller from "@/components/MapaTaller";
import Revelar from "@/components/Revelar";
import { SitioCabecera, SitioPie, Titular } from "@/components/SitioMarco";
import { contacto, datosSitio, trabajosPublicos } from "@/lib/sitio";
import {
  CASOS, DETALLE_EXTRAS, ELEGILO_SI, ETAPAS_INTEGRAL, PLANES, SERVICIOS, ahorroIntegral, pesos, precioPlan, valorSeparado, type Extra,
} from "@/lib/turnos";

export const dynamic = "force-dynamic";

// ALEZZA DETAIL: una sola página, pensada para vender el taller de estética vehicular y para buscar alianzas con agencias.
// Cada apartado dice qué es y qué problema resuelve. La Preparación integral es la opción recomendada en todos los precios.
// Estilos en globals.css (.lp).

const PASOS = [
  ["Pedís turno y señás online", "Elegís servicio y día en un minuto; la seña (50 %) se descuenta del total."],
  ["Evaluamos la unidad", "La revisamos al recibirla y te confirmamos qué necesita."],
  ["Trabajamos en el taller", "Seguís el avance en vivo desde un enlace, paso a paso."],
  ["Retirás el auto listo", "Te avisamos cuando está terminado y lo retirás en el taller."],
];

const ALIANZA = [
  ["Nos contás tu stock", "Cuántas unidades por mes y qué necesitan: lavado, pulido, motor, interior."],
  ["Acordamos tarifa y días", "Tarifa por volumen y turnos por lote, con prioridad en la agenda del taller."],
  ["Trabajamos por lote", "Todas las unidades con la misma terminación, al mismo estándar."],
  ["Seguís cada unidad", "Un enlace por trabajo muestra qué se hizo y en qué etapa está."],
];

export default async function Home() {
  const [{ perfil, config }, trabajos] = await Promise.all([datosSitio(), trabajosPublicos()]);
  const [base, integral, agencia] = [PLANES[0], PLANES[1], PLANES[2]];
  const separado = valorSeparado(config);
  const ahorro = ahorroIntegral(config);
  const dif = Number(config.precios.puesta) - Number(config.precios.lavado);
  const incluidos: Extra[] = ETAPAS_INTEGRAL.map(([k]) => k);

  return (
    <main className="lp">
      <div className="lp-pantalla">
        <SitioCabecera />

        <div className="lp-wrap lp-main">
          <div className="lp-dos">
            <section>
              <p className="lp-kicker lp-in">ALEZZA DETAIL · Estética vehicular · Mar del Plata</p>
              <Titular lineas={["Autos listos", "para vender."]} />
              <p className="lp-lead lp-in" style={{ animationDelay: "160ms" }}>
                Preparamos autos para que se vean como valen. Para agencias que quieren rotar su stock más rápido y para quien va a vender o quiere cuidar el suyo.
              </p>
              <div className="lp-acciones lp-in" style={{ animationDelay: "220ms" }}>
                <Link href="/turnos?servicio=puesta" className="lp-btn">Pedir turno</Link>
                <Link href={contacto("agencia")} className="lp-btn lp-btn-linea">Soy agencia</Link>
              </div>
              <GoogleEstrellas className="lp-in" />
            </section>

            <nav className="lp-in" style={{ animationDelay: "120ms" }} aria-label="¿Qué necesitás?">
              <p className="lp-kicker">¿Qué necesitás?</p>
              <ul className="lp-lista lp-guia">
                <li>
                  <Link href="/turnos?servicio=puesta" className="lp-fila lp-fila-guia">
                    <span><h2>“Voy a vender mi auto.”</h2><p>Preparación integral · {ahorro !== null ? `ahorrás ${pesos(ahorro)}` : "la recomendada"}</p></span>
                    <span className="lp-ir" aria-hidden><span>→</span></span>
                  </Link>
                </li>
                <li>
                  <Link href="/turnos?servicio=lavado" className="lp-fila lp-fila-guia">
                    <span><h2>“Quiero que quede limpio.”</h2><p>Preparación base</p></span>
                    <span className="lp-ir" aria-hidden><span>→</span></span>
                  </Link>
                </li>
                <li>
                  <a href="#por-separado" className="lp-fila lp-fila-guia">
                    <span><h2>“Necesito una sola cosa: pulido, motor o interior.”</h2><p>Servicios por separado</p></span>
                    <span className="lp-ir" aria-hidden><span>→</span></span>
                  </a>
                </li>
                <li>
                  <a href="#agencias" className="lp-fila lp-fila-guia">
                    <span><h2>“Tengo una agencia o varias unidades.”</h2><p>Alianza para agencias</p></span>
                    <span className="lp-ir" aria-hidden><span>→</span></span>
                  </a>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </div>

      {/* Servicios: qué resuelve cada plan, con la integral como la mejor opción */}
      <section id="servicios" className="lp-wrap lp-seccion">
        <p className="lp-kicker">Servicios</p>
        <h2>Elegí según el estado del auto y para qué lo querés</h2>
        <p className="lp-intro">Tres planes con precio a la vista. Cada uno dice qué problema resuelve y qué te llevás.</p>

        <div className="lp-cards">
          {/* Preparación base */}
          <Revelar como="article" className="lp-card">
            <p className="lp-num">{base.para}</p>
            <h3>{SERVICIOS[base.k]}</h3>
            <p className="lp-card-problema"><b>Si tu problema es</b>{CASOS[base.k].problema}</p>
            <ul>{base.items.map((x) => <li key={x}>{x}</li>)}</ul>
            <p className="lp-card-res"><b>Resultado</b>{CASOS[base.k].resultado}</p>
            <div className="lp-card-pie">
              <span className="lp-precio">{precioPlan(config, base.k)}</span>
              <Link href={`/turnos?servicio=${base.k}`} className="lp-btn lp-btn-sm lp-btn-linea">Pedir turno</Link>
            </div>
            {dif > 0 && <p className="lp-card-nota">Por {pesos(dif)} más tenés la integral, con barniz, motor e interior.</p>}
          </Revelar>

          {/* Preparación integral: la recomendada */}
          <Revelar como="article" className="lp-card lp-card-top">
            <span className="lp-chip">La opción más conveniente</span>
            <p className="lp-num">{integral.para}</p>
            <h3>{SERVICIOS[integral.k]}</h3>
            <p className="lp-card-problema"><b>Si tu problema es</b>{CASOS[integral.k].problema}</p>
            <ul>{integral.items.map((x) => <li key={x}>{x}</li>)}</ul>
            <p className="lp-card-res"><b>Resultado</b>{CASOS[integral.k].resultado}</p>
            <div className="lp-card-pie">
              <span>
                <span className="lp-precio lp-precio-top">{precioPlan(config, integral.k)}</span>
                {separado !== null && <span className="lp-tachado">Por separado {pesos(separado)}</span>}
              </span>
              <Link href={`/turnos?servicio=${integral.k}`} className="lp-btn">Pedir turno</Link>
            </div>
            {ahorro !== null && <p className="lp-card-ahorro">Ahorrás {pesos(ahorro)} frente a contratar esos servicios por separado.</p>}
          </Revelar>

          {/* Agencias */}
          <Revelar como="article" className="lp-card">
            <p className="lp-num">{agencia.para}</p>
            <h3>{SERVICIOS[agencia.k]}</h3>
            <p className="lp-card-problema"><b>Si tu problema es</b>{CASOS[agencia.k].problema}</p>
            <ul>{agencia.items.map((x) => <li key={x}>{x}</li>)}</ul>
            <p className="lp-card-res"><b>Resultado</b>{CASOS[agencia.k].resultado}</p>
            <div className="lp-card-pie">
              <span className="lp-precio">{precioPlan(config, agencia.k)}</span>
              <Link href={contacto("agencia")} className="lp-btn lp-btn-sm lp-btn-linea">Coordinar</Link>
            </div>
          </Revelar>
        </div>

        {separado !== null && (
          <Revelar className="lp-valor">
            <div>
              <p className="lp-kicker">Por qué la integral</p>
              <h3>Todo en un solo trabajo, por menos que por separado</h3>
              <p>La {SERVICIOS.puesta} reúne lo que más cambia la primera impresión de un auto. Contratados por separado, estos servicios costarían:</p>
            </div>
            <table>
              <tbody>
                {ETAPAS_INTEGRAL.map(([k, nombre]) => (
                  <tr key={k}><th scope="row">{nombre}</th><td>{precioPlan(config, k)}</td></tr>
                ))}
                <tr className="lp-valor-suma"><th scope="row">Total por separado</th><td>{pesos(separado)}</td></tr>
                <tr className="lp-valor-top"><th scope="row">{SERVICIOS.puesta}</th><td>{precioPlan(config, "puesta")}</td></tr>
                {ahorro !== null && <tr className="lp-valor-ahorro"><th scope="row">Tu ahorro</th><td>{pesos(ahorro)}</td></tr>}
              </tbody>
            </table>
          </Revelar>
        )}
      </section>

      {/* Servicios por separado */}
      <section id="por-separado" className="lp-wrap lp-seccion">
        <p className="lp-kicker">Servicios por separado</p>
        <h2>Si necesitás una sola cosa</h2>
        <p className="lp-intro">Cada servicio resuelve un problema puntual. Si necesitás más de uno, la integral suele salir menos{ahorro !== null && <>: ahorrás {pesos(ahorro)} frente a contratarlos por separado</>}.</p>
        <ul className="lp-lista">
          {(Object.keys(DETALLE_EXTRAS) as Extra[]).map((k, i) => (
            <Revelar key={k} como="li">
              <Link href={`/turnos?extra=${k}`} className="lp-fila lp-fila-precio">
                <span className="lp-num">{String(i + 1).padStart(2, "0")}</span>
                <span>
                  <h3>{DETALLE_EXTRAS[k][0]}{incluidos.includes(k) && <em className="lp-incluido">Incluido en la integral</em>}</h3>
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

      {/* Agencias: la alianza */}
      <section id="agencias" className="lp-wrap lp-seccion">
        <p className="lp-kicker">Alianza para agencias</p>
        <h2>Preparamos tus unidades para que roten más rápido</h2>
        <p className="lp-intro">Una unidad sin preparar tarda más en venderse y se ve peor en la publicación. Nos ocupamos de que todo tu stock salga con el mismo nivel.</p>

        <div className="lp-agencia">
          <Revelar className="lp-agencia-col">
            <p className="lp-kicker">El problema</p>
            <p>{CASOS.agencia.problema}</p>
            <p className="lp-kicker">Lo que hacemos</p>
            <ul>{agencia.items.map((x) => <li key={x}>{x}</li>)}</ul>
            <p className="lp-kicker">Lo que te llevás</p>
            <p>{CASOS.agencia.resultado}</p>
          </Revelar>
          <Revelar como="ol" className="lp-agencia-pasos" aria-label="Cómo es una alianza">
            {ALIANZA.map(([t, d], i) => (
              <li key={t}><span className="lp-num">{String(i + 1).padStart(2, "0")}</span><span><b>{t}</b><span>{d}</span></span></li>
            ))}
          </Revelar>
        </div>
        <div className="lp-acciones">
          <Link href={contacto("agencia")} className="lp-btn">Coordinar una alianza</Link>
          <Link href="/turnos?servicio=puesta" className="lp-btn lp-btn-linea">Probar con una unidad</Link>
        </div>
      </section>

      {/* Cómo trabajamos */}
      <section className="lp-wrap lp-seccion">
        <p className="lp-kicker">Cómo trabajamos</p>
        <h2>Sabés día, precio y avance desde el primer momento</h2>
        <p className="lp-intro">Un proceso simple y con seguimiento, para que no tengas que llamar a preguntar cómo va tu auto.</p>
        <ol className="lp-proceso">
          {PASOS.map(([t, d], i) => (
            <Revelar key={t} como="li">
              <span className="lp-num">{String(i + 1).padStart(2, "0")}</span>
              <b>{t}</b>
              <span>{d}</span>
            </Revelar>
          ))}
        </ol>
      </section>

      <CatalogoTrabajos items={trabajos} />

      {/* Dónde estamos y cierre */}
      <section className="lp-wrap lp-seccion">
        <p className="lp-kicker">Taller ALEZZA DETAIL</p>
        <h2>Dónde estamos</h2>
        <MapaTaller alto={320} />
        <div className="lp-cierre">
          <div>
            <h3>¿Turno para tu auto o alianza para tu agencia?</h3>
            <GoogleEstrellas />
          </div>
          <div className="lp-acciones">
            <Link href="/turnos?servicio=puesta" className="lp-btn">Pedir turno</Link>
            <Link href={contacto("agencia")} className="lp-btn lp-btn-linea">Soy agencia</Link>
          </div>
        </div>
      </section>

      <SitioPie ubicacion={perfil.location} horario={perfil.business_hours} />
    </main>
  );
}
