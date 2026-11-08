import Image from "next/image";
import Link from "next/link";
import VehicleCard from "@/components/VehicleCard";
import { supabase } from "@/lib/supabase";
import { getWhatsAppUrl } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

const steps = [
  {
    number: "01",
    title: "Elegí un vehículo",
    description: "Encontrá la unidad que estás buscando.",
  },
  {
    number: "02",
    title: "Ingresá tu vehículo",
    description: "Completá sus datos y agregá fotografías.",
  },
  {
    number: "03",
    title: "Evaluá la permuta",
    description: "Conocé las posibilidades de una operación.",
  },
];

const criteria = [
  {
    title: "Mercado",
    description:
      "Las referencias se cargan manualmente y sirven como orientación. Distinguimos el precio publicado, el valor estimado de mercado y el valor de toma.",
  },
  {
    title: "Evaluación",
    description:
      "Consideramos año, versión, kilometraje, estado declarado y fotografías. La evaluación actual es manual.",
  },
  {
    title: "Revisión",
    description:
      "El simulador inicia una consulta: no confirma una tasación, una oferta ni el cierre de la operación.",
  },
];

const services = [
  {
    title: "Compra y venta",
    description:
      "Te acompañamos a revisar alternativas y entender la operación antes de decidir.",
  },
  {
    title: "Permutas y evaluación",
    description:
      "Analizamos los datos del vehículo y conversamos una propuesta después de la revisión humana.",
  },
  {
    title: "Consignación e intermediación",
    description:
      "Acompañamos el proceso comercial para conectar a quien vende con quien busca un vehículo.",
  },
  {
    title: "Preparación y revalorización",
    description:
      "Coordinamos mejoras y servicios vinculados al auto para presentarlo mejor antes de venderlo.",
  },
  {
    title: "Asesoramiento automotor",
    description:
      "Ordenamos opciones, pasos y aspectos de la operación para que puedas decidir con más claridad.",
  },
];

type Vehicle = {
  id: string;
  brand: string;
  model: string;
  version: string | null;
  year: number;
  kilometers: number | null;
  fuel: string | null;
  transmission: string | null;
  price_ars: number | null;
  price_usd: number | null;
  currency: string | null;
  status: string;
  description: string | null;
  image_urls: string[] | null;
};

type PublicProfile = {
  whatsapp: string;
  email: string;
  location: string;
  business_hours: string;
};

function readPublicProfile(value: unknown): PublicProfile {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return { whatsapp: "", email: "", location: "", business_hours: "" };
  }

  const profile = value as Partial<Record<keyof PublicProfile, unknown>>;
  return {
    whatsapp: typeof profile.whatsapp === "string" ? profile.whatsapp.trim() : "",
    email: typeof profile.email === "string" ? profile.email.trim() : "",
    location: typeof profile.location === "string" ? profile.location.trim() : "",
    business_hours:
      typeof profile.business_hours === "string" ? profile.business_hours.trim() : "",
  };
}

function getPublicEmailUrl(
  email: string,
  subjectText = "Consulta sobre ALEZZA",
  bodyText?: string
) {
  const recipient = encodeURIComponent(email).replace(/%40/i, "@");
  const subject = encodeURIComponent(subjectText);
  const body = bodyText ? `&body=${encodeURIComponent(bodyText)}` : "";
  return `mailto:${recipient}?subject=${subject}${body}`;
}

function Logo() {
  return (
    <div className="inline-flex items-center rounded-md bg-black px-3 py-2">
      <Image
        src="/logo-alezza.png"
        alt="ALEZZA"
        width={200}
        height={65}
        priority
        className="h-9 w-auto object-contain"
      />
    </div>
  );
}

