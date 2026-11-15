import Link from "next/link";
import StockVehiculos, { getPublicEmailUrl, readPublicProfile } from "@/components/StockVehiculos";
import { supabase } from "@/lib/supabase";
import { getWhatsAppUrl } from "@/lib/whatsapp";
import { mensajeAlezza } from "@/lib/turnos";
import Logo from "@/components/Logo";

export const dynamic = "force-dynamic";

// Landing de ALEZZA: misma línea que el logo (geométrico, mayúsculas, monocromo) con acento mostaza.
// Cada bloque lleva a su portal (vehículos, permutas, financiación, servicios).

const portales = [
  { n: "01", t: "Vehículos", d: "Unidades en stock, revisadas y listas para ver.", u: "/vehiculos" },
  { n: "02", t: "Permutas", d: "Tasá tu auto y mirá con qué unidad te entra.", u: "/simulador" },
  { n: "03", t: "Financiación", d: "Cuotas fijas en pesos, solo con tu DNI.", u: "/financiacion" },
  { n: "04", t: "Servicios", d: "Estética y preparación para vender mejor.", u: "/servicios" },
];

const services = [
  { title: "Compra y venta", description: "Te acompañamos a revisar alternativas y entender la operación antes de decidir." },
  { title: "Permutas y evaluación", description: "Analizamos tu vehículo y armamos una propuesta con revisión humana." },
  { title: "Consignación e intermediación", description: "Conectamos a quien vende con quien busca, y acompañamos todo el proceso." },
  { title: "Preparación y revalorización", description: "Coordinamos mejoras para presentar el auto en su mejor versión antes de venderlo." },
  { title: "Asesoramiento automotor", description: "Ordenamos opciones y pasos para que decidas con claridad." },
];

const steps = [
  { n: "01", t: "Elegí un vehículo", d: "Encontrá la unidad que estás buscando en el stock." },
  { n: "02", t: "Contanos del tuyo", d: "Cargá los datos y las fotos de tu auto para la permuta." },
  { n: "03", t: "Cerramos con claridad", d: "Te pasamos tasación, entrega y cuotas, y un asesor confirma todo." },
];

const criteria = [
  { t: "Mercado", d: "Comparamos con publicaciones reales y distinguimos precio publicado, valor de mercado y valor de toma." },
  { t: "Evaluación", d: "Año, versión, kilometraje, estado y fotos. Cada tasación la revisa una persona." },
  { t: "Transparencia", d: "El simulador orienta: la oferta final se confirma al ver el vehículo." },
];

const kicker = "font-mono text-xs uppercase tracking-[0.25em]";

