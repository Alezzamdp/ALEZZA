"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import { getWhatsAppUrl } from "@/lib/whatsapp";

type Vehicle = {
  id: string;
  brand: string;
  model: string;
  version: string | null;
  year: number;
  status: "available" | "reserved";
};

type PublicProfile = {
  whatsapp: string;
  email: string;
};

const inputClass =
  "mt-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 outline-none focus:border-[#347EAF] focus:ring-2 focus:ring-[#347EAF]/20";

function getEmailUrl(email: string, subject: string, body: string) {
  const recipient = encodeURIComponent(email).replace(/%40/i, "@");
  return `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function readPublicProfile(value: unknown): PublicProfile {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return { whatsapp: "", email: "" };
  }

  const profile = value as Partial<Record<keyof PublicProfile, unknown>>;
  return {
    whatsapp: typeof profile.whatsapp === "string" ? profile.whatsapp.trim() : "",
    email: typeof profile.email === "string" ? profile.email.trim() : "",
  };
}

export default function VehicleInquiryPage() {
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [profile, setProfile] = useState<PublicProfile>({ whatsapp: "", email: "" });
  const [loadingVehicle, setLoadingVehicle] = useState(true);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadPageData() {
      const vehicleId = new URLSearchParams(window.location.search).get("vehicle_id");
      if (!vehicleId) {
        if (active) setLoadingVehicle(false);
        return;
      }

      const [vehicleResult, profileResult] = await Promise.all([
        supabase
          .from("vehicles")
          .select("id, brand, model, version, year, status")
          .eq("id", vehicleId)
          .eq("is_published", true)
          .in("status", ["available", "reserved"])
          .maybeSingle(),
        supabase
          .from("app_settings")
          .select("value")
          .eq("key", "public_profile")
          .maybeSingle(),
      ]);

      if (!active) return;

      if (!vehicleResult.error && vehicleResult.data) {
        setVehicle(vehicleResult.data as Vehicle);
      }
      setProfile(readPublicProfile(profileResult.data?.value));
      setLoadingVehicle(false);
    }

    void loadPageData();

    return () => {
      active = false;
    };
  }, []);

  const vehicleName = vehicle
    ? `${vehicle.year} ${vehicle.brand} ${vehicle.model}${vehicle.version ? ` ${vehicle.version}` : ""}`
    : "esta unidad";
  const contactMessage = `Hola, acabo de dejar una consulta por el ${vehicleName} en el sitio de ALEZZA. Mi nombre es ${name.trim()}${phone.trim() ? ` y mi teléfono es ${phone.trim()}` : ""}${email.trim() ? `; mi correo es ${email.trim()}` : ""}.${message.trim() ? ` Consulta: ${message.trim()}` : ""}`;
  const whatsappHref = profile.whatsapp
    ? getWhatsAppUrl(profile.whatsapp, contactMessage)
    : null;
  const emailHref = profile.email
    ? getEmailUrl(profile.email, `Consulta por ${vehicleName}`, contactMessage)
    : null;

  async function submitInquiry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!vehicle || busy) return;

    const normalizedName = name.trim();
    const normalizedPhone = phone.trim();
    const normalizedEmail = email.trim();
    const normalizedMessage = message.trim();

    if (!normalizedPhone && !normalizedEmail) {
      setError("Dejanos un teléfono o un correo para poder responderte.");
      return;
    }

    if (normalizedPhone && !getWhatsAppUrl(normalizedPhone)) {
      setError("Revisá el teléfono con código de área, por ejemplo 223 555 1234.");
      return;
    }

    setBusy(true);
    setError("");

    const { error: insertError } = await supabase.from("vehicle_inquiries").insert({
      vehicle_id: vehicle.id,
      customer_name: normalizedName,
      phone: normalizedPhone || null,
      email: normalizedEmail || null,
      message: normalizedMessage,
    });

    if (insertError) {
      const missingTable =
        /vehicle_inquiries/i.test(insertError.message) &&
        (insertError.code === "PGRST205" || insertError.code === "42P01");
      setError(missingTable
        ? "El registro de consultas todavía no está habilitado en esta base. Podés contactarnos directamente."
        : "No pudimos registrar la consulta. Revisá tus datos e intentá nuevamente. También podés contactarnos directamente."
      );
      setBusy(false);
      return;
    }

    setSubmitted(true);
    setBusy(false);
  }

  return (
    <main className="min-h-screen bg-[#F5F8FB] px-4 py-10 text-gray-900 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <Link href="/#catalogo" className="text-sm font-semibold text-[#173B68] hover:underline">
          ← Volver al catálogo
        </Link>

        <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-9">
          <p className="text-sm font-bold tracking-[0.2em] text-[#347EAF]">CONSULTA DE VEHÍCULO</p>

          {loadingVehicle ? (
            <p role="status" className="mt-5 text-gray-600">Cargando la unidad...</p>
          ) : !vehicle ? (
            <>
              <h1 className="mt-3 text-2xl font-bold text-[#173B68]">No encontramos esta unidad</h1>
              <p className="mt-3 leading-7 text-gray-600">
                Puede haberse pausado o vendido. Volvé al catálogo para ver las unidades publicadas.
              </p>
              <Link href="/#catalogo" className="mt-6 inline-flex rounded-lg bg-[#173B68] px-5 py-3 font-semibold text-white hover:bg-[#24558B]">
                Ir al catálogo
              </Link>
            </>
          ) : submitted ? (
            <>
              <h1 className="mt-3 text-2xl font-bold text-[#173B68]">Consulta registrada</h1>
              <p className="mt-3 leading-7 text-gray-600">
                Recibimos tu consulta por el {vehicleName}. ALEZZA va a revisar la solicitud y ponerse en contacto.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                {whatsappHref && (
                  <a href={whatsappHref} target="_blank" rel="noreferrer" className="rounded-lg bg-[#173B68] px-5 py-3 font-semibold text-white hover:bg-[#24558B]">
                    Continuar por WhatsApp
                  </a>
                )}
                {emailHref && (
                  <a href={emailHref} className="rounded-lg border border-[#173B68] px-5 py-3 font-semibold text-[#173B68] hover:bg-[#F5F8FB]">
                    Continuar por correo
                  </a>
                )}
                <Link href="/#catalogo" className="rounded-lg border border-gray-200 px-5 py-3 font-semibold text-gray-700 hover:bg-gray-50">
                  Volver al catálogo
                </Link>
              </div>
            </>
          ) : (
            <>
              <h1 className="mt-3 text-2xl font-bold text-[#173B68]">Consultar por {vehicleName}</h1>
              <p className="mt-3 leading-7 text-gray-600">
                Dejanos tus datos y tu consulta. No implica reserva ni compromiso de compra.
              </p>
              <p className="mt-2 text-xs text-gray-500">
                Usaremos tus datos para responder esta consulta.
              </p>
              {vehicle.status === "reserved" && (
                <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                  Esta unidad figura reservada. Podés consultar su disponibilidad.
                </p>
              )}

              <form onSubmit={submitInquiry} className="mt-7 space-y-5">
                <label className="block text-sm font-medium text-gray-700">
                  Nombre
                  <input required maxLength={120} autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} className={inputClass} />
                </label>
                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Teléfono
                    <input type="tel" maxLength={40} autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} className={inputClass} placeholder="223 555 1234" />
                  </label>
                  <label className="block text-sm font-medium text-gray-700">
                    Correo
                    <input type="email" maxLength={254} autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} placeholder="vos@correo.com" />
                  </label>
                </div>
                <p className="-mt-3 text-xs text-gray-500">Completá al menos uno para que podamos responderte.</p>
                <label className="block text-sm font-medium text-gray-700">
                  ¿Qué querés saber?
                  <textarea maxLength={1000} rows={4} value={message} onChange={(event) => setMessage(event.target.value)} className={inputClass} placeholder="Consultá por disponibilidad, financiación, permuta u otro detalle." />
                </label>
                {error && (
                  <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                    <p>{error}</p>
                    <div className="mt-3 flex flex-wrap gap-3 font-semibold">
                      {whatsappHref && <a href={whatsappHref} target="_blank" rel="noreferrer" className="underline">WhatsApp</a>}
                      {emailHref && <a href={emailHref} className="underline">Correo</a>}
                    </div>
                  </div>
                )}
                <button type="submit" disabled={busy} className="w-full rounded-lg bg-[#173B68] px-5 py-4 font-semibold text-white transition hover:bg-[#24558B] disabled:cursor-not-allowed disabled:opacity-60">
                  {busy ? "Enviando consulta..." : "Enviar consulta"}
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
