"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PORTALES } from "@/app/os/portales";
import { cambiarTema } from "@/lib/tema";

// Une todos los portales: la misma barra en cada página, con BRUNO OS como punto de partida.
// En las páginas públicas solo aparece si hay sesión (los clientes no la ven).
export default function PortalBar() {
  const ruta = usePathname();
  const [sesion, setSesion] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSesion(!!data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSesion(!!s));
    return () => data.subscription.unsubscribe();
  }, []);

  if (ruta.startsWith("/os") || (!ruta.startsWith("/admin") && !sesion)) return null;

  // El portal que contiene la página abierta muestra sus páginas como pestañas.
  const abierto = PORTALES.find((p) => p.sub && (p.u === ruta || p.sub.some((s) => s.u === ruta)));

  return (
    <>
      <nav className="barra-os" aria-label="Portales">
        <Link href="/os" className="marca-os">BRUNO<b>OS</b></Link>
        {PORTALES.map((p, i) => (
          <Fragment key={p.u}>
            {i > 0 && p.grupo !== PORTALES[i - 1].grupo && <span className="sep" aria-hidden />}
            <Link href={p.u} aria-current={p === abierto || p.u === ruta ? "page" : undefined}>{p.t}</Link>
          </Fragment>
        ))}
        <button type="button" className="tema" onClick={cambiarTema} aria-label="Cambiar entre modo claro y oscuro">◐ Claro / Oscuro</button>
      </nav>
      {abierto && (
        <nav className="pestanas" aria-label={abierto.t}>
          {[{ t: abierto.t, u: abierto.u }, ...abierto.sub!].map((s) => (
            <Link key={s.u} href={s.u} aria-current={s.u === ruta ? "page" : undefined}>{s.t}</Link>
          ))}
        </nav>
      )}
    </>
  );
}
