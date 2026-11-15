"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import { getWhatsAppUrl } from "@/lib/whatsapp";
import { logAdminActivity } from "@/lib/audit-log";
import Logo from "@/components/Logo";
import Cargando from "@/components/Cargando";

type InquiryStatus = "new" | "contacted" | "closed" | "discarded";

type Vehicle = {
  brand: string;
  model: string;
  version: string | null;
  year: number;
  status: "available" | "reserved" | "sold";
};

type VehicleInquiry = {
  id: string;
  vehicle_id: string;
  opportunity_id: string | null;
  customer_name: string;
  phone: string | null;
  email: string | null;
  message: string;
  internal_notes: string | null;
  next_followup_date: string | null;
  next_followup_note: string | null;
  status: InquiryStatus;
  created_at: string;
  vehicle: Vehicle | null;
};

type InquiryDraft = {
  status: InquiryStatus;
  internalNotes: string;
  nextFollowupDate: string;
  nextFollowupNote: string;
};

type FollowupFilter = "all" | "overdue" | "today" | "scheduled" | "none";

const statuses: { value: InquiryStatus; label: string }[] = [
  { value: "new", label: "Nueva" },
  { value: "contacted", label: "Contactada" },
  { value: "closed", label: "Concretada" },
  { value: "discarded", label: "Descartada" },
];

const inputClass =
  "w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-3 text-base text-white outline-none focus:border-sky-400";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date(value));
}

function getLocalDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "00";
  const day = parts.find((part) => part.type === "day")?.value ?? "00";
  return `${year}-${month}-${day}`;
}

