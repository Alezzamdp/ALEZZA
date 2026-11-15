"use client";

import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import { logAdminActivity } from "@/lib/audit-log";
import Logo from "@/components/Logo";
import Cargando from "@/components/Cargando";

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
  currency: string;
  status: string;
  description: string | null;
  image_urls: string[];
  is_published: boolean;
};

type VehicleForm = {
  brand: string;
  model: string;
  version: string;
  year: string;
  kilometers: string;
  fuel: string;
  transmission: string;
  price_ars: string;
  price_usd: string;
  currency: string;
  status: string;
  description: string;
  image_urls: string;
  is_published: boolean;
};

const emptyForm: VehicleForm = {
  brand: "",
  model: "",
  version: "",
  year: String(new Date().getFullYear()),
  kilometers: "",
  fuel: "Nafta",
  transmission: "Manual",
  price_ars: "",
  price_usd: "",
  currency: "ARS",
  status: "available",
  description: "",
  image_urls: "",
  is_published: false,
};

const inputClass =
  "mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-3 text-base text-white outline-none focus:border-sky-400";

const labelClass = "block text-base font-medium text-slate-300";

function getStoredPhotoPaths(vehicleId: string, imageUrls: string[]) {
  const objectPrefix = `/storage/v1/object/public/vehicle-photos/vehicles/${vehicleId}/`;
  const storageOrigin = new URL(
    supabase.storage.from("vehicle-photos").getPublicUrl("probe").data.publicUrl
  ).origin;

  const paths = imageUrls.flatMap((imageUrl) => {
    try {
      const parsedUrl = new URL(imageUrl);
      if (
        parsedUrl.origin !== storageOrigin ||
        !parsedUrl.pathname.startsWith(objectPrefix)
      ) {
        return [];
      }

      const bucketPrefix = "/storage/v1/object/public/vehicle-photos/";
      return [decodeURIComponent(parsedUrl.pathname.slice(bucketPrefix.length))];
    } catch {
      return [];
    }
  });

  return Array.from(new Set(paths));
}

