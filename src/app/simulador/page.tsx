"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getWhatsAppUrl } from "@/lib/whatsapp";
import { SitioCabecera, SitioPie } from "@/components/SitioMarco";
import AsesorCompra, { type DatosTasacion } from "@/components/AsesorCompra";

type PhotoKey =
  | "front"
  | "rear"
  | "left"
  | "right"
  | "interior"
  | "dashboard";

type PhotoSelection = { file: File; preview: string };
type Photos = Partial<Record<PhotoKey, PhotoSelection>>;
type PendingPhotoUpload = {
  paths: Partial<Record<PhotoKey, string>>;
  failedSlots: PhotoKey[];
};

type DesiredVehicle = {
  id: string;
  brand: string;
  model: string;
  version: string | null;
  year: number;
};

const photoSlots: { key: PhotoKey; label: string; detail: string }[] = [
  { key: "front", label: "Frente", detail: "Vista frontal completa" },
  { key: "rear", label: "Parte trasera", detail: "Vista trasera completa" },
  { key: "left", label: "Lateral izquierdo", detail: "Costado completo" },
  { key: "right", label: "Lateral derecho", detail: "Costado completo" },
  { key: "interior", label: "Interior", detail: "Asientos y habitáculo" },
  { key: "dashboard", label: "Tablero y kilometraje", detail: "Kilómetros visibles" },
];

// Marcas más comunes en Argentina: sugerencias para escribir igual que en las referencias de mercado.
const MARCAS = ["Chevrolet", "Citroën", "Fiat", "Ford", "Honda", "Hyundai", "Jeep", "Kia", "Mercedes Benz", "Nissan", "Peugeot", "Renault", "Toyota", "Volkswagen", "Audi", "BMW", "Chery", "Dodge", "RAM", "Suzuki"];

const initialVehicle = {
  brand: "",
  model: "",
  version: "",
  year: "",
  kilometers: "",
  fuel: "",
  transmission: "",
  condition: "",
  notes: "",
};

const inputClass =
  "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100";

