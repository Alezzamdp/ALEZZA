import Link from "next/link";
import StockVehiculos, { getPublicEmailUrl, readPublicProfile } from "@/components/StockVehiculos";
import { supabase } from "@/lib/supabase";
import { getWhatsAppUrl } from "@/lib/whatsapp";
import { mensajeAlezza } from "@/lib/turnos";
import Logo from "@/components/Logo";

export const dynamic = "force-dynamic";

// Landing de ALEZZA: blanco y negro, poco texto, tres puertas (catálogo, permutas/financiación, servicios).
// Estilos en globals.css (.lp): animaciones cortas y suaves, se apagan con "reducir movimiento".

const puertas = [
  { t: "Catálogo", d: "Unidades revisadas, listas para ver.", u: "/vehiculos", cta: "Ver unidades" },
  { t: "Permutas y financiación", d: "Tasá tu auto y calculá las cuotas en pesos.", u: "/simulador", cta: "Tasar mi auto" },
  { t: "Servicios", d: "Estética y preparación, con turno online.", u: "/servicios", cta: "Ver servicios" },
];

const pasos = [
  { t: "Elegís", d: "Una unidad del catálogo." },
  { t: "Tasamos", d: "Tu auto, con referencias reales." },
  { t: "Cerramos", d: "Entrega y cuotas, confirmadas por una persona." },
];

export default async function Home() {
  const { data } = await supabase.from("app_settings").select("value").eq("key", "public_profile").maybeSingle();
  const perfil = readPublicProfile(data?.value);
  const whatsapp = perfil.whatsapp
    ? getWhatsAppUrl(perfil.whatsapp, mensajeAlezza("Quiero hacer una consulta.", [["Vehículo", "(marca, modelo y año)"]]))
    : null;
  const contacto = whatsapp ?? (perfil.email ? getPublicEmailUrl(perfil.email) : null);
  const ubicacion = perfil.location || "Mar del Plata, Argentina";

  return (
    <main className="lp">
      <header className="lp-header">
        <div className="lp-wrap lp-header-in">
          <Link href="/" aria-label="ALEZZA - Inicio"><Logo alto={20} /></Link>
          <nav className="lp-nav" aria-label="Secciones">
            <Link href="/vehiculos">Catálogo</Link>
            <Link href="/servicios">Servicios</Link>
          </nav>
          {contacto && (
            <a href={contacto} target={whatsapp ? "_blank" : undefined} rel={whatsapp ? "noreferrer" : undefined} className="lp-btn lp-btn-sm">
              Contacto
            </a>
          )}
        </div>
      </header>

      <section className="lp-wrap lp-hero">
        <p className="lp-kicker lp-in">{ubicacion}</p>
        <h1 className="lp-in" style={{ animationDelay: "60ms" }}>Autos seleccionados.<br />Operaciones claras.</h1>
        <p className="lp-lead lp-in" style={{ animationDelay: "120ms" }}>
          Compra, venta y permuta con tasación real y financiación en pesos. Cada operación la acompaña una persona.
        </p>
        <div className="lp-acciones lp-in" style={{ animationDelay: "180ms" }}>
          <Link href="/vehiculos" className="lp-btn">Ver catálogo</Link>
          <Link href="/simulador" className="lp-btn lp-btn-linea">Tasar mi auto</Link>
        </div>
      </section>

      <section className="lp-wrap lp-puertas" aria-label="Qué podés hacer">
        {puertas.map((p, i) => (
          <Link key={p.u} href={p.u} className="lp-card lp-in" style={{ animationDelay: `${240 + i * 60}ms` }}>
            <h2>{p.t}</h2>
            <p>{p.d}</p>
            <span className="lp-card-cta">{p.cta} <span aria-hidden>→</span></span>
          </Link>
        ))}
      </section>

      <StockVehiculos publicProfile={perfil} limite={3} />

      <section className="lp-wrap lp-seccion">
        <p className="lp-kicker">Cómo trabajamos</p>
        <ol className="lp-pasos">
          {pasos.map((p, i) => (
            <li key={p.t}>
              <span className="lp-num">{String(i + 1).padStart(2, "0")}</span>
              <h3>{p.t}</h3>
              <p>{p.d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="lp-wrap lp-seccion lp-contacto">
        <div>
          <h2>Hablemos de tu próxima operación.</h2>
          <p>{ubicacion}</p>
          {perfil.business_hours && <p className="whitespace-pre-line">{perfil.business_hours}</p>}
        </div>
        <div className="lp-acciones">
          {contacto && (
            <a href={contacto} target={whatsapp ? "_blank" : undefined} rel={whatsapp ? "noreferrer" : undefined} className="lp-btn">
              {whatsapp ? "Escribir por WhatsApp" : "Enviar correo"}
            </a>
          )}
          <Link href="/turnos" className="lp-btn lp-btn-linea">Pedir turno</Link>
        </div>
      </section>

      <footer className="lp-footer">
        <div className="lp-wrap lp-footer-in">
          <Logo alto={16} />
          <nav aria-label="Pie">
            <Link href="/vehiculos">Catálogo</Link>
            <Link href="/simulador">Permutas</Link>
            <Link href="/financiacion">Financiación</Link>
            <Link href="/servicios">Servicios</Link>
          </nav>
          <p>© ALEZZA · {ubicacion}</p>
        </div>
      </footer>
    </main>
  );
}
