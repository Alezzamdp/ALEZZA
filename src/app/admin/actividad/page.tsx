"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";

type ActivityItem = {
  id: string;
  actor_user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  changes: Record<string, unknown> | null;
  created_at: string;
};

const actionLabels: Record<string, string> = {
  vehicle_created: "Vehículo creado",
  vehicle_updated: "Vehículo actualizado",
  vehicle_publication_changed: "Publicación de vehículo modificada",
  vehicle_deleted: "Vehículo eliminado",
  vehicle_inquiry_updated: "Consulta de vehículo actualizada",
  comparable_created: "Referencia agregada",
  comparable_updated: "Referencia actualizada",
  comparable_deleted: "Referencia eliminada",
  opportunity_status_changed: "Estado de oportunidad actualizado",
  opportunity_valuation_updated: "Datos comerciales de oportunidad actualizados",
  opportunity_appraisal_created: "Tasación manual creada",
  opportunity_appraisal_updated: "Tasación manual actualizada",
  opportunity_appraisal_revision_created: "Nueva versión de tasación manual",
  opportunity_negotiation_updated: "Negociación y seguimiento actualizados",
  opportunity_followup_added: "Seguimiento agregado a oportunidad",
  public_profile_updated: "Datos de contacto público actualizados",
};

const inputClass =
  "w-full rounded-lg border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-sky-400";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date(value));
}

function formatValue(value: unknown) {
  if (typeof value === "string") return value;
  if (value === null) return "Vacío";
  return JSON.stringify(value);
}

export default function AdminActivityPage() {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [search, setSearch] = useState("");

  async function loadActivity() {
    const { data, error } = await supabase
      .from("audit_logs")
      .select("id, actor_user_id, action, entity_type, entity_id, changes, created_at")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      setMessage("No se pudo cargar la actividad: " + error.message);
      return;
    }

    setItems((data ?? []) as ActivityItem[]);
    setMessage("");
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
      return false;
    }

    setEmail(userEmail);
    setAuthorized(true);
    setMessage("");
    await loadActivity();
    return true;
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

    void init();
  }, []);

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
      setMessage("No se pudo iniciar sesión. Revisá el correo y la contraseña.");
      setBusy(false);
      return;
    }

    const validAdmin = await verifyAdmin(data.user.id, data.user.email ?? "");
    if (!validAdmin) await supabase.auth.signOut();

    setPassword("");
    setBusy(false);
  }

  async function logout() {
    await supabase.auth.signOut();
    setAuthorized(false);
    setEmail("");
    setPassword("");
    setItems([]);
    setMessage("");
  }

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;

    return items.filter((item) =>
      [
        actionLabels[item.action] ?? item.action,
        item.entity_type,
        item.entity_id,
        item.actor_user_id,
        JSON.stringify(item.changes ?? {}),
      ].some((value) => String(value ?? "").toLowerCase().includes(term))
    );
  }, [items, search]);

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-950 text-white">
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
            <h1 className="mt-2 text-2xl font-semibold">Actividad</h1>
            {authorized && <p className="mt-1 text-sm text-slate-400">{email}</p>}
          </div>

          {authorized && (
            <nav aria-label="Administración" className="flex flex-wrap gap-2">
              <Link href="/admin" className="rounded-lg border border-white/15 px-4 py-2 text-sm hover:bg-white/10">Oportunidades</Link>
              <Link href="/admin/vehiculos" className="rounded-lg border border-white/15 px-4 py-2 text-sm hover:bg-white/10">Vehículos</Link>
              <Link href="/admin/referencias" className="rounded-lg border border-white/15 px-4 py-2 text-sm hover:bg-white/10">Referencias</Link>
              <Link href="/admin/configuracion" className="rounded-lg border border-white/15 px-4 py-2 text-sm hover:bg-white/10">Configuración</Link>
              <button onClick={logout} className="rounded-lg border border-white/15 px-4 py-2 text-sm hover:bg-white/10">Cerrar sesión</button>
            </nav>
          )}
        </header>

        {!authorized ? (
          <section className="mx-auto max-w-md rounded-2xl border border-white/10 bg-white/[0.04] p-7">
            <h2 className="text-xl font-semibold">Acceso administrador</h2>
            <form onSubmit={login} className="mt-6 space-y-5">
              <label className="block text-sm">
                Correo electrónico
                <input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} className={`${inputClass} mt-2`} />
              </label>
              <label className="block text-sm">
                Contraseña
                <input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} className={`${inputClass} mt-2`} />
              </label>
              {message && <p role="alert" className="text-sm text-red-400">{message}</p>}
              <button type="submit" disabled={busy} className="w-full rounded-lg bg-sky-500 px-4 py-3 font-semibold text-slate-950 disabled:opacity-50">
                {busy ? "Verificando..." : "Ingresar al panel"}
              </button>
            </form>
          </section>
        ) : (
          <>
            <section className="mb-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
                <p className="text-sm text-slate-400">Eventos recientes</p>
                <p className="mt-2 text-3xl font-semibold">{items.length}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
                <p className="text-sm text-slate-400">Coincidencias</p>
                <p className="mt-2 text-3xl font-semibold">{filteredItems.length}</p>
              </div>
            </section>

            <section className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-semibold">Registro de actividad</h2>
                <p className="mt-1 text-sm text-slate-400">Últimos 200 cambios registrados por el panel.</p>
              </div>
              <button type="button" onClick={() => void loadActivity()} className="rounded-lg border border-white/15 px-4 py-3 text-sm hover:bg-white/10">
                Actualizar
              </button>
            </section>

            {message && <p role="status" className="mb-5 rounded-lg border border-sky-400/20 bg-sky-400/10 p-3 text-sm text-sky-200">{message}</p>}

            <label className="mb-5 block text-sm text-slate-300">
              Buscar
              <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Acción, tipo, identificador o detalle..." className={`${inputClass} mt-2`} />
            </label>

            <section aria-live="polite" className="space-y-3">
              {filteredItems.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-white/[0.04] p-8 text-center text-slate-400">
                  {items.length === 0 ? "Todavía no hay eventos registrados." : "No hay eventos que coincidan con la búsqueda."}
                </div>
              ) : filteredItems.map((item) => (
                <article key={item.id} className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">{actionLabels[item.action] ?? item.action}</h3>
                      <p className="mt-1 text-sm text-slate-400">{item.entity_type}{item.entity_id ? ` · ${item.entity_id}` : ""}</p>
                    </div>
                    <time dateTime={item.created_at} className="text-sm text-slate-400">{formatDate(item.created_at)}</time>
                  </div>
                  {item.changes && Object.keys(item.changes).length > 0 && (
                    <dl className="mt-4 grid gap-2 border-t border-white/10 pt-4 sm:grid-cols-2">
                      {Object.entries(item.changes).map(([key, value]) => (
                        <div key={key} className="min-w-0 text-sm">
                          <dt className="text-xs text-slate-500">{key.replaceAll("_", " ")}</dt>
                          <dd className="mt-1 break-words text-slate-200">{formatValue(value)}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </article>
              ))}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
