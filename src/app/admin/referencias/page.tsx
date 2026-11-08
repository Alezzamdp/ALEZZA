"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { logAdminActivity } from "@/lib/audit-log";

type Comparable = {
  id: string;
  appraisal_id: string | null;
  brand: string;
  model: string;
  version: string | null;
  year: number | null;
  kilometers: number | null;
  location: string | null;
  listing_url: string | null;
  source: string | null;
  published_price: number | null;
  currency: string;
  published_at: string | null;
  observed_at: string;
  listing_status: string | null;
  notes: string | null;
};

type AppraisalOption = {
  id: string;
  created_at: string;
  currency: string;
  market_value_min: number | null;
  market_value_max: number | null;
  opportunity: {
    customer_name: string | null;
    trade_vehicle: {
      brand?: string;
      model?: string;
      version?: string;
      year?: string | number;
    } | null;
  } | null;
};

type ComparableForm = {
  appraisal_id: string;
  brand: string;
  model: string;
  version: string;
  year: string;
  kilometers: string;
  location: string;
  listing_url: string;
  source: string;
  published_price: string;
  currency: string;
  published_at: string;
  listing_status: string;
  notes: string;
};

const emptyForm: ComparableForm = {
  appraisal_id: "",
  brand: "",
  model: "",
  version: "",
  year: "",
  kilometers: "",
  location: "Mar del Plata",
  listing_url: "",
  source: "",
  published_price: "",
  currency: "ARS",
  published_at: "",
  listing_status: "Publicado",
  notes: "",
};

const inputClass =
  "mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-3 text-white outline-none focus:border-sky-400";

const labelClass = "block text-sm font-medium text-slate-300";

function money(value: number | null, currency: string) {
  if (value == null) return "Sin precio";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: currency || "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

function appraisalLabel(appraisal: AppraisalOption) {
  const vehicle = appraisal.opportunity?.trade_vehicle;
  const vehicleLabel = [vehicle?.brand, vehicle?.model, vehicle?.version, vehicle?.year]
    .filter(Boolean)
    .join(" ");
  const customer = appraisal.opportunity?.customer_name || "Cliente sin nombre";
  const date = new Date(appraisal.created_at).toLocaleDateString("es-AR");
  const marketRange = [appraisal.market_value_min, appraisal.market_value_max]
    .map((value) => value == null ? null : money(value, appraisal.currency))
    .filter(Boolean)
    .join(" a ");

  return `${vehicleLabel || "Vehículo sin datos"} · ${customer} · ${date} · ${marketRange || "Sin rango"}`;
}

function formatDateOnly(value: string | null) {
  if (!value) return "No informada";
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return "No informada";

  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

function formatObservedDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date(value));
}

