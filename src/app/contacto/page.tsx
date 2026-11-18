import type { Metadata } from "next";
import { SitioCabecera, SitioPie } from "@/components/SitioMarco";
import { UBICACION, esTema, type Tema } from "@/lib/contacto";
import { datosSitio } from "@/lib/sitio";
import ContactoForm from "./ContactoForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Contacto",
  alternates: { canonical: "/contacto" },
  description: "Escribinos por WhatsApp o Instagram: turnos de estética vehicular y alianzas con agencias en Mar del Plata.",
};

// Único apartado de contacto del sitio: WhatsApp (con los datos del auto ya cargados) e Instagram. El resto de las páginas
// enlaza acá con /contacto?tema=… y la referencia (turno, unidad) viaja en el mensaje.
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
            Contanos qué auto es y qué necesitás: te respondemos por WhatsApp con todo a mano.
          </p>
          <div className="lp-in" style={{ animationDelay: "160ms" }}>
            <ContactoForm temaInicial={tema} refInicial={ref} />
          </div>
          <p className="lp-contacto-pie lp-in" style={{ animationDelay: "240ms" }}>
            {[perfil.location || UBICACION, horario].filter(Boolean).join(" · ")}
          </p>
        </section>
      </div>

      <SitioPie ubicacion={perfil.location} horario={perfil.business_hours} />
    </main>
  );
}
