"use client";

import Script from "next/script";
import { type CSSProperties, FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { aFila, deFila, type BrunoItem, type BrunoRow } from "@/lib/bruno";
import { PORTALES } from "./portales";
import Logo from "@/components/Logo";
import Cargando from "@/components/Cargando";

type Estado = "cargando" | "login" | "listo";
const LOTE = 200;

// Lo único que public/os/app.js sabe de la nube. Toda escritura pasa por aFila (validación).
function crearNube(userId: string, email: string) {
  return {
    usuario: userId,
    email,
    portales: PORTALES,
    limpiar: (item: Record<string, unknown>) => deFila(aFila(item)),
    async listar(): Promise<BrunoItem[]> {
      const filas: BrunoRow[] = [];
      for (let desde = 0; ; desde += 1000) {
        const { data, error } = await supabase.from("bruno_items").select("*")
          .order("creado", { ascending: false }).range(desde, desde + 999);
        if (error) throw error;
        filas.push(...(data as BrunoRow[]));
        if (data.length < 1000) return filas.map(deFila);
      }
    },
    async guardar(items: Record<string, unknown>[]) {
      for (let i = 0; i < items.length; i += LOTE) {
        const filas = items.slice(i, i + LOTE).map((it) => ({ ...aFila(it), user_id: userId }));
        const { error } = await supabase.from("bruno_items").upsert(filas, { onConflict: "user_id,id" });
        if (error) throw error;
      }
    },
    async borrar(ids: string[]) {
      for (let i = 0; i < ids.length; i += LOTE) {
        const { error } = await supabase.from("bruno_items").delete().in("id", ids.slice(i, i + LOTE));
        if (error) throw error;
      }
    },
    async salir() {
      await supabase.auth.signOut();
      location.reload();
    },
  };
}

declare global {
  interface Window { BRUNO_NUBE?: ReturnType<typeof crearNube> }
}

async function esAdmin(userId: string) {
  const { data, error } = await supabase.from("admin_users").select("user_id").eq("user_id", userId).maybeSingle();
  return !error && !!data;
}

export default function BrunoOS() {
  const [estado, setEstado] = useState<Estado>("cargando");
  const [mensaje, setMensaje] = useState("");
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    // En body (no en un contenedor) porque los avisos y las ventanas de app.js cuelgan de body.
    document.body.classList.add("bos");
    return () => document.body.classList.remove("bos");
  }, []);

  useEffect(() => {
    // La versión anterior tenía service worker en /os/; ahora los datos viven en Supabase.
    navigator.serviceWorker?.getRegistrations().then((rs) => rs.forEach((r) => r.unregister())).catch(() => {});
    supabase.auth.getSession().then(async ({ data }) => {
      const u = data.session?.user;
      if (u && (await esAdmin(u.id))) { window.BRUNO_NUBE = crearNube(u.id, u.email ?? ""); setEstado("listo"); }
      else setEstado("login");
    });
  }, []);

  async function entrar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setOcupado(true);
    setMensaje("");
    const fd = new FormData(e.currentTarget);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: String(fd.get("email") ?? ""),
      password: String(fd.get("password") ?? ""),
    });
    if (error || !data.user) {
      setMensaje("No se pudo entrar. Revisá el correo y la contraseña.");
    } else if (!(await esAdmin(data.user.id))) {
      await supabase.auth.signOut();
      setMensaje("Esta cuenta no tiene acceso a BRUNO OS.");
    } else {
      window.BRUNO_NUBE = crearNube(data.user.id, data.user.email ?? "");
      setEstado("listo");
    }
    setOcupado(false);
  }

  if (estado === "cargando") return <Cargando frase="Encendiendo el tablero de BRUNO OS…" />;

  if (estado === "login") {
    return (
      <main className="puerta">
        <section className="puerta-izq">
          <Logo alto={22} className="puerta-logo" />
          <p className="etiqueta">Mar del Plata</p>
          <h1 className="marca grande">BRUNO<b>OS</b></h1>
          <p className="bajada">El tablero de ALEZZA: agenda, permutas, tasaciones, catálogo y servicios en un solo lugar.</p>
          <nav className="portales compactos" aria-label="Páginas públicas">
            {PORTALES.filter((p) => p.grupo === "Público").map((p, i) => (
              <a key={p.u} href={p.u} className="tile" style={{ "--i": i } as CSSProperties}>
                <span className="tile-n">{p.n}</span>
                <span className="tile-t">{p.t}</span>
                <span className="tile-d">{p.d}</span>
                <span className="tile-f" aria-hidden>↗</span>
              </a>
            ))}
          </nav>
        </section>
        <form onSubmit={entrar} className="puerta-der" aria-labelledby="titulo-login">
          <h2 id="titulo-login">Entrar</h2>
          <p className="meta">Cuenta de administrador de ALEZZA.</p>
          <div className="campo"><label htmlFor="email">Correo</label><input id="email" name="email" type="email" autoComplete="username" required /></div>
          <div className="campo"><label htmlFor="password">Contraseña</label><input id="password" name="password" type="password" autoComplete="current-password" required /></div>
          {mensaje && <p className="error" role="alert">{mensaje}</p>}
          <button type="submit" className="entrar" disabled={ocupado}>{ocupado ? "Entrando…" : "Entrar al tablero →"}</button>
        </form>
      </main>
    );
  }

  return (
    <>
      <div id="app" className="app" />
      <nav id="nav" className="nav" aria-label="Secciones" />
      <div id="sheet-root" />
      <Script src="/os/app.js?v=14" strategy="afterInteractive" />
    </>
  );
}
