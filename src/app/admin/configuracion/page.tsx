"use client";

import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import { getWhatsAppUrl } from "@/lib/whatsapp";
import MercadoLibreCard from "./MercadoLibreCard";
import TurnosCard from "./TurnosCard";
import Logo from "@/components/Logo";
import Cargando from "@/components/Cargando";

type PublicProfile = {
  whatsapp: string;
  email: string;
  location: string;
  business_hours: string;
};

const emptyProfile: PublicProfile = {
  whatsapp: "",
  email: "",
  location: "",
  business_hours: "",
};

const inputClass =
  "mt-2 w-full rounded-lg border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-sky-400";

function normalizeProfile(value: unknown): PublicProfile {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return { ...emptyProfile };
  }

  const record = value as Partial<Record<keyof PublicProfile, unknown>>;
  return {
    whatsapp: typeof record.whatsapp === "string" ? record.whatsapp : "",
    email: typeof record.email === "string" ? record.email : "",
    location: typeof record.location === "string" ? record.location : "",
    business_hours:
      typeof record.business_hours === "string" ? record.business_hours : "",
  };
}

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [profile, setProfile] = useState<PublicProfile>({ ...emptyProfile });
  const [savedProfile, setSavedProfile] = useState<PublicProfile>({ ...emptyProfile });

  async function loadProfile() {
    const { data, error } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "public_profile")
      .maybeSingle();

    if (error) {
      setMessage("No se pudo cargar la configuración: " + error.message);
      return;
    }

    const nextProfile = normalizeProfile(data?.value);
    setProfile(nextProfile);
    setSavedProfile(nextProfile);
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
    await loadProfile();
    return true;
  }

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getSession();

      if (data.session?.user) {
        await verifyAdmin(data.session.user.id, data.session.user.email ?? "");
      }

      setLoading(false);
    }

    void init();
  }, []);

  function updateField(field: keyof PublicProfile, value: string) {
    setProfile((current) => ({ ...current, [field]: value }));
  }

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

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const whatsapp = profile.whatsapp.trim();
    if (whatsapp && !getWhatsAppUrl(whatsapp)) {
      setMessage("Ingresá un WhatsApp válido con código de área.");
      return;
    }

    const nextProfile: PublicProfile = {
      whatsapp,
      email: profile.email.trim(),
      location: profile.location.trim(),
      business_hours: profile.business_hours.trim(),
    };

    const changedFields = (Object.keys(nextProfile) as (keyof PublicProfile)[])
      .filter((field) => nextProfile[field] !== savedProfile[field]);

    setBusy(true);
    setMessage("");

    const { error } = await supabase.from("app_settings").upsert(
      {
        key: "public_profile",
        value: nextProfile,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    );

    if (error) {
      setMessage("No se pudo guardar la configuración: " + error.message);
      setBusy(false);
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    const { error: auditError } = await supabase.from("audit_logs").insert({
      actor_user_id: userData.user?.id ?? null,
      action: "public_profile_updated",
      entity_type: "app_settings",
      changes: { changed_fields: changedFields },
    });

    if (auditError) {
      console.warn("No se pudo guardar el registro de actividad:", auditError.message);
    }

    setProfile(nextProfile);
    setSavedProfile(nextProfile);
    setMessage(
      auditError
        ? "Datos públicos guardados, pero no se pudo guardar el registro de actividad."
        : "Datos públicos guardados correctamente."
    );
    setBusy(false);
  }

  async function logout() {
    await supabase.auth.signOut();
    setAuthorized(false);
    setEmail("");
    setPassword("");
    setProfile({ ...emptyProfile });
    setSavedProfile({ ...emptyProfile });
    setMessage("");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950"><Cargando frase="Ajustando el tablero…" /></main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <Logo alto={20} />
            <h1 className="mt-2 text-2xl font-semibold">Configuración pública</h1>
            {authorized && <p className="mt-1 text-sm text-slate-400">{email}</p>}
          </div>

          {authorized && (
            <nav aria-label="Administración" className="flex flex-wrap gap-2">
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
                <input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} />
              </label>
              <label className="block text-sm">
                Contraseña
                <input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} className={inputClass} />
              </label>
              {message && <p role="alert" className="text-sm text-red-400">{message}</p>}
              <button type="submit" disabled={busy} className="w-full rounded-lg bg-sky-500 px-4 py-3 font-semibold text-slate-950 disabled:opacity-50">
                {busy ? "Verificando..." : "Ingresar al panel"}
              </button>
            </form>
          </section>
        ) : (
          <div className="space-y-6">
          <section className="max-w-3xl rounded-2xl border border-white/10 bg-white/[0.04] p-5 md:p-7">
            <h2 className="text-xl font-semibold">Contacto y atención</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Estos datos se muestran en el sitio público cuando están completos. No cargues contraseñas, tokens ni información privada.
            </p>

            {message && <p role="status" className="mt-5 rounded-lg border border-sky-400/20 bg-sky-400/10 p-3 text-sm text-sky-200">{message}</p>}

            <form onSubmit={saveProfile} className="mt-6 space-y-5">
              <label className="block text-sm font-medium">
                WhatsApp
                <input type="tel" maxLength={40} autoComplete="tel" value={profile.whatsapp} onChange={(event) => updateField("whatsapp", event.target.value)} className={inputClass} placeholder="+54 9 223 ..." />
                <span className="mt-1 block text-xs font-normal text-slate-500">Acepta formato argentino local o internacional; se convierte a formato internacional para el enlace.</span>
              </label>

              <label className="block text-sm font-medium">
                Correo de contacto
                <input type="email" maxLength={254} autoComplete="email" value={profile.email} onChange={(event) => updateField("email", event.target.value)} className={inputClass} placeholder="correo@ejemplo.com" />
              </label>

              <label className="block text-sm font-medium">
                Localidad o zona
                <input maxLength={120} value={profile.location} onChange={(event) => updateField("location", event.target.value)} className={inputClass} placeholder="Mar del Plata, Argentina" />
              </label>

              <label className="block text-sm font-medium">
                Horarios de atención
                <textarea rows={3} maxLength={200} value={profile.business_hours} onChange={(event) => updateField("business_hours", event.target.value)} className={inputClass} placeholder="Lunes a viernes, de 9 a 18 h" />
              </label>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button type="submit" disabled={busy} className="rounded-lg bg-sky-500 px-5 py-3 font-semibold text-slate-950 disabled:opacity-50">
                  {busy ? "Guardando..." : "Guardar configuración"}
                </button>
                <button type="button" disabled={busy} onClick={() => setProfile({ ...savedProfile })} className="rounded-lg border border-white/15 px-5 py-3 text-sm hover:bg-white/10 disabled:opacity-50">
                  Descartar cambios
                </button>
              </div>
            </form>
          </section>
          <TurnosCard />
          <MercadoLibreCard />
          </div>
        )}
      </div>
    </main>
  );
}