export default async function Home() {
  const settingsResult = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "public_profile")
    .maybeSingle();

  const publicProfile = readPublicProfile(settingsResult.data?.value);
  const whatsappUrl = publicProfile.whatsapp
    ? getWhatsAppUrl(publicProfile.whatsapp, mensajeAlezza("Quiero hacer una consulta.", [
        ["Tema", "compra / venta / permuta / preparación"],
        ["Vehículo", "(marca, modelo y año)"],
      ]))
    : null;
  const contactoUrl = whatsappUrl ?? (publicProfile.email ? getPublicEmailUrl(publicProfile.email) : null);
  const ubicacion = publicProfile.location || "Mar del Plata, Argentina";

  return (
    <main className="min-h-screen bg-[var(--papel)] text-[var(--tinta)]">
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-[var(--papel)]/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-5 py-4">
          <Link href="/" aria-label="ALEZZA - Inicio"><Logo alto={24} /></Link>
          <nav className="hidden items-center gap-8 text-sm font-medium text-gray-600 md:flex">
            {portales.map((p) => (
              <Link key={p.u} href={p.u} className="transition hover:text-[var(--tinta)]">{p.t}</Link>
            ))}
          </nav>
          <Link href="/simulador" className="rounded-md bg-[var(--tinta)] px-4 py-2.5 text-sm font-semibold text-[var(--papel)] transition hover:opacity-90">
            Tasar mi auto
          </Link>
        </div>
      </header>

      {/* Portada */}
      <section className="border-b border-gray-200">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 py-20 md:grid-cols-[1.25fr_1fr] md:items-end md:py-28">
          <div>
            <p className={`${kicker} text-[var(--m700)]`}>Asesoría automotor integral · {ubicacion}</p>
            <h1 className="mt-6 text-4xl font-extrabold uppercase leading-[1.05] tracking-tight md:text-6xl">
              Comprá, vendé y permutá
              <span className="block text-[var(--mostaza)]">con claridad.</span>
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-gray-600">
              Vehículos seleccionados, tasación con referencias reales de mercado y financiación en pesos.
              Cada operación la acompaña una persona.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/vehiculos" className="rounded-md bg-[var(--tinta)] px-6 py-3.5 font-semibold text-[var(--papel)] transition hover:opacity-90">
                Ver vehículos en stock
              </Link>
              <Link href="/simulador" className="rounded-md border border-[var(--tinta)] px-6 py-3.5 font-semibold transition hover:bg-[var(--tinta)] hover:text-[var(--papel)]">
                Simular una permuta
              </Link>
            </div>
          </div>

          <nav aria-label="Portales de ALEZZA" className="border-t border-[var(--tinta)]">
            {portales.map((p) => (
              <Link key={p.u} href={p.u} className="group grid grid-cols-[3rem_1fr_auto] items-baseline gap-2 border-b border-gray-300 py-5">
                <span className="font-mono text-xs text-gray-500">{p.n}</span>
                <span>
                  <span className="block font-semibold uppercase tracking-wide">{p.t}</span>
                  <span className="mt-1 block text-sm text-gray-600">{p.d}</span>
                </span>
                <span aria-hidden className="text-lg transition group-hover:translate-x-1 group-hover:text-[var(--mostaza)]">→</span>
              </Link>
            ))}
          </nav>
        </div>
      </section>

      {/* Stock destacado */}
      <StockVehiculos publicProfile={publicProfile} limite={3} />

      {/* Servicios */}
      <section id="servicios" className="border-y border-gray-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-20 md:grid-cols-[1fr_1.4fr]">
          <div>
            <p className={`${kicker} text-[var(--m700)]`}>Qué hacemos</p>
            <h2 className="mt-4 text-3xl font-bold uppercase leading-tight md:text-4xl">Todo el ciclo del vehículo, en un solo lugar.</h2>
            <p className="mt-4 max-w-md leading-7 text-gray-600">
              Desde evaluar una compra hasta preparar una unidad para vender, ordenamos la operación y coordinamos cada paso.
            </p>
          </div>
          <ol className="border-t border-gray-200">
            {services.map((s, i) => (
              <li key={s.title} className="grid grid-cols-[3rem_1fr] gap-2 border-b border-gray-200 py-5">
                <span className="font-mono text-xs text-gray-500">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <h3 className="font-semibold">{s.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-gray-600">{s.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Proceso */}
      <section id="proceso" className="bg-[var(--tinta)] text-[var(--papel)]">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <p className={`${kicker} text-[var(--mostaza)]`}>Cómo funciona</p>
          <h2 className="mt-4 max-w-2xl text-3xl font-bold uppercase leading-tight md:text-4xl">Tu operación en tres pasos.</h2>
          <div className="mt-12 grid gap-10 md:grid-cols-3">
            {steps.map((s) => (
              <div key={s.n} className="border-t border-[var(--mostaza)] pt-5">
                <p className="font-mono text-sm text-[var(--mostaza)]">{s.n}</p>
                <h3 className="mt-3 text-lg font-semibold">{s.t}</h3>
                <p className="mt-2 text-sm leading-6 opacity-75">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Criterio */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <p className={`${kicker} text-[var(--m700)]`}>Criterio ALEZZA</p>
        <h2 className="mt-4 max-w-2xl text-3xl font-bold uppercase leading-tight md:text-4xl">La referencia orienta. La evaluación define.</h2>
        <div className="mt-10 grid gap-8 md:grid-cols-3">
          {criteria.map((c) => (
            <div key={c.t}>
              <h3 className="font-semibold uppercase tracking-wide">{c.t}</h3>
              <p className="mt-2 leading-7 text-gray-600">{c.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Contacto */}
      <section id="contacto" className="border-t border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-14 md:flex-row md:items-center md:justify-between">
          <div>
            <p className={`${kicker} text-[var(--m700)]`}>Contacto</p>
            <h2 className="mt-3 text-2xl font-bold uppercase">Hablemos de tu próxima operación.</h2>
            <p className="mt-2 text-sm text-gray-600">{ubicacion}</p>
            {publicProfile.business_hours && <p className="mt-1 whitespace-pre-line text-sm text-gray-600">{publicProfile.business_hours}</p>}
          </div>
          <div className="flex flex-wrap gap-3">
            {contactoUrl && (
              <a href={contactoUrl} target={whatsappUrl ? "_blank" : undefined} rel={whatsappUrl ? "noreferrer" : undefined}
                className="rounded-md bg-[var(--tinta)] px-5 py-3 font-semibold text-[var(--papel)] transition hover:opacity-90">
                {whatsappUrl ? "Escribir por WhatsApp" : "Enviar correo"}
              </a>
            )}
            <Link href="/turnos" className="rounded-md border border-[var(--tinta)] px-5 py-3 font-semibold transition hover:bg-[var(--tinta)] hover:text-[var(--papel)]">
              Pedir turno de estética
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-gray-200">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
          <Logo alto={20} />
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600">
            {portales.map((p) => <Link key={p.u} href={p.u} className="hover:text-[var(--tinta)]">{p.t}</Link>)}
            <Link href="/turnos" className="hover:text-[var(--tinta)]">Turnos</Link>
          </nav>
          <p className="font-mono text-xs text-gray-500">© ALEZZA · {ubicacion}</p>
        </div>
      </footer>
    </main>
  );
}