export default function AdminVehiclesPage() {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<VehicleForm>(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  async function loadVehicles() {
    const { data, error } = await supabase
      .from("vehicles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage("No se pudieron cargar los vehículos: " + error.message);
      return;
    }

    setVehicles((data ?? []) as Vehicle[]);
  }

  async function verifyAdmin(userId: string, userEmail: string) {
    const { data, error } = await supabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !data) {
      setAuthorized(false);
      setMessage("Esta cuenta no tiene permisos de administrador.");
      return;
    }

    setEmail(userEmail);
    setAuthorized(true);
    setMessage("");
    await loadVehicles();
  }

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getSession();

      if (data.session?.user) {
        await verifyAdmin(
          data.session.user.id,
          data.session.user.email ?? ""
        );
      }

      setLoading(false);
    }

    init();
  }, []);

  function updateField<K extends keyof VehicleForm>(
    key: K,
    value: VehicleForm[K]
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function startNewVehicle() {
    setSelectedFiles([]);
    setEditingId(null);
    setForm({ ...emptyForm });
    setMessage("");
    setShowForm(true);
  }

  function startEditing(vehicle: Vehicle) {
    setSelectedFiles([]);
    setEditingId(vehicle.id);
    setForm({
      brand: vehicle.brand ?? "",
      model: vehicle.model ?? "",
      version: vehicle.version ?? "",
      year: String(vehicle.year ?? ""),
      kilometers: vehicle.kilometers == null ? "" : String(vehicle.kilometers),
      fuel: vehicle.fuel ?? "",
      transmission: vehicle.transmission ?? "",
      price_ars: vehicle.price_ars == null ? "" : String(vehicle.price_ars),
      price_usd: vehicle.price_usd == null ? "" : String(vehicle.price_usd),
      currency: vehicle.currency ?? "ARS",
      status: vehicle.status ?? "available",
      description: vehicle.description ?? "",
      image_urls: (vehicle.image_urls ?? []).join("\n"),
      is_published: vehicle.is_published,
    });
    setMessage("");
    setShowForm(true);
  }

  async function saveVehicle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const year = Number(form.year);
    const kilometers = form.kilometers.trim()
      ? Number(form.kilometers)
      : null;

    if (!form.brand.trim() || !form.model.trim()) {
      setMessage("Completá marca y modelo.");
      return;
    }

    if (!Number.isInteger(year) || year < 1950 || year > 2100) {
      setMessage("Ingresá un año válido.");
      return;
    }

    if (
      kilometers !== null &&
      (!Number.isFinite(kilometers) || kilometers < 0)
    ) {
      setMessage("Ingresá un kilometraje válido.");
      return;
    }

    const imageUrls = form.image_urls
      .split(/\n|,/)
      .map((url) => url.trim())
      .filter(Boolean);

    if (imageUrls.some((url) => !/^https?:\/\//i.test(url))) {
      setMessage("Cada fotografía debe tener una dirección URL válida (https://...).");
      return;
    }

    const priceArs = form.price_ars.trim()
      ? Number(form.price_ars)
      : null;
    const priceUsd = form.price_usd.trim()
      ? Number(form.price_usd)
      : null;

    if (
      (priceArs !== null && (!Number.isFinite(priceArs) || priceArs < 0)) ||
      (priceUsd !== null && (!Number.isFinite(priceUsd) || priceUsd < 0))
    ) {
      setMessage("Revisá los precios ingresados.");
      return;
    }

    const payload = {
      brand: form.brand.trim(),
      model: form.model.trim(),
      version: form.version.trim() || null,
      year,
      kilometers,
      fuel: form.fuel || null,
      transmission: form.transmission || null,
      price_ars: priceArs,
      price_usd: priceUsd,
      currency: form.currency,
      status: form.status,
      description: form.description.trim() || null,
      image_urls: imageUrls,
      is_published: form.is_published,
      updated_at: new Date().toISOString(),
    };
    const wasEditing = Boolean(editingId);
    const vehicleId = editingId ?? crypto.randomUUID();
    const previousVehicle = wasEditing
      ? vehicles.find((vehicle) => vehicle.id === vehicleId)
      : undefined;
    const previousPhotoPaths = getStoredPhotoPaths(
      vehicleId,
      previousVehicle?.image_urls ?? []
    );
    const uploadedPaths: string[] = [];
    const uploadedUrls: string[] = [];
    let vehicleSaved = false;

    setBusy(true);
    setMessage("");

    try {
      for (const file of selectedFiles) {
        const extension = file.type === "image/png"
          ? "png"
          : file.type === "image/webp"
            ? "webp"
            : "jpg";

        const path = `vehicles/${vehicleId}/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from("vehicle-photos")
          .upload(path, file, {
            contentType: file.type,
            upsert: false,
          });

        if (uploadError) throw uploadError;

        uploadedPaths.push(path);
        const { data: publicUrlData } = supabase.storage
          .from("vehicle-photos")
          .getPublicUrl(path);
        uploadedUrls.push(publicUrlData.publicUrl);
      }

      const finalImageUrls = [...imageUrls, ...uploadedUrls];
      const saveResult = wasEditing
        ? await supabase
            .from("vehicles")
            .update({ ...payload, image_urls: finalImageUrls })
            .eq("id", vehicleId)
            .select("id")
            .single()
        : await supabase
            .from("vehicles")
            .insert({ ...payload, id: vehicleId, image_urls: finalImageUrls });

      if (saveResult.error) throw saveResult.error;
      vehicleSaved = true;

      const retainedPhotoPaths = getStoredPhotoPaths(vehicleId, finalImageUrls);
      const removedPhotoPaths = previousPhotoPaths.filter(
        (path) => !retainedPhotoPaths.includes(path)
      );
      let photoCleanupFailed = false;

      if (removedPhotoPaths.length > 0) {
        try {
          const { error: photoError } = await supabase.storage
            .from("vehicle-photos")
            .remove(removedPhotoPaths);
          photoCleanupFailed = Boolean(photoError);
        } catch {
          photoCleanupFailed = true;
        }
      }

      const activityLogged = await logAdminActivity({
        action: wasEditing ? "vehicle_updated" : "vehicle_created",
        entityType: "vehicle",
        entityId: vehicleId,
        changes: {
          changed_fields: Object.keys(payload),
          uploaded_photos: uploadedUrls.length,
          removed_photos_requested: removedPhotoPaths.length,
          photo_cleanup_failed: photoCleanupFailed,
        },
      });

      const saveMessage = photoCleanupFailed
        ? "Vehículo guardado, pero no se pudieron limpiar algunas fotos anteriores."
        : wasEditing
          ? "Vehículo actualizado correctamente."
          : "Vehículo creado correctamente.";
      setMessage(
        activityLogged
          ? saveMessage
          : `${saveMessage} No se pudo guardar el registro de actividad.`
      );

      setShowForm(false);
      setEditingId(null);
      setForm({ ...emptyForm });
      setSelectedFiles([]);
      await loadVehicles();
    } catch (err) {
      let uploadCleanupFailed = false;
      if (!vehicleSaved && uploadedPaths.length > 0) {
        try {
          const { error: cleanupError } = await supabase.storage
            .from("vehicle-photos")
            .remove(uploadedPaths);
          uploadCleanupFailed = Boolean(cleanupError);
        } catch {
          uploadCleanupFailed = true;
        }
      }

      const details = err instanceof Error ? err.message : "Error desconocido";
      setMessage(
        `${vehicleSaved ? "El vehículo se guardó, pero hubo un error al finalizar" : "No se pudo guardar el vehículo"}: ${details}${
          uploadCleanupFailed ? " Algunas fotos temporales no pudieron limpiarse." : ""
        }`
      );
    } finally {
      setBusy(false);
    }
  }

  async function togglePublished(vehicle: Vehicle) {
    const nextValue = !vehicle.is_published;
    setBusy(true);
    setMessage("");

    const { error } = await supabase
      .from("vehicles")
      .update({
        is_published: nextValue,
        updated_at: new Date().toISOString(),
      })
      .eq("id", vehicle.id);

    if (error) {
      setMessage("No se pudo cambiar la publicación: " + error.message);
    } else {
      const activityLogged = await logAdminActivity({
        action: "vehicle_publication_changed",
        entityType: "vehicle",
        entityId: vehicle.id,
        changes: { from: vehicle.is_published, to: nextValue },
      });
      const publishMessage = nextValue
        ? "Vehículo publicado."
        : "Vehículo pausado.";
      setMessage(
        activityLogged
          ? publishMessage
          : `${publishMessage} No se pudo guardar el registro de actividad.`
      );
      await loadVehicles();
    }

    setBusy(false);
  }

  async function deleteVehicle(vehicle: Vehicle) {
    const confirmed = window.confirm(
      `¿Eliminar definitivamente ${vehicle.brand} ${vehicle.model}? Antes de borrar se verificará si hay oportunidades asociadas.`
    );

    if (!confirmed) return;

    setBusy(true);
    setMessage("");

    const {
      count: linkedOpportunityCount,
      error: linkedOpportunityError,
    } = await supabase
      .from("opportunities")
      .select("id", { count: "exact", head: true })
      .eq("desired_vehicle_id", vehicle.id);

    if (linkedOpportunityError || linkedOpportunityCount == null) {
      setMessage(
        "No se pudo comprobar si hay oportunidades asociadas. El vehículo no se eliminó."
      );
      setBusy(false);
      return;
    }

    if (linkedOpportunityCount > 0) {
      setMessage(
        `No se puede eliminar: ${linkedOpportunityCount} ${linkedOpportunityCount === 1 ? "oportunidad está asociada" : "oportunidades están asociadas"}. Pausá la publicación o marcá la unidad como vendida para conservar el historial.`
      );
      setBusy(false);
      return;
    }

    const { error } = await supabase
      .from("vehicles")
      .delete()
      .eq("id", vehicle.id);

    if (error) {
      setMessage(
        error.code === "23503" &&
          error.message.includes("opportunities_desired_vehicle_id_fkey")
          ? "No se puede eliminar este vehículo porque hay oportunidades asociadas. Pausá la publicación o marcá la unidad como vendida para conservar el historial."
          : error.code === "23503" &&
              error.message.includes("vehicle_inquiries_vehicle_id_fkey")
            ? "No se puede eliminar este vehículo porque hay consultas de compradores asociadas. Pausá la publicación o marcá la unidad como vendida para conservar el historial."
          : "No se pudo eliminar: " + error.message
      );
    } else {
      const photoPaths = getStoredPhotoPaths(vehicle.id, vehicle.image_urls ?? []);
      let photoCleanupFailed = false;

      if (photoPaths.length > 0) {
        try {
          const { error: photoError } = await supabase.storage
            .from("vehicle-photos")
            .remove(photoPaths);
          photoCleanupFailed = Boolean(photoError);
        } catch {
          photoCleanupFailed = true;
        }
      }

      const activityLogged = await logAdminActivity({
        action: "vehicle_deleted",
        entityType: "vehicle",
        entityId: vehicle.id,
        changes: {
          brand: vehicle.brand,
          model: vehicle.model,
          year: vehicle.year,
          catalog_photos_found: photoPaths.length,
          photo_cleanup_failed: photoCleanupFailed,
        },
      });
      const deleteMessage = photoCleanupFailed
        ? "Vehículo eliminado, pero no se pudieron limpiar todas sus fotos. Revisá las políticas de Storage."
        : "Vehículo eliminado y fotos del catálogo limpiadas.";
      setMessage(
        activityLogged
          ? deleteMessage
          : `${deleteMessage} La baja no quedó registrada en Actividad.`
      );
      await loadVehicles();
    }

    setBusy(false);
  }

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      setMessage("No se pudo iniciar sesión. Revisá tus datos.");
      setBusy(false);
      return;
    }

    await verifyAdmin(data.user.id, data.user.email ?? "");
    setPassword("");
    setBusy(false);
  }

  async function logout() {
    await supabase.auth.signOut();
    setAuthorized(false);
    setVehicles([]);
    setPassword("");
    setShowForm(false);
    setMessage("");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950"><Cargando frase="Puliendo el catálogo…" /></main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <Logo alto={20} />
            <h1 className="mt-2 text-2xl font-semibold">
              Administración de vehículos
            </h1>
            {authorized && (
              <p className="mt-1 text-sm text-slate-400">{email}</p>
            )}
          </div>

          {authorized && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={logout}
                className="rounded-lg border border-white/15 px-4 py-2 text-sm hover:bg-white/10"
              >
                Cerrar sesión
              </button>
            </div>
          )}
        </header>

        {!authorized ? (
          <section className="mx-auto max-w-md rounded-2xl border border-white/10 bg-white/[0.04] p-7">
            <h2 className="text-xl font-semibold">Acceso administrador</h2>
            <form onSubmit={login} className="mt-6 space-y-5">
              <label className={labelClass}>
                Correo electrónico
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                Contraseña
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                />
              </label>
              {message && <p className="text-sm text-red-400">{message}</p>}
              <button
                disabled={busy}
                className="w-full rounded-lg bg-sky-500 px-4 py-3 font-semibold text-slate-950 disabled:opacity-50"
              >
                {busy ? "Verificando..." : "Ingresar"}
              </button>
            </form>
          </section>
        ) : (
          <>
            <section className="mb-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
                <p className="text-sm text-slate-400">Total de vehículos</p>
                <p className="mt-2 text-3xl font-semibold">{vehicles.length}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
                <p className="text-sm text-slate-400">Publicados</p>
                <p className="mt-2 text-3xl font-semibold">
                  {vehicles.filter((v) => v.is_published).length}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
                <p className="text-sm text-slate-400">Sin publicar</p>
                <p className="mt-2 text-3xl font-semibold">
                  {vehicles.filter((v) => !v.is_published).length}
                </p>
              </div>
            </section>

            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">Catálogo</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Administrá los vehículos que ofrece ALEZZA.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={loadVehicles}
                  disabled={busy}
                  className="rounded-lg border border-white/15 px-4 py-2 text-sm hover:bg-white/10"
                >
                  Actualizar
                </button>
                <button
                  onClick={startNewVehicle}
                  className="rounded-lg bg-sky-500 px-5 py-3 text-base font-semibold text-slate-950 hover:bg-sky-400"
                >
                  + Agregar vehículo
                </button>
              </div>
            </div>

            {message && (
              <p className="mb-5 rounded-lg border border-sky-400/20 bg-sky-400/10 p-3 text-sm text-sky-200">
                {message}
              </p>
            )}

            {showForm && (
              <form
                onSubmit={saveVehicle}
                className="mb-8 rounded-2xl border border-sky-400/30 bg-white/[0.04] p-5 md:p-7"
              >
                <div className="mb-6 flex items-center justify-between gap-3">
                  <h2 className="text-xl font-semibold">
                    {editingId ? "Editar vehículo" : "Nuevo vehículo"}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="text-sm text-slate-400 hover:text-white"
                  >
                    Cancelar
                  </button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <label className={labelClass}>
                    Marca *
                    <input required value={form.brand} onChange={(e) => updateField("brand", e.target.value)} className={inputClass} placeholder="Toyota" />
                  </label>
                  <label className={labelClass}>
                    Modelo *
                    <input required value={form.model} onChange={(e) => updateField("model", e.target.value)} className={inputClass} placeholder="Corolla" />
                  </label>
                  <label className={labelClass}>
                    Versión
                    <input value={form.version} onChange={(e) => updateField("version", e.target.value)} className={inputClass} placeholder="XEI 2.0" />
                  </label>
                  <label className={labelClass}>
                    Año *
                    <input required type="number" min="1950" max="2100" value={form.year} onChange={(e) => updateField("year", e.target.value)} className={inputClass} />
                  </label>
                  <label className={labelClass}>
                    Kilómetros
                    <input type="number" min="0" value={form.kilometers} onChange={(e) => updateField("kilometers", e.target.value)} className={inputClass} placeholder="45000" />
                  </label>
                  <label className={labelClass}>
                    Combustible
                    <select value={form.fuel} onChange={(e) => updateField("fuel", e.target.value)} className={inputClass}>
                      <option>Nafta</option>
                      <option>Diésel</option>
                      <option>GNC</option>
                      <option>Híbrido</option>
                      <option>Eléctrico</option>
                    </select>
                  </label>
                  <label className={labelClass}>
                    Transmisión
                    <select value={form.transmission} onChange={(e) => updateField("transmission", e.target.value)} className={inputClass}>
                      <option>Manual</option>
                      <option>Automática</option>
                      <option>CVT</option>
                    </select>
                  </label>
                  <label className={labelClass}>
                    Precio en pesos (ARS)
                    <input type="number" min="0" value={form.price_ars} onChange={(e) => updateField("price_ars", e.target.value)} className={inputClass} placeholder="25000000" />
                  </label>
                  <label className={labelClass}>
                    Precio en dólares (USD)
                    <input type="number" min="0" value={form.price_usd} onChange={(e) => updateField("price_usd", e.target.value)} className={inputClass} placeholder="18000" />
                  </label>
                  <label className={labelClass}>
                    Moneda principal
                    <select value={form.currency} onChange={(e) => updateField("currency", e.target.value)} className={inputClass}>
                      <option value="ARS">Pesos argentinos</option>
                      <option value="USD">Dólares</option>
                    </select>
                  </label>
                  <label className={labelClass}>
                    Estado comercial
                    <select value={form.status} onChange={(e) => updateField("status", e.target.value)} className={inputClass}>
                      <option value="available">Disponible</option>
                      <option value="reserved">Reservado</option>
                      <option value="sold">Vendido</option>
                    </select>
                  </label>
                  <label className="flex items-center gap-3 pt-6 text-sm text-slate-300">
                    <input
                      type="checkbox"
                      checked={form.is_published}
                      onChange={(e) => updateField("is_published", e.target.checked)}
                      className="h-4 w-4 accent-sky-400"
                    />
                    Publicar en la web
                  </label>
                </div>

                <label className={`${labelClass} mt-5`}>
                  Descripción
                  <textarea
                    rows={4}
                    value={form.description}
                    onChange={(e) => updateField("description", e.target.value)}
                    className={inputClass}
                    placeholder="Equipamiento, estado general, mantenimiento..."
                  />
                </label>

                <div className={`${labelClass} mt-5`}>
                  Fotografías del vehículo
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files ?? []);
                      const invalid = files.find(
                        (file) =>
                          !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
                          file.size > 8 * 1024 * 1024
                      );

                      if (invalid) {
                        setMessage("Usá imágenes JPG, PNG o WEBP de hasta 8 MB cada una.");
                        e.target.value = "";
                        return;
                      }

                      setSelectedFiles(files);
                      setMessage("");
                    }}
                    className={`${inputClass} file:mr-3 file:rounded-md file:border-0 file:bg-sky-500 file:px-3 file:py-2 file:font-semibold file:text-slate-950`}
                  />
                  <span className="mt-1 block text-xs text-slate-500">
                    Podés seleccionar varias fotos desde la computadora o la fototeca del celular. Máximo 8 MB por imagen.
                  </span>
                  {selectedFiles.length > 0 && (
                    <div className="mt-2 space-y-1 text-xs text-sky-300">
                      {selectedFiles.map((file, index) => (
                        <p key={`${file.name}-${index}`}>{file.name}</p>
                      ))}
                    </div>
                  )}
                </div>

                <label className={`${labelClass} mt-5`}>
                  URLs adicionales (opcional, una por línea)
                  <textarea
                    rows={3}
                    value={form.image_urls}
                    onChange={(e) => updateField("image_urls", e.target.value)}
                    className={inputClass}
                    placeholder={"https://.../foto-frente.jpg"}
                  />
                  <span className="mt-1 block text-xs text-slate-500">
                    Las fotografías existentes se conservan. También podés agregar enlaces externos.
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={busy}
                  className="mt-6 rounded-lg bg-sky-500 px-6 py-3 font-semibold text-slate-950 disabled:opacity-50"
                >
                  {busy ? "Guardando..." : editingId ? "Guardar cambios" : "Crear vehículo"}
                </button>
              </form>
            )}

            <section className="grid gap-5 sm:grid-cols-2 2xl:grid-cols-3">
              {vehicles.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-white/[0.04] p-10 text-center text-slate-400">
                  Todavía no hay vehículos cargados en el catálogo.
                </div>
              ) : (
                vehicles.map((vehicle) => (
                  <article
                    key={vehicle.id}
                    className="flex flex-col overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] p-4 transition-colors hover:border-sky-400/30 md:p-5"
                  >
                                        {vehicle.image_urls?.length ? (
  <div className="relative mb-4 w-full max-w-none">
    <div
      data-vehicle-gallery
      className="flex aspect-square w-full snap-x snap-mandatory overflow-x-auto scroll-smooth rounded-lg border border-white/10 bg-slate-900"
      style={{ scrollbarWidth: "none" }}
    >
      {vehicle.image_urls.map((url, index) => (
        <div
          key={`${vehicle.id}-photo-${index}`}
          className="flex aspect-square w-full shrink-0 snap-center items-center justify-center p-3"
        >
          <img
            src={url}
            alt={`Foto ${index + 1} de ${vehicle.brand} ${vehicle.model}`}
            loading="lazy"
            className="h-full w-full object-contain"
          />
        </div>
      ))}
    </div>

    {vehicle.image_urls.length > 1 && (
      <>
        <button
          type="button"
          aria-label="Fotografía anterior"
          onClick={(event) => {
            const gallery = event.currentTarget.parentElement?.querySelector<HTMLDivElement>("[data-vehicle-gallery]");
            gallery?.scrollBy({ left: -gallery.clientWidth, behavior: "smooth" });
          }}
          className="absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-slate-950/80 text-white shadow-lg hover:bg-slate-800"
        >
          {"‹"}
        </button>

        <button
          type="button"
          aria-label="Fotografía siguiente"
          onClick={(event) => {
            const gallery = event.currentTarget.parentElement?.querySelector<HTMLDivElement>("[data-vehicle-gallery]");
            gallery?.scrollBy({ left: gallery.clientWidth, behavior: "smooth" });
          }}
          className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-slate-950/80 text-white shadow-lg hover:bg-slate-800"
        >
          {"›"}
        </button>

        <span className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-slate-950/80 px-3 py-1 text-xs text-white">
          {vehicle.image_urls.length} fotografías
        </span>
      </>
    )}
  </div>
) : (
  <div className="mb-5 grid aspect-square place-items-center rounded-lg border border-dashed border-white/15 bg-slate-900 text-sm text-slate-500">
    Sin fotografías cargadas
  </div>
)}
                    <div className="flex flex-1 flex-col justify-between gap-6">
                      <div>
                        <h3 className="text-xl font-semibold leading-tight tracking-tight md:text-2xl">
                          {vehicle.brand} {vehicle.model} {vehicle.version}
                        </h3>
                        <p className="mt-2 text-base text-slate-300">
                          {vehicle.year} · {vehicle.kilometers == null ? "Km no informados" : `${vehicle.kilometers.toLocaleString("es-AR")} km`}
                        </p>
                        <p className="mt-3 text-2xl font-semibold tracking-tight text-white">
                          {vehicle.currency === "USD" && vehicle.price_usd != null
                            ? `USD ${vehicle.price_usd.toLocaleString("es-AR")}`
                            : vehicle.price_ars != null
                              ? `$ ${vehicle.price_ars.toLocaleString("es-AR")}`
                              : "Precio a consultar"}
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2 text-sm">
                          <span className="rounded-full border border-white/15 px-3 py-1">
                            {vehicle.status === "available" ? "Disponible" : vehicle.status === "reserved" ? "Reservado" : vehicle.status === "sold" ? "Vendido" : vehicle.status}
                          </span>
                          <span className={`rounded-full px-3 py-1 ${vehicle.is_published ? "bg-emerald-400/10 text-emerald-300" : "bg-slate-700 text-slate-300"}`}>
                            {vehicle.is_published ? "Publicado" : "Sin publicar"}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => startEditing(vehicle)}
                          disabled={busy}
                          className="rounded-lg border border-white/15 px-3 py-2 text-sm hover:bg-white/10"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => togglePublished(vehicle)}
                          disabled={busy}
                          className="rounded-lg border border-sky-400/30 px-3 py-2 text-sm text-sky-300 hover:bg-sky-400/10"
                        >
                          {vehicle.is_published ? "Pausar" : "Publicar"}
                        </button>
                        <button
                          onClick={() => deleteVehicle(vehicle)}
                          disabled={busy}
                          className="rounded-lg border border-red-400/30 px-3 py-2 text-sm text-red-300 hover:bg-red-400/10"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