function formatDateOnly(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function isClosedStatus(status: InquiryStatus) {
  return status === "closed" || status === "discarded";
}

function getVehicleTitle(vehicle: Vehicle | null) {
  if (!vehicle) return "VehÃ­culo eliminado";
  return `${vehicle.year} ${vehicle.brand} ${vehicle.model}${vehicle.version ? ` ${vehicle.version}` : ""}`;
}

function getEmailUrl(email: string, customerName: string, vehicleTitle: string) {
  const recipient = encodeURIComponent(email).replace(/%40/i, "@");
  const subject = encodeURIComponent(`Consulta por ${vehicleTitle}`);
  const body = encodeURIComponent(
    `Hola ${customerName}, te escribimos por tu consulta sobre ${vehicleTitle} en ALEZZA.`
  );
  return `mailto:${recipient}?subject=${subject}&body=${body}`;
}

export default function AdminVehicleInquiriesPage() {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [items, setItems] = useState<VehicleInquiry[]>([]);
  const [drafts, setDrafts] = useState<Record<string, InquiryDraft>>({});
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<InquiryStatus | "all">("all");
  const [followupFilter, setFollowupFilter] = useState<FollowupFilter>("all");

  const loadInquiries = useCallback(async () => {
    const { data, error } = await supabase
      .from("vehicle_inquiries")
      .select("id, vehicle_id, opportunity_id, customer_name, phone, email, message, internal_notes, next_followup_date, next_followup_note, status, created_at, vehicle:vehicles!vehicle_inquiries_vehicle_id_fkey(brand, model, version, year, status)")
      .order("created_at", { ascending: false })
      .limit(300);

    if (error) {
      const missingTable =
        /vehicle_inquiries/i.test(error.message) &&
        (error.code === "PGRST205" || error.code === "42P01");
      const missingFollowupColumns =
        (error.code === "42703" || error.code === "PGRST204") &&
        /next_followup_(date|note)/i.test(error.message);
      setMessage(missingTable
        ? "Falta aplicar la migraciÃ³n 202611070009_vehicle_inquiries.sql para habilitar este registro."
        : missingFollowupColumns
          ? "ActualizÃ¡ la migraciÃ³n 202611070009_vehicle_inquiries.sql para habilitar fechas de seguimiento en estas consultas."
        : "No se pudieron cargar las consultas: " + error.message
      );
      return;
    }

    const inquiries = (data ?? []).map((item) => ({
      ...item,
      vehicle: Array.isArray(item.vehicle)
        ? item.vehicle[0] ?? null
        : item.vehicle,
    })) as VehicleInquiry[];
    setItems(inquiries);
    setDrafts(
      Object.fromEntries(
        inquiries.map((item) => [item.id, {
          status: item.status,
          internalNotes: item.internal_notes ?? "",
          nextFollowupDate: item.next_followup_date ?? "",
          nextFollowupNote: item.next_followup_note ?? "",
        }])
      )
    );
    setMessage("");
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
      return false;
    }

    setEmail(userEmail);
    setAuthorized(true);
    setMessage("");
    await loadInquiries();
    return true;
  }, [loadInquiries]);

  useEffect(() => {
    let active = true;

    async function init() {
      const { data } = await supabase.auth.getSession();
      if (active && data.session?.user) {
        await verifyAdmin(data.session.user.id, data.session.user.email ?? "");
      }
      if (active) setLoading(false);
    }

    void init();
    return () => {
      active = false;
    };
  }, [verifyAdmin]);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      setMessage("No se pudo iniciar sesiÃ³n. RevisÃ¡ el correo y la contraseÃ±a.");
      return;
    }

    const validAdmin = await verifyAdmin(data.user.id, data.user.email ?? "");
    if (!validAdmin) await supabase.auth.signOut();
    setPassword("");
  }

  async function logout() {
    await supabase.auth.signOut();
    setAuthorized(false);
    setEmail("");
    setPassword("");
    setItems([]);
    setDrafts({});
    setMessage("");
  }

  function updateDraft(id: string, field: keyof InquiryDraft, value: string) {
    setDrafts((current) => ({
      ...current,
      [id]: { ...current[id], [field]: value },
    }));
  }

  async function saveInquiry(item: VehicleInquiry) {
    const draft = drafts[item.id];
    if (!draft || busyId) return;

    const closesInquiry = isClosedStatus(draft.status);
    const hasScheduledFollowup = Boolean(
      item.next_followup_date || draft.nextFollowupDate
    );
    if (
      closesInquiry &&
      hasScheduledFollowup &&
      !window.confirm("Al cerrar esta consulta se va a limpiar el prÃ³ximo contacto programado. Â¿QuerÃ©s continuar?")
    ) {
      return;
    }

    const updates = {
      status: draft.status,
      internal_notes: draft.internalNotes.trim() || null,
      next_followup_date: closesInquiry ? null : draft.nextFollowupDate || null,
      next_followup_note:
        !closesInquiry && draft.nextFollowupDate
          ? draft.nextFollowupNote.trim() || null
          : null,
      updated_at: new Date().toISOString(),
    };
    if (
      updates.status === item.status &&
      updates.internal_notes === (item.internal_notes ?? null) &&
      updates.next_followup_date === item.next_followup_date &&
      updates.next_followup_note === item.next_followup_note
    ) {
      setMessage("No hay cambios para guardar.");
      return;
    }

    setBusyId(item.id);
    setMessage("");

    const { error } = await supabase
      .from("vehicle_inquiries")
      .update(updates)
      .eq("id", item.id);

    if (error) {
      setMessage("No se pudo guardar la consulta: " + error.message);
      setBusyId(null);
      return;
    }

    const activityLogged = await logAdminActivity({
      action: "vehicle_inquiry_updated",
      entityType: "vehicle_inquiry",
      entityId: item.id,
      changes: {
        status: { from: item.status, to: updates.status },
        internal_notes_updated: updates.internal_notes !== (item.internal_notes ?? null),
        next_followup_date: {
          from: item.next_followup_date,
          to: updates.next_followup_date,
        },
        next_followup_note_updated:
          updates.next_followup_note !== item.next_followup_note,
      },
    });

    setItems((current) => current.map((existing) =>
      existing.id === item.id
        ? {
            ...existing,
            status: updates.status,
            internal_notes: updates.internal_notes,
            next_followup_date: updates.next_followup_date,
            next_followup_note: updates.next_followup_note,
          }
        : existing
    ));
    setDrafts((current) => ({
      ...current,
      [item.id]: {
        status: updates.status,
        internalNotes: updates.internal_notes ?? "",
        nextFollowupDate: updates.next_followup_date ?? "",
        nextFollowupNote: updates.next_followup_note ?? "",
      },
    }));
    setMessage(activityLogged
      ? "Consulta actualizada."
      : "Consulta actualizada, pero no se pudo guardar el registro de actividad."
    );
    setBusyId(null);
  }

  async function convertInquiry(item: VehicleInquiry) {
    if (busyId) return;
    if (!window.confirm(`Â¿Crear una oportunidad para ${item.customer_name} en el CRM? Se conservarÃ¡n el contacto, el mensaje y el vehÃ­culo consultado.`)) {
      return;
    }

    setBusyId(item.id);
    setMessage("");
    const { data, error } = await supabase.rpc(
      "convert_vehicle_inquiry_to_opportunity",
      { p_inquiry_id: item.id }
    );

    if (error || typeof data !== "string") {
      const migrationPending = error?.code === "PGRST202" || error?.code === "42883";
      setMessage(migrationPending
        ? "AplicÃ¡ la migraciÃ³n 202611070010_convert_vehicle_inquiry.sql para habilitar el pase al CRM."
        : "No se pudo crear la oportunidad: " + (error?.message ?? "respuesta invÃ¡lida")
      );
      setBusyId(null);
      return;
    }

    setItems((current) => current.map((existing) =>
      existing.id === item.id
        ? { ...existing, opportunity_id: data, status: "contacted" }
        : existing
    ));
    setDrafts((current) => ({
      ...current,
      [item.id]: { ...current[item.id], status: "contacted" },
    }));
    setMessage("Oportunidad creada en el CRM con el contacto y el vehÃ­culo asociados.");
    setBusyId(null);
  }

  const todayDateKey = getLocalDateKey();
  const overdueCount = items.filter(
    (item) => !isClosedStatus(item.status) && Boolean(item.next_followup_date && item.next_followup_date < todayDateKey)
  ).length;
  const todayCount = items.filter(
    (item) => !isClosedStatus(item.status) && item.next_followup_date === todayDateKey
  ).length;

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = items.filter((item) => {
      const vehicleTitle = getVehicleTitle(item.vehicle);
      const matchesSearch = !term || [
        item.customer_name,
        item.phone,
        item.email,
        item.message,
        item.internal_notes,
        item.next_followup_note,
        vehicleTitle,
      ].some((value) => String(value ?? "").toLowerCase().includes(term));

      const activeFollowup = !isClosedStatus(item.status) && Boolean(item.next_followup_date);
      const date = item.next_followup_date;
      const matchesFollowup =
        followupFilter === "all" ||
        (followupFilter === "overdue" && activeFollowup && Boolean(date && date < todayDateKey)) ||
        (followupFilter === "today" && activeFollowup && date === todayDateKey) ||
        (followupFilter === "scheduled" && activeFollowup && Boolean(date && date > todayDateKey)) ||
        (followupFilter === "none" && !isClosedStatus(item.status) && !date);

      return matchesSearch &&
        (statusFilter === "all" || item.status === statusFilter) &&
        matchesFollowup;
    });

    if (["overdue", "today", "scheduled"].includes(followupFilter)) {
      filtered.sort((left, right) =>
        (left.next_followup_date ?? "9999-12-31").localeCompare(
          right.next_followup_date ?? "9999-12-31"
        )
      );
    }

    return filtered;
  }, [items, search, statusFilter, followupFilter, todayDateKey]);

  if (loading) {
    return <main className="min-h-screen bg-slate-950"><Cargando frase="Leyendo las consultas…" /></main>;
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <Logo alto={20} />
            <h1 className="mt-2 text-2xl font-semibold">Consultas por vehÃ­culos</h1>
            {authorized && <p className="mt-1 text-sm text-slate-400">{email}</p>}
          </div>
          {authorized && (
            <nav aria-label="AdministraciÃ³n" className="flex flex-wrap gap-2">
              <button onClick={logout} className="rounded-lg border border-white/15 px-4 py-2 text-sm hover:bg-white/10">Cerrar sesiÃ³n</button>
            </nav>
          )}
        </header>

        {!authorized ? (
          <section className="mx-auto max-w-md rounded-2xl border border-white/10 bg-white/[0.04] p-7">
            <h2 className="text-xl font-semibold">Acceso administrador</h2>
            <form onSubmit={login} className="mt-6 space-y-5">
              <label className="block text-sm">
                Correo electrÃ³nico
                <input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} className={`${inputClass} mt-2`} />
              </label>
              <label className="block text-sm">
                ContraseÃ±a
                <input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} className={`${inputClass} mt-2`} />
              </label>
              {message && <p role="alert" className="text-sm text-red-400">{message}</p>}
              <button type="submit" className="w-full rounded-lg bg-sky-500 px-4 py-3 font-semibold text-slate-950">Ingresar al panel</button>
            </form>
          </section>
        ) : (
          <>
            <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
                <p className="text-sm text-slate-400">Consultas recibidas</p>
                <p className="mt-2 text-3xl font-semibold">{items.length}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
                <p className="text-sm text-slate-400">Nuevas</p>
                <p className="mt-2 text-3xl font-semibold">{items.filter((item) => item.status === "new").length}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
                <p className="text-sm text-slate-400">En este listado</p>
                <p className="mt-2 text-3xl font-semibold">{filteredItems.length}</p>
              </div>
              <button
                type="button"
                aria-pressed={followupFilter === "overdue"}
                onClick={() => setFollowupFilter(followupFilter === "overdue" ? "all" : "overdue")}
                className={`rounded-xl border p-5 text-left transition ${followupFilter === "overdue" ? "border-red-400/50 bg-red-400/10" : "border-white/10 bg-white/[0.04] hover:border-red-400/40"}`}
              >
                <p className="text-sm text-slate-400">Contactos vencidos</p>
                <p className="mt-2 text-3xl font-semibold text-red-300">{overdueCount}</p>
              </button>
              <button
                type="button"
                aria-pressed={followupFilter === "today"}
                onClick={() => setFollowupFilter(followupFilter === "today" ? "all" : "today")}
                className={`rounded-xl border p-5 text-left transition ${followupFilter === "today" ? "border-amber-400/50 bg-amber-400/10" : "border-white/10 bg-white/[0.04] hover:border-amber-400/40"}`}
              >
                <p className="text-sm text-slate-400">Contactos para hoy</p>
                <p className="mt-2 text-3xl font-semibold text-amber-300">{todayCount}</p>
              </button>
            </section>

            {message && <p role="status" className="mb-5 rounded-lg border border-sky-400/20 bg-sky-400/10 p-3 text-sm text-sky-200">{message}</p>}

            <p className="mb-4 text-xs text-slate-500">Mostramos las Ãºltimas 300 consultas recibidas.</p>

            <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_200px_220px_auto]">
              <label className="text-sm text-slate-300">
                Buscar
                <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nombre, contacto, mensaje o vehÃ­culo..." className={`${inputClass} mt-2`} />
              </label>
              <label className="text-sm text-slate-300">
                Estado
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as InquiryStatus | "all")} className={`${inputClass} mt-2`}>
                  <option value="all">Todos</option>
                  {statuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
                </select>
              </label>
              <label className="text-sm text-slate-300">
                PrÃ³ximo contacto
                <select value={followupFilter} onChange={(event) => setFollowupFilter(event.target.value as FollowupFilter)} className={`${inputClass} mt-2`}>
                  <option value="all">Todos</option>
                  <option value="overdue">Vencidos</option>
                  <option value="today">Hoy</option>
                  <option value="scheduled">Programados</option>
                  <option value="none">Sin programar</option>
                </select>
              </label>
              <button type="button" onClick={() => void loadInquiries()} className="self-end rounded-lg border border-white/15 px-4 py-3 text-sm hover:bg-white/10">Actualizar</button>
            </section>

            {filteredItems.length === 0 ? (
              <section className="rounded-xl border border-white/10 bg-white/[0.04] p-10 text-center">
                <h2 className="text-lg font-semibold">TodavÃ­a no hay consultas</h2>
                <p className="mt-2 text-sm text-slate-400">Las consultas enviadas desde las fichas del catÃ¡logo van a aparecer acÃ¡.</p>
              </section>
            ) : (
              <section className="space-y-4">
                {filteredItems.map((item) => {
                  const draft = drafts[item.id] ?? {
                    status: item.status,
                    internalNotes: item.internal_notes ?? "",
                    nextFollowupDate: item.next_followup_date ?? "",
                    nextFollowupNote: item.next_followup_note ?? "",
                  };
                  const vehicleTitle = getVehicleTitle(item.vehicle);
                  const whatsappHref = item.phone
                    ? getWhatsAppUrl(item.phone, `Hola ${item.customer_name}, te escribimos por tu consulta sobre ${vehicleTitle} en ALEZZA.`)
                    : null;
                  const followupOverdue = Boolean(
                    !isClosedStatus(item.status) &&
                    item.next_followup_date &&
                    item.next_followup_date < todayDateKey
                  );

                  return (
                    <article key={item.id} className="grid gap-6 rounded-xl border border-white/10 bg-white/[0.04] p-5 lg:grid-cols-[1fr_340px]">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h2 className="text-lg font-semibold">{item.customer_name}</h2>
                            <p className="mt-1 text-sm text-sky-300">{vehicleTitle}</p>
                          </div>
                          <span className="rounded-full border border-white/15 px-3 py-1 text-xs text-slate-300">
                            {statuses.find((status) => status.value === item.status)?.label ?? item.status}
                          </span>
                        </div>
                        <p className="mt-3 text-xs text-slate-500">Recibida {formatDate(item.created_at)}</p>
                        {!isClosedStatus(item.status) && item.next_followup_date && (
                          <p className={`mt-2 text-xs font-medium ${followupOverdue ? "text-red-300" : item.next_followup_date === todayDateKey ? "text-amber-300" : "text-sky-300"}`}>
                            PrÃ³ximo contacto {followupOverdue ? "vencido" : item.next_followup_date === todayDateKey ? "hoy" : "programado"}: {formatDateOnly(item.next_followup_date)}
                            {item.next_followup_note ? ` Â· ${item.next_followup_note}` : ""}
                          </p>
                        )}
                        {item.message && <p className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-200">{item.message}</p>}
                        <div className="mt-4 flex flex-wrap gap-3 text-sm">
                          {whatsappHref && <a href={whatsappHref} target="_blank" rel="noreferrer" className="text-emerald-300 hover:underline">WhatsApp</a>}
                          {item.phone && <a href={`tel:${encodeURIComponent(item.phone)}`} className="text-sky-300 hover:underline">{item.phone}</a>}
                          {item.email && <a href={getEmailUrl(item.email, item.customer_name, vehicleTitle)} className="break-all text-sky-300 hover:underline">{item.email}</a>}
                          {item.opportunity_id && <Link href={`/admin?opportunity=${encodeURIComponent(item.opportunity_id)}`} className="text-sky-300 hover:underline">Abrir en oportunidades</Link>}
                        </div>
                      </div>

                      <div className="space-y-4 border-t border-white/10 pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
                        <label className="block text-sm text-slate-300">
                          Estado
                          <select value={draft.status} onChange={(event) => updateDraft(item.id, "status", event.target.value)} className={`${inputClass} mt-2`}>
                            {statuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
                          </select>
                        </label>
                        <label className="block text-sm text-slate-300">
                          PrÃ³xima fecha de contacto
                          <input
                            type="date"
                            value={draft.nextFollowupDate}
                            disabled={isClosedStatus(draft.status)}
                            onChange={(event) => updateDraft(item.id, "nextFollowupDate", event.target.value)}
                            className={`${inputClass} mt-2 disabled:cursor-not-allowed disabled:opacity-50`}
                          />
                        </label>
                        <label className="block text-sm text-slate-300">
                          Motivo o acciÃ³n pendiente
                          <input
                            type="text"
                            maxLength={500}
                            value={draft.nextFollowupNote}
                            disabled={isClosedStatus(draft.status) || !draft.nextFollowupDate}
                            onChange={(event) => updateDraft(item.id, "nextFollowupNote", event.target.value)}
                            className={`${inputClass} mt-2 disabled:cursor-not-allowed disabled:opacity-50`}
                            placeholder="Ej.: consultar disponibilidad"
                          />
                        </label>
                        <label className="block text-sm text-slate-300">
                          Nota interna
                          <textarea maxLength={5000} rows={3} value={draft.internalNotes} onChange={(event) => updateDraft(item.id, "internalNotes", event.target.value)} className={`${inputClass} mt-2`} placeholder="Acuerdos o prÃ³ximos pasos..." />
                        </label>
                        <button type="button" onClick={() => void saveInquiry(item)} disabled={busyId !== null} className="w-full rounded-lg bg-sky-500 px-4 py-3 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50">
                          {busyId === item.id ? "Guardando..." : "Guardar cambios"}
                        </button>
                        {!item.opportunity_id && !isClosedStatus(item.status) && (
                          <button
                            type="button"
                            onClick={() => void convertInquiry(item)}
                            disabled={busyId !== null}
                            className="w-full rounded-lg border border-sky-400/40 px-4 py-3 font-semibold text-sky-200 hover:bg-sky-400/10 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Pasar a oportunidades
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
