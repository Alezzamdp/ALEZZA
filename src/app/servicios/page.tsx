import type { Metadata } from "next";
import Link from "next/link";
import MapaTaller from "@/components/MapaTaller";
import { SitioCabecera, SitioPie } from "@/components/SitioMarco";
import { WA_AGENCIA, datosSitio, externo } from "@/lib/sitio";
import { PLANES, SERVICIOS, precioPlan } from "@/lib/turnos";
import Catalogo from "./Catalogo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Estética automotriz · ALEZZA Mar del Plata",
  description: "Preparación base, preparación integral y planes para agencias. Estética técnica automotriz en Mar del Plata, con turno online.",
  openGraph: {
    title: "ALEZZA — Tu auto vale más cuando se ve.",
    description: "Preparación de unidades para particulares, vendedores y agencias en Mar del Plata.",
  },
};

const PASOS = ["Pedís turno y señás online", "Evaluamos la unidad", "Trabajamos en el taller", "Retirás el auto listo"];

// La primera pantalla tiene todo: propuesta, proceso, los tres planes con precio y su acción.
// Debajo quedan las pruebas (antes y después) y el mapa del taller.
export default async function Servicios() {
  const { perfil, config } = await datosSitio();
  const ubicacion = perfil.location || "Mar del Plata, Argentina";

  return (
    <main className="lp">
      <div className="lp-pantalla">
        <SitioCabecera activa="/servicios" />

        <div className="lp-wrap lp-main">
          <div className="lp-dos">
            <section>
              <p className="lp-kicker lp-in">Estética técnica automotriz · Mar del Plata</p>
              <h1 className="lp-in" style={{ animationDelay: "80ms" }}>Tu auto vale más<br />cuando se ve.</h1>
              <p className="lp-lead lp-in" style={{ animationDelay: "160ms" }}>
                Preparamos unidades para vender mejor y más rápido: particulares, vendedores y agencias que necesitan rotar stock.
              </p>
              <div className="lp-acciones lp-in" style={{ animationDelay: "240ms" }}>
                <Link href="/turnos" className="lp-btn">Pedir turno</Link>
                <a href={WA_AGENCIA} {...externo} className="lp-btn lp-btn-linea">Soy agencia</a>
              </div>
              <ol className="lp-pasos lp-in" style={{ animationDelay: "320ms" }} aria-label="Cómo trabajamos">
                {PASOS.map((p, i) => (
                  <li key={p}><span className="lp-num">{String(i + 1).padStart(2, "0")}</span>{p}</li>
                ))}
              </ol>
            </section>

            <section className="lp-fichas" aria-label="Planes y precios en pesos">
              {PLANES.map((p, i) => {
                const agencia = p.k === "agencia";
                return (
                  <article key={p.k} className="lp-ficha lp-in" style={{ animationDelay: `${200 + i * 80}ms` }}>
                    <div>
                      <p className="lp-num">{p.para}</p>
                      <h2>{SERVICIOS[p.k]}</h2>
                      <ul>{p.items.map((x) => <li key={x}>{x}</li>)}</ul>
                    </div>
                    <div className="lp-plan-der">
                      <span className="lp-precio">{precioPlan(config, p.k)}</span>
                      {agencia
                        ? <a href={WA_AGENCIA} {...externo} className="lp-btn lp-btn-sm lp-btn-linea">Coordinar</a>
                        : <Link href={`/turnos?servicio=${p.k}`} className="lp-btn lp-btn-sm">Pedir turno</Link>}
                    </div>
                  </article>
                );
              })}
            </section>
          </div>
        </div>
      </div>

      <Catalogo />

      <section className="lp-wrap lp-seccion">
        <h2>Dónde estamos</h2>
        <MapaTaller alto={320} />
      </section>

      <SitioPie ubicacion={ubicacion} horario={perfil.business_hours} />
    </main>
  );
}
