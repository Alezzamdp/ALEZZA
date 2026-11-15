"use client";

import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import Logo from "@/components/Logo";
import { supabase } from "@/lib/supabase";
import Cargando from "@/components/Cargando";

// Entrada de administrador para las pantallas nuevas de gestión (Turnos, Taller).
// Usa solo variables del tema (no clases slate/white, que /admin invierte).
export const ui = {
  campo: "w-full rounded-md border border-[var(--n300)] bg-[var(--n0)] px-3 py-2 text-[var(--tinta)] outline-none focus:border-[var(--tinta)]",
  etiqueta: "mb-1 block font-mono text-[11px] uppercase tracking-wider text-[var(--n500)]",
  tarjeta: "rounded-lg border border-[var(--n200)] bg-[var(--n0)]",
  boton: "rounded-md bg-[var(--tinta)] px-4 py-2 text-sm font-semibold text-[var(--papel)] hover:opacity-90 disabled:opacity-50",
  botonSuave: "rounded-md border border-[var(--n300)] px-3 py-1.5 text-sm hover:bg-[var(--n100)] disabled:opacity-50",
};

export default function AdminGate({ titulo, frase, children }: { titulo: string; frase?: string; children: (email: string) => ReactNode }) {
  const [estado, setEstado] = useState<"cargando" | "login" | "listo">("cargando");
  const [email, setEmail] = useState("");
  const [mensaje, setMensaje] = useState("");

  async function verificar(id: string, correo: string) {
    const { data } = await supabase.from("admin_users").select("user_id").eq("user_id", id).maybeSingle();
    if (!data) { await supabase.auth.signOut(); setMensaje("Esta cuenta no tiene permisos de administrador."); setEstado("login"); return; }
    setEmail(correo);
    setEstado("listo");
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user;
      if (u) void verificar(u.id, u.email ?? ""); else setEstado("login");
    });
  }, []);

  async function entrar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const { data, error } = await supabase.auth.signInWithPassword({ email: String(f.get("email")), password: String(f.get("password")) });
    if (error || !data.user) { setMensaje("No se pudo entrar. Revisá el correo y la contraseña."); return; }
    await verificar(data.user.id, data.user.email ?? "");
  }

  async function salir() {
    await supabase.auth.signOut();
    setEstado("login");
  }

  return (
    <main className="min-h-screen bg-[var(--papel)] px-4 py-6 text-[var(--tinta)] md:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-[var(--n200)] pb-4">
          <div>
            <Logo alto={18} />
            <h1 className="mt-2 text-2xl font-semibold">{titulo}</h1>
          </div>
          {estado === "listo" && (
            <div className="flex items-center gap-3 text-sm text-[var(--n500)]">
              <span>{email}</span>
              <button onClick={salir} className={ui.botonSuave}>Cerrar sesión</button>
            </div>
          )}
        </header>
        {estado === "cargando" && <Cargando frase={frase} />}
        {estado === "login" && (
          <form onSubmit={entrar} className={`${ui.tarjeta} mx-auto grid max-w-sm gap-4 p-6`}>
            <h2 className="text-lg font-semibold">Iniciar sesión</h2>
            <div><label className={ui.etiqueta} htmlFor="email">Correo</label><input id="email" name="email" type="email" required autoComplete="username" className={ui.campo} /></div>
            <div><label className={ui.etiqueta} htmlFor="password">Contraseña</label><input id="password" name="password" type="password" required autoComplete="current-password" className={ui.campo} /></div>
            {mensaje && <p role="alert" className="text-sm text-red-700">{mensaje}</p>}
            <button className={ui.boton}>Entrar</button>
          </form>
        )}
        {estado === "listo" && children(email)}
      </div>
    </main>
  );
}