export default async function Home() {
  const [vehicleResult, settingsResult] = await Promise.all([
    supabase
      .from("vehicles")
      .select(
        "id, brand, model, version, year, kilometers, fuel, transmission, price_ars, price_usd, currency, status, description, image_urls"
      )
      .eq("is_published", true)
      .in("status", ["available", "reserved"])
      .order("created_at", { ascending: false }),
    supabase
      .from("app_settings")
      .select("value")
      .eq("key", "public_profile")
      .maybeSingle(),
  ]);

  const { data, error } = vehicleResult;
  const vehicles = (data ?? []) as Vehicle[];
  const publicProfile = readPublicProfile(settingsResult.data?.value);
  const whatsappUrl = publicProfile.whatsapp
    ? getWhatsAppUrl(publicProfile.whatsapp)
    : null;
  const serviceContactUrl = whatsappUrl ?? (
    publicProfile.email ? getPublicEmailUrl(publicProfile.email) : "/simulador"
  );
  const serviceContactLabel = whatsappUrl
    ? "Consultar por WhatsApp"
    : publicProfile.email
      ? "Enviar una consulta"
      : "Iniciar una permuta";
  const hasPublicProfile = Boolean(
    whatsappUrl || publicProfile.email || publicProfile.location || publicProfile.business_hours
  );

  return (
    <main className="min-h-screen bg-white text-[#111827]">
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <Link href="/" aria-label="ALEZZA - Inicio">
            <Logo />
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-medium text-gray-600 md:flex">
            <a href="#servicios" className="transition hover:text-[#173B68]">
              Servicios
            </a>
            <a href="#catalogo" className="transition hover:text-[#173B68]">
              Vehículos
            </a>
            <a href="#proceso" className="transition hover:text-[#173B68]">
              Cómo funciona
            </a>
          </nav>

          <a
            href="/simulador"
            className="rounded-lg bg-[#173B68] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#24558B]"
          >
            Simular permuta
          </a>
        </div>
      </header>

      <section className="overflow-hidden bg-[#173B68] text-white">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 py-20 md:grid-cols-2 md:items-center md:py-28">
          <div>
            <p className="mb-6 text-sm font-semibold tracking-[0.2em] text-[#A9DDF7]">
              ALEZZA · ASESORÍA AUTOMOTOR INTEGRAL
            </p>

            <h1 className="text-5xl font-bold leading-tight tracking-tight md:text-6xl">
              Tu próxima decisión automotor.
              <span className="mt-2 block text-[#A9DDF7]">
                Con más claridad.
              </span>
            </h1>

            <p className="mt-7 max-w-xl text-lg leading-8 text-blue-100">
              Compra, venta, permutas y acompañamiento automotor con una mirada
              integral y revisión humana en cada operación.
            </p>

            <div className="mt-9 flex flex-wrap gap-4">
              <a
                href="#catalogo"
                className="rounded-lg bg-white px-7 py-4 font-semibold text-[#173B68] transition hover:bg-blue-50"
              >
                Explorar vehículos →
              </a>

              <a
                href="#servicios"
                className="rounded-lg border border-white/30 px-7 py-4 font-semibold text-white transition hover:bg-white/10"
              >
                Conocer servicios
              </a>
            </div>
          </div>

          <div className="rounded-2xl border border-white/20 bg-white/10 p-8 backdrop-blur-sm">
            <p className="text-sm font-semibold tracking-widest text-[#A9DDF7]">
              TU OPERACIÓN EN TRES PASOS
            </p>

            {steps.map((step) => (
              <div key={step.number} className="mt-7 flex gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white font-bold text-[#173B68]">
                  {step.number}
                </div>

                <div>
                  <h2 className="font-semibold">{step.title}</h2>
                  <p className="mt-1 text-sm leading-6 text-blue-100">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="servicios" className="bg-white">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <p className="text-sm font-bold tracking-[0.2em] text-[#347EAF]">
            ASESORÍA AUTOMOTOR INTEGRAL
          </p>
          <div className="mt-3 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <h2 className="max-w-2xl text-3xl font-bold md:text-4xl">
                Acompañamiento para distintas etapas del vehículo.
              </h2>
              <p className="mt-3 max-w-2xl leading-7 text-gray-600">
                Desde evaluar una compra hasta preparar una unidad para vender,
                ordenamos la operación y coordinamos los próximos pasos.
              </p>
            </div>
            <a
              href={serviceContactUrl}
              target={whatsappUrl ? "_blank" : undefined}
              rel={whatsappUrl ? "noreferrer" : undefined}
              className="inline-flex w-fit shrink-0 rounded-lg border border-[#173B68] px-5 py-3 font-semibold text-[#173B68] transition hover:bg-[#F5F8FB]"
            >
              {serviceContactLabel}
            </a>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <article
                key={service.title}
                className="rounded-xl border border-gray-200 p-6"
              >
                <h3 className="text-lg font-bold text-[#173B68]">
                  {service.title}
                </h3>
                <p className="mt-3 leading-7 text-gray-600">
                  {service.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="catalogo" className="bg-[#F5F8FB]">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-bold tracking-[0.2em] text-[#347EAF]">
                CATÁLOGO ALEZZA
              </p>

              <h2 className="mt-3 text-3xl font-bold md:text-4xl">
                Vehículos disponibles
              </h2>

              <p className="mt-3 text-gray-600">
                Unidades publicadas y actualizadas desde ALEZZA.
              </p>
            </div>

            <span className="text-sm text-gray-500">
              {vehicles.length} {vehicles.length === 1 ? "vehículo" : "vehículos"}
            </span>
          </div>

          {error ? (
            <div className="mt-10 rounded-xl border border-red-200 bg-white p-8 text-center">
              <p className="font-semibold text-gray-800">
                No pudimos cargar el catálogo.
              </p>
              <p className="mt-2 text-sm text-gray-500">
                Intentá nuevamente más tarde.
              </p>
            </div>
          ) : vehicles.length === 0 ? (
            <div className="mt-10 rounded-xl border border-gray-200 bg-white p-12 text-center">
              <h3 className="text-xl font-semibold text-[#173B68]">
                Estamos preparando el catálogo.
              </h3>
              <p className="mt-3 text-gray-500">
                Próximamente vas a encontrar acá las unidades publicadas por
                ALEZZA.
              </p>
            </div>
          ) : (
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {vehicles.map((vehicle) => {
                const inquiryMessage = `Hola, consulto por el ${vehicle.year} ${vehicle.brand} ${vehicle.model}${vehicle.version ? ` ${vehicle.version}` : ""} que vi en el catálogo de ALEZZA. ¿Me pueden contar más sobre esta unidad?`;
                const contactHref = whatsappUrl
                  ? getWhatsAppUrl(publicProfile.whatsapp, inquiryMessage)
                  : publicProfile.email
                    ? getPublicEmailUrl(
                        publicProfile.email,
                        `Consulta por ${vehicle.brand} ${vehicle.model}`,
                        inquiryMessage
                      )
                    : null;

                return (
                  <VehicleCard
                    key={vehicle.id}
                    vehicle={vehicle}
                    contactHref={contactHref}
                    contactTarget={whatsappUrl ? "_blank" : undefined}
                    contactLabel={whatsappUrl ? "Escribir por WhatsApp" : "Enviar correo"}
                  />
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section id="proceso" className="bg-white">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <p className="text-sm font-bold tracking-[0.2em] text-[#347EAF]">
            CRITERIO ALEZZA
          </p>

          <h2 className="mt-3 max-w-2xl text-3xl font-bold md:text-4xl">
            La referencia orienta. La evaluación define la operación.
          </h2>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {criteria.map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-gray-200 p-7 transition hover:border-[#347EAF] hover:shadow-md"
              >
                <h3 className="text-xl font-bold">{item.title}</h3>
                <p className="mt-3 leading-7 text-gray-600">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {hasPublicProfile && (
        <section id="contacto" className="bg-[#F5F8FB]">
          <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-14 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-bold tracking-[0.2em] text-[#347EAF]">
                CONTACTO ALEZZA
              </p>
              <h2 className="mt-2 text-2xl font-bold text-[#173B68]">
                {whatsappUrl || publicProfile.email
                  ? "Hablemos de tu próxima operación."
                  : "Información de atención ALEZZA."}
              </h2>
              {publicProfile.location && (
                <p className="mt-2 text-sm text-gray-600">{publicProfile.location}</p>
              )}
              {publicProfile.business_hours && (
                <p className="mt-1 whitespace-pre-line text-sm text-gray-600">
                  {publicProfile.business_hours}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg bg-[#173B68] px-5 py-3 font-semibold text-white transition hover:bg-[#24558B]"
                >
                  Escribir por WhatsApp
                </a>
              )}
              {publicProfile.email && (
                <a
                  href={getPublicEmailUrl(publicProfile.email)}
                  className="rounded-lg border border-[#173B68] px-5 py-3 font-semibold text-[#173B68] transition hover:bg-white"
                >
                  Enviar correo
                </a>
              )}
            </div>
          </div>
        </section>
      )}

      <footer className="border-t border-gray-200 bg-[#F5F8FB]">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
          <Logo />
          <p className="text-sm text-gray-500">
            Asesoría Automotor Integral · {publicProfile.location || "Mar del Plata, Argentina"}
          </p>
        </div>
      </footer>
    </main>
  );
}
