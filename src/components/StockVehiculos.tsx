import VehicleCard from "@/components/VehicleCard";
import { supabase } from "@/lib/supabase";
import { getWhatsAppUrl } from "@/lib/whatsapp";
import { mensajeAlezza } from "@/lib/turnos";

// Stock publicado. Lo usan el Inicio (#catalogo) y el portal /vehiculos.

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

export type PublicProfile = {
  whatsapp: string;
  email: string;
  location: string;
  business_hours: string;
};

export function readPublicProfile(value: unknown): PublicProfile {
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

export function getPublicEmailUrl(
  email: string,
  subjectText = "Consulta sobre ALEZZA",
  bodyText?: string
) {
  const recipient = encodeURIComponent(email).replace(/%40/i, "@");
  const subject = encodeURIComponent(subjectText);
  const body = bodyText ? `&body=${encodeURIComponent(bodyText)}` : "";
  return `mailto:${recipient}?subject=${subject}${body}`;
}

// limite: en el Inicio se muestran los últimos N y un acceso al portal completo.
export default async function StockVehiculos({ publicProfile, limite }: { publicProfile: PublicProfile; limite?: number }) {
  const { data, error } = await supabase
    .from("vehicles")
    .select(
      "id, brand, model, version, year, kilometers, fuel, transmission, price_ars, price_usd, currency, status, description, image_urls"
    )
    .eq("is_published", true)
    .in("status", ["available", "reserved"])
    .order("created_at", { ascending: false });

  const todos = (data ?? []) as Vehicle[];
  const vehicles = limite ? todos.slice(0, limite) : todos;
  const whatsapp = publicProfile.whatsapp;

  return (
    <section id="catalogo" className="bg-[var(--papel)]">
      <div className="mx-auto max-w-7xl px-6 py-20">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-bold tracking-[0.2em] text-[var(--m700)]">
              CATÁLOGO ALEZZA
            </p>
            <h2 className="mt-3 text-3xl font-bold md:text-4xl">Vehículos disponibles</h2>
            <p className="mt-3 text-gray-600">Unidades publicadas y actualizadas desde ALEZZA.</p>
          </div>
          <span className="text-sm text-gray-500">
            {limite ? (
              <a href="/vehiculos" className="font-semibold text-[var(--tinta)] underline-offset-4 hover:underline">Ver todo el stock ({todos.length}) →</a>
            ) : (
              <>{todos.length} {todos.length === 1 ? "vehículo" : "vehículos"}</>
            )}
          </span>
        </div>

        {error ? (
          <div className="mt-10 rounded-xl border border-red-200 bg-white p-8 text-center">
            <p className="font-semibold text-gray-800">No pudimos cargar el catálogo.</p>
            <p className="mt-2 text-sm text-gray-500">Intentá nuevamente más tarde.</p>
          </div>
        ) : vehicles.length === 0 ? (
          <div className="mt-10 rounded-xl border border-gray-200 bg-white p-12 text-center">
            <h3 className="text-xl font-semibold text-[var(--tinta)]">Estamos preparando el catálogo.</h3>
            <p className="mt-3 text-gray-500">
              Próximamente vas a encontrar acá las unidades publicadas por ALEZZA.
            </p>
          </div>
        ) : (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {vehicles.map((vehicle) => {
              const inquiryMessage = mensajeAlezza("Vi esta unidad en el catálogo y quiero saber más.", [["Vehículo", `${vehicle.brand} ${vehicle.model}${vehicle.version ? ` ${vehicle.version}` : ""}`], ["Año", String(vehicle.year)]]);
              const contactHref = whatsapp
                ? getWhatsAppUrl(whatsapp, inquiryMessage)
                : publicProfile.email
                  ? getPublicEmailUrl(publicProfile.email, `Consulta por ${vehicle.brand} ${vehicle.model}`, inquiryMessage)
                  : null;

              return (
                <VehicleCard
                  key={vehicle.id}
                  vehicle={vehicle}
                  contactHref={contactHref}
                  contactTarget={whatsapp ? "_blank" : undefined}
                  contactLabel={whatsapp ? "Escribir por WhatsApp" : "Enviar correo"}
                />
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