export default function AdminReferencesPage() {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [comparables, setComparables] = useState<Comparable[]>([]);
  const [appraisals, setAppraisals] = useState<AppraisalOption[]>([]);
  const [form, setForm] = useState<ComparableForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const requestedAppraisalToLink = useRef<string | null>(null);

  function updateField<K extends keyof ComparableForm>(
    key: K,
    value: ComparableForm[K]
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  const loadComparables = useCallback(async (appraisalIdToOpen?: string) => {
    const [comparablesResult, appraisalsResult] = await Promise.all([
      supabase
        .from("comparables")
        .select("*")
        .order("observed_at", { ascending: false }),
      supabase
        .from("appraisals")
        .select("id, created_at, currency, market_value_min, market_value_max, opportunity:opportunities!appraisals_opportunity_id_fkey(customer_name, trade_vehicle)")
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

    if (comparablesResult.error) {
      setMessage("No se pudieron cargar las referencias: " + comparablesResult.error.message);
      return;
    }

    setComparables((comparablesResult.data ?? []) as Comparable[]);
    if (appraisalsResult.error) {
      setAppraisals([]);
      setMessage("Se cargaron las referencias, pero no pudimos cargar las tasaciones para vincularlas: " + appraisalsResult.error.message);
    } else {
      setAppraisals(
        (appraisalsResult.data ?? []).map((item) => ({
          ...item,
          opportunity: Array.isArray(item.opportunity)
            ? item.opportunity[0] ?? null
            : item.opportunity,
        })) as AppraisalOption[]
      );
    }

    if (appraisalIdToOpen) {
      setEditingId(null);
      setForm({ ...emptyForm, appraisal_id: appraisalIdToOpen });
      setShowForm(true);
      requestedAppraisalToLink.current = null;
    }
  }, []);

  const verifyAdmin = useCallback(async (userId: string, userEmail: string) => {
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
    await loadComparables(requestedAppraisalToLink.current ?? undefined);
  }, [loadComparables]);

  useEffect(() => {
    async function init() {
      const appraisalId = new URLSearchParams(window.location.search).get("appraisal_id");
      if (
        appraisalId &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(appraisalId)
      ) {
        requestedAppraisalToLink.current = appraisalId;
      }

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
  }, [verifyAdmin]);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    setBusy(true);
    setMessage("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      setMessage(error?.message ?? "No se pudo iniciar sesión.");
      setBusy(false);
      return;
    }

    await verifyAdmin(data.user.id, data.user.email ?? "");
    setPassword("");
    setBusy(false);
  }

  function startNew() {
    setEditingId(null);
    setForm({ ...emptyForm });
    setShowForm(true);
    setMessage("");
  }

  function startEditing(item: Comparable) {
    setEditingId(item.id);
    setForm({
      appraisal_id: item.appraisal_id ?? "",
      brand: item.brand ?? "",
      model: item.model ?? "",
      version: item.version ?? "",
      year: item.year == null ? "" : String(item.year),
      kilometers: item.kilometers == null ? "" : String(item.kilometers),
      location: item.location ?? "",
      listing_url: item.listing_url ?? "",
      source: item.source ?? "",
      published_price: item.published_price == null ? "" : String(item.published_price),
      currency: item.currency ?? "ARS",
      published_at: item.published_at ?? "",
      listing_status: item.listing_status ?? "Publicado",
      notes: item.notes ?? "",
    });
    setShowForm(true);
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveComparable(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const year = form.year.trim() ? Number(form.year) : null;
    const kilometers = form.kilometers.trim()
      ? Number(form.kilometers)
      : null;
    const price = Number(form.published_price);

    if (!form.brand.trim() || !form.model.trim()) {
      setMessage("Completá marca y modelo.");
      return;
    }

    if (!Number.isFinite(price) || price <= 0) {
      setMessage("Ingresá un precio válido.");
      return;
    }

    if (year !== null && (!Number.isInteger(year) || year < 1950 || year > new Date().getFullYear() + 1)) {
      setMessage("Revisá el año ingresado.");
      return;
    }

    if (kilometers !== null && (!Number.isInteger(kilometers) || kilometers < 0 || kilometers > 2000000)) {
      setMessage("Revisá el kilometraje ingresado.");
      return;
    }

    let listingUrl: string | null = null;
    if (form.listing_url.trim()) {
      try {
        const parsedUrl = new URL(form.listing_url.trim());
        if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
          setMessage("El enlace debe usar HTTP o HTTPS.");
          return;
        }
        listingUrl = parsedUrl.href;
      } catch {
        setMessage("El enlace de publicación no es válido.");
        return;
      }
    }

    const payload = {
      appraisal_id: form.appraisal_id || null,
      brand: form.brand.trim(),
      model: form.model.trim(),
      version: form.version.trim() || null,
      year,
      kilometers,
      location: form.location.trim() || null,
      listing_url: listingUrl,
      source: form.source.trim() || null,
      published_price: price,
      currency: form.currency,
      published_at: form.published_at || null,
      listing_status: form.listing_status || null,
      notes: form.notes.trim() || null,
    };

    setBusy(true);
    setMessage("");

    if (listingUrl) {
      const listingQuery = supabase
        .from("comparables")
        .select("id")
        .eq("listing_url", listingUrl);
      const appraisalScopedQuery = payload.appraisal_id
        ? listingQuery.eq("appraisal_id", payload.appraisal_id)
        : listingQuery.is("appraisal_id", null);
      const duplicateQuery = editingId
        ? appraisalScopedQuery.neq("id", editingId)
        : appraisalScopedQuery;
      const { data: duplicate, error: duplicateError } = await duplicateQuery
        .limit(1)
        .maybeSingle();

      if (duplicateError) {
        setMessage("No se pudo comprobar si el enlace ya está cargado: " + duplicateError.message);
        setBusy(false);
        return;
      }

      if (duplicate) {
        setMessage(
          "Ese enlace ya está cargado para esta tasación. Revisá la referencia existente antes de agregar otra."
        );
        setBusy(false);
        return;
      }
    }

    const result = editingId
      ? await supabase.from("comparables").update(payload).eq("id", editingId).select("id").single()
      : await supabase.from("comparables").insert(payload).select("id").single();

    if (result.error) {
      setMessage("No se pudo guardar la referencia: " + result.error.message);
      setBusy(false);
      return;
    }

    const activityLogged = await logAdminActivity({
      action: editingId ? "comparable_updated" : "comparable_created",
      entityType: "comparable",
      entityId: editingId ?? result.data.id,
      changes: { changed_fields: Object.keys(payload) },
    });

    const saveMessage = editingId
      ? "Referencia actualizada correctamente."
      : "Referencia agregada correctamente.";
    setMessage(
      activityLogged
        ? saveMessage
        : `${saveMessage} No se pudo guardar el registro de actividad.`
    );
    setForm({ ...emptyForm });
    setEditingId(null);
    setShowForm(false);
    await loadComparables();
    setBusy(false);
  }

  async function deleteComparable(item: Comparable) {
    const confirmed = window.confirm(
      `¿Eliminar la referencia ${item.brand} ${item.model} ${item.year ?? ""}?`
    );

    if (!confirmed || busy) return;

    setBusy(true);
    setMessage("");

    const { error } = await supabase
      .from("comparables")
      .delete()
      .eq("id", item.id);

    if (error) {
      setMessage("No se pudo eliminar: " + error.message);
    } else {
      const activityLogged = await logAdminActivity({
        action: "comparable_deleted",
        entityType: "comparable",
        entityId: item.id,
        changes: {
          brand: item.brand,
          model: item.model,
          year: item.year,
        },
      });
      setMessage(
        activityLogged
          ? "Referencia eliminada."
          : "Referencia eliminada, pero no se pudo guardar el registro de actividad."
      );
      await loadComparables();
    }

    setBusy(false);
  }

  async function logout() {
    await supabase.auth.signOut();
    setAuthorized(false);
    setComparables([]);
    setAppraisals([]);
    setPassword("");
    setShowForm(false);
    setMessage("");
  }

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return comparables;

    return comparables.filter((item) =>
      [
        item.brand,
        item.model,
        item.version,
        item.year,
        item.location,
        item.source,
        item.listing_status,
      ].some((value) => String(value ?? "").toLowerCase().includes(term))
    );
  }, [comparables, search]);

  if (loading) {
    return (
      <main className="min-h-screen grid place-items-center bg-slate-950 text-white">
        Verificando acceso...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <p className="text-sm font-semibold tracking-[0.3em] text-sky-400">ALEZZA</p>
            <h1 className="mt-2 text-2xl font-semibold">Referencias de mercado</h1>
            {authorized && <p className="mt-1 text-sm text-slate-400">{email}</p>}
          </div>

          {authorized && (
            <div className="flex flex-wrap gap-2">
              <Link href="/admin" className="rounded-lg border border-white/15 px-4 py-2 text-sm hover:bg-white/10">
                Oportunidades
              </Link>
              <Link href="/admin/vehiculos" className="rounded-lg border border-white/15 px-4 py-2 text-sm hover:bg-white/10">
                Catálogo
              </Link>
              <Link href="/admin/actividad" className="rounded-lg border border-white/15 px-4 py-2 text-sm hover:bg-white/10">
                Actividad
              </Link>
              <Link href="/admin/configuracion" className="rounded-lg border border-white/15 px-4 py-2 text-sm hover:bg-white/10">
                Configuración
              </Link>
              <button onClick={logout} className="rounded-lg border border-white/15 px-4 py-2 text-sm hover:bg-white/10">
                Cerrar sesión
              </button>
            </div>
          )}
        </header>

        {!authorized ? (
          <section className="mx-auto max-w-md rounded-2xl border border-white/10 bg-white/[0.04] p-7">
            <h2 className="text-xl font-semibold">Acceso administrador</h2>
            <form onSubmit={login} className="mt-6 space-y-5">
              <label className="block text-sm">
                Correo electrónico
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
              </label>
              <label className="block text-sm">
                Contraseña
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
              </label>
              {message && <p className="text-sm text-red-400">{message}</p>}
              <button disabled={busy} className="w-full rounded-lg bg-sky-500 px-4 py-3 font-semibold text-slate-950 disabled:opacity-50">
                {busy ? "Verificando..." : "Ingresar"}
              </button>
            </form>
          </section>
        ) : (
          <>
            <section className="mb-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
                <p className="text-sm text-slate-400">Referencias cargadas</p>
                <p className="mt-2 text-3xl font-semibold">{comparables.length}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
                <p className="text-sm text-slate-400">En pesos</p>
                <p className="mt-2 text-3xl font-semibold">{comparables.filter((v) => v.currency === "ARS").length}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
                <p className="text-sm text-slate-400">En dólares</p>
                <p className="mt-2 text-3xl font-semibold">{comparables.filter((v) => v.currency === "USD").length}</p>
              </div>
            </section>

            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-semibold">Base de comparables</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Referencias ingresadas manualmente para dar contexto a las tasaciones.
                </p>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por marca, modelo, año, versión o fuente..."
                  className={`${inputClass} max-w-xl`}
                />
              </div>
              <div className="flex gap-2">
                <button onClick={() => void loadComparables()} disabled={busy} className="rounded-lg border border-white/15 px-4 py-3 text-sm hover:bg-white/10">
                  Actualizar
                </button>
                <button onClick={startNew} className="rounded-lg bg-sky-500 px-5 py-3 font-semibold text-slate-950 hover:bg-sky-400">
                  + Agregar referencia
                </button>
              </div>
            </div>

            {message && (
              <p className="mb-5 rounded-lg border border-sky-400/20 bg-sky-400/10 p-3 text-sm text-sky-200">
                {message}
              </p>
            )}

            {showForm && (
              <form onSubmit={saveComparable} className="mb-8 rounded-2xl border border-sky-400/30 bg-white/[0.04] p-5 md:p-7">
                <div className="mb-6 flex items-center justify-between gap-3">
                  <h2 className="text-xl font-semibold">{editingId ? "Editar referencia" : "Nueva referencia"}</h2>
                  <button type="button" onClick={() => setShowForm(false)} className="text-sm text-slate-400 hover:text-white">
                    Cancelar
                  </button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <label className={labelClass}>Vincular a una tasación
                    <select
                      value={form.appraisal_id}
                      onChange={(e) => updateField("appraisal_id", e.target.value)}
                      className={inputClass}
                    >
                      <option value="">Referencia general, sin vincular</option>
                      {form.appraisal_id &&
                        !appraisals.some((appraisal) => appraisal.id === form.appraisal_id) && (
                          <option value={form.appraisal_id}>
                            Tasación vinculada fuera del listado reciente
                          </option>
                        )}
                      {appraisals.map((appraisal) => (
                        <option key={appraisal.id} value={appraisal.id}>
                          {appraisalLabel(appraisal)}
                        </option>
                      ))}
                    </select>
                    {appraisals.length === 0 && (
                      <span className="mt-1 block text-xs text-slate-500">
                        No hay tasaciones disponibles para vincular.
                      </span>
                    )}
                  </label>
                  <label className={labelClass}>Marca *
                    <input required value={form.brand} onChange={(e) => updateField("brand", e.target.value)} className={inputClass} placeholder="Toyota" />
                  </label>
                  <label className={labelClass}>Modelo *
                    <input required value={form.model} onChange={(e) => updateField("model", e.target.value)} className={inputClass} placeholder="Corolla" />
                  </label>
                  <label className={labelClass}>Versión
                    <input value={form.version} onChange={(e) => updateField("version", e.target.value)} className={inputClass} placeholder="XEI 2.0 CVT" />
                  </label>
                  <label className={labelClass}>Año
                    <input type="number" min="1950" max={new Date().getFullYear() + 1} value={form.year} onChange={(e) => updateField("year", e.target.value)} className={inputClass} placeholder="2021" />
                  </label>
                  <label className={labelClass}>Kilometraje
                    <input type="number" min="0" max="2000000" value={form.kilometers} onChange={(e) => updateField("kilometers", e.target.value)} className={inputClass} placeholder="65000" />
                  </label>
                  <label className={labelClass}>Precio publicado *
                    <input type="number" min="1" step="0.01" required value={form.published_price} onChange={(e) => updateField("published_price", e.target.value)} className={inputClass} placeholder="25000000" />
                  </label>
                  <label className={labelClass}>Moneda
                    <select value={form.currency} onChange={(e) => updateField("currency", e.target.value)} className={inputClass}>
                      <option value="ARS">Pesos argentinos (ARS)</option>
                      <option value="USD">Dólares (USD)</option>
                    </select>
                  </label>
                  <label className={labelClass}>Ubicación
                    <input value={form.location} onChange={(e) => updateField("location", e.target.value)} className={inputClass} placeholder="Mar del Plata" />
                  </label>
                  <label className={labelClass}>Fuente / portal
                    <input value={form.source} onChange={(e) => updateField("source", e.target.value)} className={inputClass} placeholder="Mercado Libre, agencia, particular..." />
                  </label>
                  <label className={labelClass}>Fecha de publicación
                    <input type="date" value={form.published_at} onChange={(e) => updateField("published_at", e.target.value)} className={inputClass} />
                  </label>
                  <label className={labelClass}>Estado del aviso
                    <select value={form.listing_status} onChange={(e) => updateField("listing_status", e.target.value)} className={inputClass}>
                      <option>Publicado</option>
                      <option>Reservado</option>
                      <option>Vendido</option>
                      <option>Finalizado</option>
                      <option>Referencia propia</option>
                    </select>
                  </label>
                  <label className={labelClass}>Enlace del aviso
                    <input type="url" value={form.listing_url} onChange={(e) => updateField("listing_url", e.target.value)} className={inputClass} placeholder="https://..." />
                  </label>
                </div>

                <label className={`${labelClass} mt-4 block`}>Observaciones
                  <textarea rows={3} value={form.notes} onChange={(e) => updateField("notes", e.target.value)} className={inputClass} placeholder="Estado, equipamiento, detalles relevantes..." />
                </label>

                <button type="submit" disabled={busy} className="mt-6 rounded-lg bg-sky-500 px-6 py-3 font-semibold text-slate-950 disabled:opacity-50">
                  {busy ? "Guardando..." : editingId ? "Guardar cambios" : "Guardar referencia"}
                </button>
              </form>
            )}

            <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
              {filtered.length === 0 ? (
                <p className="p-8 text-center text-slate-400">
                  {comparables.length === 0 ? "Todavía no hay referencias cargadas." : "No hay resultados para esa búsqueda."}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1050px] text-left text-sm">
                    <thead className="bg-white/[0.05] text-slate-400">
                      <tr>
                        <th className="px-4 py-4">Vehículo</th>
                        <th className="px-4 py-4">Tasación</th>
                        <th className="px-4 py-4">Año / km</th>
                        <th className="px-4 py-4">Precio</th>
                        <th className="px-4 py-4">Fechas</th>
                        <th className="px-4 py-4">Ubicación</th>
                        <th className="px-4 py-4">Fuente</th>
                        <th className="px-4 py-4">Estado</th>
                        <th className="px-4 py-4">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((item) => {
                        const linkedAppraisal = item.appraisal_id
                          ? appraisals.find((appraisal) => appraisal.id === item.appraisal_id)
                          : null;

                        return (
                          <tr key={item.id} className="border-t border-white/10">
                            <td className="px-4 py-4">
                              <p className="font-semibold">{item.brand} {item.model}</p>
                              <p className="mt-1 text-xs text-slate-400">{item.version || "Versión no informada"}</p>
                            </td>
                            <td className="max-w-xs px-4 py-4 text-xs leading-5 text-slate-300">
                              {linkedAppraisal
                                ? appraisalLabel(linkedAppraisal)
                                : item.appraisal_id
                                  ? "Tasación vinculada"
                                  : "Referencia general"}
                            </td>
                            <td className="px-4 py-4 text-slate-300">
                              {item.year ?? "—"}<br />
                              <span className="text-xs text-slate-500">
                                {item.kilometers != null
                                  ? `${item.kilometers.toLocaleString("es-AR")} km`
                                  : "Km no informados"}
                              </span>
                            </td>
                            <td className="px-4 py-4 font-semibold text-sky-300">
                              {money(item.published_price, item.currency)}
                            </td>
                            <td className="px-4 py-4 text-xs leading-5 text-slate-300">
                              <p>Publicada: {formatDateOnly(item.published_at)}</p>
                              <p className="text-slate-500">
                                Observada: {formatObservedDate(item.observed_at)}
                              </p>
                            </td>
                            <td className="px-4 py-4 text-slate-300">{item.location || "—"}</td>
                            <td className="px-4 py-4 text-slate-300">
                              {item.source || "—"}
                              {item.listing_url && (
                                <a
                                  href={item.listing_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="mt-1 block text-xs text-sky-400 hover:underline"
                                >
                                  Abrir aviso
                                </a>
                              )}
                            </td>
                            <td className="px-4 py-4 text-slate-300">{item.listing_status || "—"}</td>
                            <td className="px-4 py-4">
                              <div className="flex gap-3">
                                <button onClick={() => startEditing(item)} disabled={busy} className="text-sky-400 hover:underline">Editar</button>
                                <button onClick={() => deleteComparable(item)} disabled={busy} className="text-red-400 hover:underline">Eliminar</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <p className="mt-4 text-xs text-slate-500">
              Los precios ingresados son valores publicados y no necesariamente precios finales de venta. Una referencia por sí sola no constituye una tasación.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
