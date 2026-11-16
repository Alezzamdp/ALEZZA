import type { Metadata } from "next";
import { SitioCabecera, SitioPie } from "@/components/SitioMarco";
import { INSTAGRAM, TEMAS, UBICACION, esTema, externo, waTema, type Tema } from "@/lib/contacto";
import { datosSitio } from "@/lib/sitio";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Contacto · ALEZZA",
  description: "Escribinos por WhatsApp o Instagram. Asesoría automotor integral en Mar del Plata.",
};

const ELEGIBLES: Tema[] = ["asesoria", "compra", "permuta", "financiacion", "estetica", "gestoria", "talleres", "agencia"];

// Único apartado de contacto del sitio: WhatsApp e Instagram. El resto de las páginas enlaza acá con
// /contacto?tema=…, y el mensaje de WhatsApp ya sale armado para ese tema.
export default async function Contacto({ searchParams }: { searchParams: Promise<{ tema?: string | string[]; ref?: string | string[] }> }) {
  const q = await searchParams;
  const tema: Tema = esTema(q.tema) ? q.tema : "consulta";
  const ref = typeof q.ref === "string" ? q.ref.slice(0, 140) : undefined;
  const { perfil } = await datosSitio();
  const horario = perfil.business_hours?.replace(/\s*\n\s*/g, " · ");

  return (
    <main className="lp lp-pantalla">
      <SitioCabecera />

      <div className="lp-wrap lp-main">
        <section className="lp-contacto">
          <p className="lp-kicker lp-in">Contacto</p>
          <h1 className="lp-titular lp-in">Hablemos de tu auto.</h1>
          <p className="lp-lead lp-in" style={{ animationDelay: "80ms" }}>
            Elegí el tema y escribinos: el mensaje ya sale armado para que te respondamos más rápido.
          </p>

          <nav className="lp-temas lp-in" style={{ animationDelay: "160ms" }} aria-label="Tema de la consulta">
            {ELEGIBLES.map((k) => (
              <a key={k} href={`/contacto?tema=${k}`} aria-current={k === tema ? "true" : undefined} className="lp-tema">{TEMAS[k].t}</a>
            ))}
          </nav>

          <div className="lp-canales lp-in" style={{ animationDelay: "240ms" }}>
            <a href={waTema(tema, ref)} {...externo} className="lp-canal lp-canal-principal">
              <span className="lp-num">WhatsApp</span>
              <strong>223 421-2621</strong>
              <span>{tema === "consulta" ? "Escribinos y te respondemos." : `Mensaje armado: ${TEMAS[tema].t.toLowerCase()}.`}</span>
              <span className="lp-ir">Abrir WhatsApp <span aria-hidden>→</span></span>
            </a>
            <a href={INSTAGRAM} {...externo} className="lp-canal">
              <span className="lp-num">Instagram</span>
              <strong>@alezzamdp</strong>
              <span>Trabajos del taller, unidades nuevas y novedades.</span>
              <span className="lp-ir">Abrir Instagram <span aria-hidden>→</span></span>
            </a>
          </div>

          <p className="lp-contacto-pie lp-in" style={{ animationDelay: "320ms" }}>
            {[perfil.location || UBICACION, horario].filter(Boolean).join(" · ")}
          </p>
        </section>
      </div>

      <SitioPie ubicacion={perfil.location} horario={perfil.business_hours} />
    </main>
  );
}