export default function SimulatorPage() {
  const [desiredVehicle, setDesiredVehicle] = useState<DesiredVehicle | null>(null);
  const [desiredVehicleLoading, setDesiredVehicleLoading] = useState(false);
  const [desiredVehicleWarning, setDesiredVehicleWarning] = useState("");
  const [vehicle, setVehicle] = useState(initialVehicle);
  const [customer, setCustomer] = useState({
    name: "",
    phone: "",
    email: "",
  });
  const [photos, setPhotos] = useState<Photos>({});
  const photosRef = useRef<Photos>({});
  const [pendingPhotoUpload, setPendingPhotoUpload] =
    useState<PendingPhotoUpload | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [tasacion, setTasacion] = useState<DatosTasacion | null>(null);

  useEffect(() => {
    const desiredVehicleId = new URLSearchParams(window.location.search).get(
      "desired_vehicle_id"
    );

    if (!desiredVehicleId) return;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(desiredVehicleId)) {
      // The query string is external state; show feedback after validating it.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDesiredVehicleWarning("El vehículo del enlace no es válido. Podés continuar sin seleccionarlo.");
      return;
    }

    let active = true;
    setDesiredVehicleLoading(true);

    async function loadDesiredVehicle() {
      try {
        const { data, error: queryError } = await supabase
          .from("vehicles")
          .select("id, brand, model, version, year")
          .eq("id", desiredVehicleId)
          .eq("is_published", true)
          .in("status", ["available", "reserved"])
          .maybeSingle();

        if (!active) return;

        if (queryError || !data) {
          setDesiredVehicleWarning(
            "Ese vehículo ya no está disponible en el catálogo. Podés continuar sin seleccionarlo."
          );
        } else {
          setDesiredVehicle(data as DesiredVehicle);
        }
      } catch {
        if (!active) return;
        setDesiredVehicleWarning(
          "No pudimos cargar el vehículo elegido. Podés continuar sin seleccionarlo."
        );
      } finally {
        if (active) setDesiredVehicleLoading(false);
      }
    }

    void loadDesiredVehicle();

    return () => {
      active = false;
    };
  }, []);

  useEffect(
    () => () => {
      Object.values(photosRef.current).forEach((photo) => {
        if (photo) URL.revokeObjectURL(photo.preview);
      });
    },
    []
  );

  function updateVehicle(
    field: keyof typeof initialVehicle,
    value: string
  ) {
    setVehicle((current) => ({ ...current, [field]: value }));
  }

  function updateCustomer(field: keyof typeof customer, value: string) {
    setCustomer((current) => ({ ...current, [field]: value }));
  }

  function handlePhoto(key: PhotoKey, file?: File) {
    setError("");

    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Formato no permitido. Usá JPG, PNG o WEBP.");
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setError("Cada fotografía debe pesar menos de 8 MB.");
      return;
    }

    const previousPhoto = photosRef.current[key];
    if (previousPhoto) URL.revokeObjectURL(previousPhoto.preview);

    const updatedPhotos = {
      ...photosRef.current,
      [key]: { file, preview: URL.createObjectURL(file) },
    };
    photosRef.current = updatedPhotos;
    setPhotos(updatedPhotos);
  }

  function resetSubmissionForm() {
    setVehicle(initialVehicle);
    setCustomer({ name: "", phone: "", email: "" });
    Object.values(photosRef.current).forEach((photo) => {
      if (photo) URL.revokeObjectURL(photo.preview);
    });
    photosRef.current = {};
    setPhotos({});
    setPendingPhotoUpload(null);
  }

  function isAlreadyUploadedError(error: {
    code?: string;
    statusCode?: string;
    message: string;
  }) {
    const code = error.code?.toLowerCase();

    return (
      code === "resourcealreadyexists" ||
      code === "keyalreadyexists" ||
      code === "duplicate" ||
      code === "already_exists" ||
      (error.statusCode === "409" && /already exists/i.test(error.message)) ||
      (error.statusCode === "400" && /asset already exists/i.test(error.message))
    );
  }

  async function uploadPhotoSlots(
    slotsToUpload: PhotoKey[],
    paths: Partial<Record<PhotoKey, string>>
  ) {
    const failedSlots: PhotoKey[] = [];

    for (const slot of photoSlots) {
      if (!slotsToUpload.includes(slot.key)) continue;

      const file = photos[slot.key]?.file;
      const path = paths[slot.key];
      if (!file || !path) {
        failedSlots.push(slot.key);
        continue;
      }

      try {
        const { error: uploadError } = await supabase.storage
          .from("trade-vehicle-photos")
          .upload(path, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type,
          });

        if (uploadError) {
          if (isAlreadyUploadedError(uploadError)) continue;
          console.warn(`No se pudo subir la foto ${slot.label}:`, uploadError.message);
          failedSlots.push(slot.key);
        }
      } catch {
        console.warn(`No se pudo subir la foto ${slot.label}.`);
        failedSlots.push(slot.key);
      }
    }

    return failedSlots;
  }

  async function retryPendingPhotoUploads() {
    if (!pendingPhotoUpload || loading) return;

    setLoading(true);
    setError("");
    setMessage("");

    const failedSlots = await uploadPhotoSlots(
      pendingPhotoUpload.failedSlots,
      pendingPhotoUpload.paths
    );

    if (failedSlots.length > 0) {
      setPendingPhotoUpload({
        ...pendingPhotoUpload,
        failedSlots,
      });
      setMessage(
        `La solicitud ya está registrada. Todavía no se pudieron subir estas fotos: ${failedSlots.map((key) => photoSlots.find((slot) => slot.key === key)?.label ?? key).join(", ")}. Podés volver a intentar sin duplicar la solicitud.`
      );
    } else {
      setMessage("Solicitud recibida correctamente y fotografías cargadas.");
      resetSubmissionForm();
    }

    setLoading(false);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading || desiredVehicleLoading) return;
    setError("");
    setMessage("");

    if (pendingPhotoUpload) {
      await retryPendingPhotoUploads();
      return;
    }

    const phone = customer.phone.trim();
    const email = customer.email.trim();

    if (!phone && !email) {
      setError("Dejanos un WhatsApp o un correo para poder responderte.");
      return;
    }

    if (phone && !getWhatsAppUrl(phone)) {
      setError("Ingresá un número de WhatsApp válido con código de área.");
      return;
    }

    const missingPhotos = photoSlots.filter((slot) => !photos[slot.key]?.file);

    if (missingPhotos.length > 0) {
      setError("Necesitamos las seis fotografías obligatorias para continuar.");
      return;
    }

    const year = Number(vehicle.year);
    const kilometers = Number(vehicle.kilometers);

    if (!Number.isInteger(year) || year < 1950 || year > new Date().getFullYear() + 1) {
      setError("Revisá el año del vehículo.");
      return;
    }

    if (!Number.isInteger(kilometers) || kilometers < 0 || kilometers > 2000000) {
      setError("Revisá el kilometraje ingresado.");
      return;
    }

    setLoading(true);

    const uploadedPhotos: Record<string, string> = {};
    const uploadBatchId = crypto.randomUUID();

    try {
      for (const slot of photoSlots) {
        const file = photos[slot.key]?.file;

        if (!file) {
          throw new Error("Falta una fotografía obligatoria.");
        }

        const extension =
          file.type === "image/png"
            ? "png"
            : file.type === "image/webp"
              ? "webp"
              : "jpg";

        const path = `inbox/${uploadBatchId}/${slot.key}-${crypto.randomUUID()}.${extension}`;
        uploadedPhotos[slot.key] = path;
      }

      const { error: insertError } = await supabase
        .from("opportunities")
        .insert({
          customer_name: customer.name.trim() || null,
          phone: customer.phone.trim() || null,
          email: customer.email.trim() || null,
          desired_vehicle_id: desiredVehicle?.id ?? null,
          status: "new",
          customer_notes: vehicle.notes.trim() || null,
          trade_vehicle: {
            ...vehicle,
            year,
            kilometers,
            photos: uploadedPhotos,
            condition: vehicle.condition,
          },
        });

      if (insertError) throw insertError;
      // Con la solicitud registrada, el asesor muestra la tasación estimada y qué auto le entra.
      setTasacion({ marca: vehicle.brand.trim(), modelo: vehicle.model.trim(), anio: year, km: kilometers, deseado: desiredVehicle?.id ?? null });

      const failedPhotoSlots = await uploadPhotoSlots(
        photoSlots.map((slot) => slot.key),
        uploadedPhotos
      );

      if (failedPhotoSlots.length > 0) {
        setPendingPhotoUpload({ paths: uploadedPhotos, failedSlots: failedPhotoSlots });
        setMessage(
          `La solicitud ya está registrada. No se pudieron subir estas fotos: ${failedPhotoSlots.map((key) => photoSlots.find((slot) => slot.key === key)?.label ?? key).join(", ")}. Reintentá la carga para completarla sin duplicar la solicitud.`
        );
      } else {
        setMessage("Solicitud recibida correctamente. El equipo de ALEZZA deberá revisar la información.");
        resetSubmissionForm();
      }
    } catch (err) {
      console.error("Error al enviar la solicitud:", err);
      setError(
        "No pudimos confirmar el envío. Conservamos los datos cargados; si no recibiste confirmación, contactanos antes de volver a enviar para evitar duplicar la solicitud."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="lp min-h-screen">
      <SitioCabecera activa="/simulador" />

      <section className="mx-auto max-w-3xl px-5 py-10 md:py-14">
        <div className="mb-9">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-blue-700">
            Tasación y permutas
          </p>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Contanos qué vehículo querés entregar
          </h1>
          <p className="mt-3 leading-relaxed text-slate-600">
            Completá los datos y cargá fotografías para iniciar la evaluación
            de tu vehículo. La tasación definitiva requiere revisión de ALEZZA.
          </p>
        </div>

        {(desiredVehicle || desiredVehicleWarning) && (
          <div
            role={desiredVehicle ? "status" : "alert"}
            className={`mb-6 rounded-xl border p-4 text-sm ${desiredVehicle ? "border-blue-200 bg-blue-50 text-blue-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}
          >
            {desiredVehicle ? (
              <>
                <p className="font-semibold">Vehículo que te interesa</p>
                <p className="mt-1">
                  {[desiredVehicle.brand, desiredVehicle.model, desiredVehicle.version]
                    .filter(Boolean)
                    .join(" ")} · {desiredVehicle.year}
                </p>
              </>
            ) : desiredVehicleWarning}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <fieldset
            disabled={Boolean(pendingPhotoUpload) || loading}
            className="contents"
          >
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
            <div className="mb-6">
              <h2 className="text-xl font-bold">01. Datos del vehículo</h2>
              <p className="mt-1 text-sm text-slate-500">
                Identificá la unidad que querés entregar.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="text-sm font-medium">
                Marca *
                <input
                  required
                  maxLength={60}
                  className={`${inputClass} mt-2`}
                  placeholder="Ej. Volkswagen"
                  list="marcas"
                  autoComplete="off"
                  value={vehicle.brand}
                  onChange={(e) => updateVehicle("brand", e.target.value)}
                />
                <datalist id="marcas">
                  {MARCAS.map((m) => <option key={m} value={m} />)}
                </datalist>
              </label>

              <label className="text-sm font-medium">
                Modelo *
                <input
                  required
                  maxLength={80}
                  className={`${inputClass} mt-2`}
                  placeholder="Ej. Amarok"
                  value={vehicle.model}
                  onChange={(e) => updateVehicle("model", e.target.value)}
                />
              </label>

              <label className="text-sm font-medium sm:col-span-2">
                Versión *
                <input
                  required
                  maxLength={100}
                  className={`${inputClass} mt-2`}
                  placeholder="Ej. Highline V6 3.0"
                  value={vehicle.version}
                  onChange={(e) => updateVehicle("version", e.target.value)}
                />
              </label>

              <label className="text-sm font-medium">
                Año *
                <input
                  required
                  type="number"
                  min="1950"
                  max={new Date().getFullYear() + 1}
                  className={`${inputClass} mt-2`}
                  placeholder="2020"
                  value={vehicle.year}
                  onChange={(e) => updateVehicle("year", e.target.value)}
                />
              </label>

              <label className="text-sm font-medium">
                Kilometraje *
                <input
                  required
                  type="number"
                  min="0"
                  max="2000000"
                  className={`${inputClass} mt-2`}
                  placeholder="85000"
                  value={vehicle.kilometers}
                  onChange={(e) => updateVehicle("kilometers", e.target.value)}
                />
              </label>

              <label className="text-sm font-medium">
                Combustible *
                <select
                  required
                  className={`${inputClass} mt-2`}
                  value={vehicle.fuel}
                  onChange={(e) => updateVehicle("fuel", e.target.value)}
                >
                  <option value="">Seleccionar</option>
                  <option value="Nafta">Nafta</option>
                  <option value="Diésel">Diésel</option>
                  <option value="GNC">GNC</option>
                  <option value="Híbrido">Híbrido</option>
                  <option value="Eléctrico">Eléctrico</option>
                </select>
              </label>

              <label className="text-sm font-medium">
                Transmisión *
                <select
                  required
                  className={`${inputClass} mt-2`}
                  value={vehicle.transmission}
                  onChange={(e) => updateVehicle("transmission", e.target.value)}
                >
                  <option value="">Seleccionar</option>
                  <option value="Manual">Manual</option>
                  <option value="Automática">Automática</option>
                </select>
              </label>

              <label className="text-sm font-medium sm:col-span-2">
                Estado general *
                <select
                  required
                  className={`${inputClass} mt-2`}
                  value={vehicle.condition}
                  onChange={(e) => updateVehicle("condition", e.target.value)}
                >
                  <option value="">Seleccionar</option>
                  <option value="Muy bueno">Muy bueno</option>
                  <option value="Bueno">Bueno</option>
                  <option value="Regular">Regular</option>
                  <option value="Necesita reparaciones">Necesita reparaciones</option>
                </select>
              </label>

              <label className="text-sm font-medium sm:col-span-2">
                Observaciones
                <textarea
                  rows={4}
                  maxLength={1500}
                  className={`${inputClass} mt-2`}
                  placeholder="Detalles, reparaciones pendientes, accesorios, daños conocidos..."
                  value={vehicle.notes}
                  onChange={(e) => updateVehicle("notes", e.target.value)}
                />
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
            <div className="mb-6">
              <h2 className="text-xl font-bold">02. Fotografías</h2>
              <p className="mt-1 text-sm text-slate-500">
                Necesitamos seis vistas para comenzar la evaluación visual.
                JPG, PNG o WEBP. Máximo 8 MB por imagen.
              </p>
            </div>

            {/* Todas juntas: se reparten en orden en las vistas que faltan. Después se puede tocar cada una para cambiarla. */}
            <label className="mb-4 flex cursor-pointer items-center justify-between gap-3 rounded-xl border-2 border-dashed border-slate-300 p-4 hover:border-[var(--tinta)]">
              <span>
                <span className="block font-semibold">Subir todas las fotos juntas</span>
                <span className="text-xs text-slate-500">
                  {Object.keys(photos).length} de {photoSlots.length} cargadas · se ordenan solas, después podés cambiar cualquiera
                </span>
              </span>
              <span className="shrink-0 rounded-lg bg-[var(--tinta)] px-4 py-2 text-sm font-semibold text-[var(--papel)]">Elegir fotos</span>
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  photoSlots.filter((s) => !photosRef.current[s.key]).forEach((s, i) => files[i] && handlePhoto(s.key, files[i]));
                  e.target.value = "";
                }}
              />
            </label>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {photoSlots.map((slot) => (
                <label key={slot.key} className="group block cursor-pointer">
                  <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-100 group-hover:border-[var(--tinta)]">
                    {photos[slot.key]?.preview ? (
                      <img src={photos[slot.key]?.preview} alt={`Fotografía: ${slot.label}`} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-center text-slate-400"><span className="block text-2xl">+</span><span className="text-xs">{slot.detail}</span></span>
                    )}
                    {photos[slot.key] && <span className="absolute right-1.5 top-1.5 rounded-full bg-[var(--tinta)] px-2 text-xs font-bold text-[var(--papel)]">✓</span>}
                  </div>
                  <span className="mt-1.5 block text-xs font-semibold">{slot.label}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    capture="environment"
                    className="sr-only"
                    onChange={(e) => { handlePhoto(slot.key, e.target.files?.[0]); e.target.value = ""; }}
                  />
                </label>
              ))}
            </div>

            <p className="mt-4 text-xs leading-relaxed text-slate-500">
              Las fotografías se almacenan en un espacio privado. No
              constituyen una inspección mecánica ni estructural.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
            <div className="mb-6">
              <h2 className="text-xl font-bold">03. Datos de contacto</h2>
              <p className="mt-1 text-sm text-slate-500">
                Completá WhatsApp o correo para que podamos responderte. El nombre es opcional.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="text-sm font-medium sm:col-span-2">
                Nombre
                <input
                  maxLength={120}
                  className={`${inputClass} mt-2`}
                  placeholder="Tu nombre"
                  value={customer.name}
                  onChange={(e) => updateCustomer("name", e.target.value)}
                />
              </label>

              <label className="text-sm font-medium">
                WhatsApp <span className="font-normal text-slate-500">(opcional si completás correo)</span>
                <input
                  type="tel"
                  maxLength={40}
                  className={`${inputClass} mt-2`}
                  placeholder="Código de área y número"
                  value={customer.phone}
                  onChange={(e) => updateCustomer("phone", e.target.value)}
                />
              </label>

              <label className="text-sm font-medium">
                Correo electrónico <span className="font-normal text-slate-500">(opcional si completás WhatsApp)</span>
                <input
                  type="email"
                  maxLength={254}
                  className={`${inputClass} mt-2`}
                  placeholder="correo@ejemplo.com"
                  value={customer.email}
                  onChange={(e) => updateCustomer("email", e.target.value)}
                />
              </label>
            </div>
          </section>
          </fieldset>

          {error && (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {message && (
            <div
              role="status"
              className={`rounded-xl border p-4 text-sm ${pendingPhotoUpload ? "border-amber-200 bg-amber-50 text-amber-900" : "border-green-200 bg-green-50 text-green-800"}`}
            >
              {message}
            </div>
          )}

          {tasacion && <AsesorCompra datos={tasacion} />}

          {pendingPhotoUpload && (
            <button
              type="button"
              disabled={loading}
              onClick={() => void retryPendingPhotoUploads()}
              className="w-full rounded-xl border border-blue-900 bg-white px-6 py-4 font-semibold text-blue-900 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Reintentando fotografías..." : "Reintentar carga de fotografías"}
            </button>
          )}

          <button
            type="submit"
            disabled={loading || desiredVehicleLoading || Boolean(pendingPhotoUpload)}
            className="w-full rounded-xl bg-blue-900 px-6 py-4 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {desiredVehicleLoading
              ? "Cargando vehículo elegido..."
              : loading
                ? "Enviando solicitud..."
                : pendingPhotoUpload
                  ? "Solicitud registrada; completá las fotografías pendientes"
                  : "Enviar vehículo para evaluación"}
          </button>

          <p className="text-center text-xs leading-relaxed text-slate-500">
            La información enviada es una solicitud de evaluación, no una
            oferta de compra ni una tasación definitiva.
          </p>
        </form>
      </section>

      <SitioPie />
    </main>
  );
}
