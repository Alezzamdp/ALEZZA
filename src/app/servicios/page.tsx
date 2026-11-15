import type { Metadata } from "next";
import Link from "next/link";
import Logo from "@/components/Logo";
import { mensajeAlezza, waAlezza } from "@/lib/turnos";
import Catalogo from "./Catalogo";
import MapaTaller from "@/components/MapaTaller";

export const metadata: Metadata = {
  title: "ALEZZA — Estética técnica automotriz · Mar del Plata",
  description: "Intervención técnica en pintura, motor e interiores para particulares y agencias en Mar del Plata.",
  openGraph: {
    title: "ALEZZA — Tu auto vale más cuando se ve.",
    description: "Estética técnica automotriz en Mar del Plata, para particulares y agencias.",
  },
};

const WA = waAlezza(mensajeAlezza("Quiero consultar por los servicios de estética para mi auto.", [["Vehículo", "(marca, modelo y año)"]]));
const MAPA = "https://google.com/maps/place/ALEZZA+DETAIL/@-37.9980399,-57.5419537,12455m/data=!3m1!1e3!4m6!3m5!1s0x9584df0051c1e4ff:0x4421b9b16f425b5f!8m2!3d-38.0581289!4d-57.5981737!16s%2Fg%2F11xdw603st";
const externo = { target: "_blank", rel: "noopener noreferrer" } as const;

const SERVICIOS = [
  ["01 · Exterior", "Abrillantado de barniz", "Corrección técnica que devuelve la profundidad del color. Lista para salón y fotos."],
  ["02 · Motor", "Acondicionado de vano motor", "Un motor limpio transmite confianza y desactiva objeciones antes de la prueba."],
  ["03 · Interior", "Saneamiento de habitáculo", "Plásticos y textiles a su acabado original: una unidad sin historia."],
];

const PLANES = [
  { tag: "Básico", t: "Lavado técnico", p: "$100.000", desde: true, items: ["Lavado exterior profesional", "Habitáculo, tablero y plásticos", "Apto para fotos de clasificados"] },
  { tag: "Recomendado · Particulares", t: "Puesta en valor", p: "$250.000", desde: true, destacado: true, items: ["Las tres etapas completas", "Barniz, vano motor y habitáculo", "Lista para salón y fotos"] },
  { tag: "Agencias y flotas", t: "Plan agencia", p: "A convenir", desde: false, items: ["Tarifa por volumen", "Turnos por lote y prioridad de agenda", "Mismo estándar en toda la flota"] },
];

const PASOS = ["Pedís turno y señás online", "Evaluamos la unidad", "Intervenimos en el taller", "Retirás el auto listo"];

export default function Servicios() {
  return (
    <main className="min-h-screen text-[var(--tinta)]">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-5">
        <Link href="/" aria-label="ALEZZA - Inicio"><Logo alto={24} /></Link>
        <Link href="/turnos" className="rounded-md bg-[var(--tinta)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--n800)]">
          Pedir turno
        </Link>
      </header>

      <section className="mx-auto grid max-w-6xl gap-10 px-6 pb-12 pt-6 lg:grid-cols-[1.1fr_1fr] lg:items-start">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-gray-500">Estética técnica automotriz · Mar del Plata</p>
          <h1 className="mt-4 text-4xl font-extrabold leading-[1.05] md:text-5xl">
            Tu auto <span className="text-[var(--mostaza)]">vale más</span> cuando se ve.
          </h1>
          <p className="mt-5 max-w-lg text-gray-600">
            Recuperamos el valor percibido de tu vehículo, para particulares que quieren vender mejor y agencias que necesitan rotar stock.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/turnos" className="rounded-md bg-[var(--mostaza)] px-5 py-3 text-sm font-bold text-[#17150f] hover:brightness-95">Pedir turno →</Link>
            <a href="#precios" className="rounded-md border border-gray-300 px-5 py-3 text-sm font-semibold hover:bg-white">Ver precios</a>
          </div>
        </div>
        <ol className="grid gap-3">
          {SERVICIOS.map(([n, t, d]) => (
            <li key={n} className="rounded-lg border border-gray-200 bg-white p-5">
              <p className="font-mono text-xs text-[var(--m700)]">{n}</p>
              <h2 className="mt-1 text-lg font-semibold">{t}</h2>
              <p className="mt-1 text-sm text-gray-600">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="precios" className="mx-auto max-w-6xl px-6 py-12">
        <h2 className="text-2xl font-bold">Precios <span className="font-mono text-sm font-normal text-gray-500">en pesos argentinos</span></h2>
        <div className="carrusel -mx-6 mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-6 pb-2 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0">
          {PLANES.map((p) => (
            <article key={p.t} className={`flex w-[82%] shrink-0 snap-center flex-col rounded-lg border p-6 transition duration-300 hover:-translate-y-1 hover:shadow-lg md:w-auto ${p.destacado ? "border-[var(--tinta)] bg-[var(--tinta)] text-white" : "border-gray-200 bg-white"}`}>
              <p className={`font-mono text-xs uppercase tracking-wider ${p.destacado ? "text-[var(--mostaza)]" : "text-[var(--m700)]"}`}>{p.tag}</p>
              <h3 className="mt-2 text-xl font-semibold">{p.t}</h3>
              <p className="mt-3 font-mono">
                {p.desde && <span className="text-xs opacity-70">desde </span>}
                <span className="text-2xl font-medium">{p.p}</span>
              </p>
              <ul className="mt-4 flex-1 space-y-1.5 text-sm">
                {p.items.map((i) => <li key={i}><span className="text-[var(--mostaza)]">✓</span> {i}</li>)}
              </ul>
              <Link href="/turnos" className={`mt-6 rounded-md px-4 py-2.5 text-center text-sm font-semibold ${p.destacado ? "bg-[var(--mostaza)] text-[#17150f]" : "border border-gray-300 hover:bg-gray-50"}`}>
                Pedir turno
              </Link>
            </article>
          ))}
        </div>
      </section>

      <Catalogo />

      <section className="mx-auto max-w-6xl px-6 py-12">
        <h2 className="text-2xl font-bold">Cómo trabajamos</h2>
        <ol className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PASOS.map((p, i) => (
            <li key={p} className="border-t-2 border-[var(--tinta)] pt-3 text-sm font-medium">
              <span className="mr-2 font-mono text-[var(--m700)]">0{i + 1}</span>{p}
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-12">
        <h2 className="text-2xl font-bold">Dónde estamos</h2>
        <div className="mt-6"><MapaTaller /></div>
      </section>

      <footer className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-3 border-t border-gray-200 px-6 py-8 text-sm">
        <Logo alto={18} />
        <a href={WA} {...externo} className="hover:underline">WhatsApp 223 421-2621</a>
        <a href="https://instagram.com/alezzamdp" {...externo} className="hover:underline">Instagram @alezzamdp</a>
        <a href={MAPA} {...externo} className="hover:underline">Taller en Mar del Plata ↗</a>
        <span className="ml-auto font-mono text-xs text-gray-500">© {new Date().getFullYear()} ALEZZA</span>
      </footer>
    </main>
  );
}
