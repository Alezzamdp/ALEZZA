"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Cargando from "@/components/Cargando";
import { SitioCabecera, SitioPie } from "@/components/SitioMarco";
import Seguimiento from "@/components/Seguimiento";
import { supabase } from "@/lib/supabase";
import { mensajeAlezza, waAlezza, type Avance } from "@/lib/turnos";

// Enlace que se le manda al cliente desde el Taller: ve el avance de su auto en vivo.
export default function Page() {
  const { token } = useParams<{ token: string }>();
  const [avance, setAvance] = useState<Avance | null | undefined>(undefined);

  const cargar = useCallback(async () => {
    const { data } = await supabase.rpc("orden_publica", { p_token: token });
    setAvance((data as Avance | null) ?? null);
  }, [token]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga de datos: el setState ocurre después del await
    void cargar();
    const t = setInterval(cargar, 15000);
    return () => clearInterval(t);
  }, [cargar]);

  const consulta = waAlezza(avance
    ? mensajeAlezza("Quiero consultar por mi auto en el taller.", [
        ["Orden", "#" + avance.numero], ["Vehículo", avance.vehiculo], ["Patente", avance.patente], ["Nombre", avance.nombre],
      ], typeof window === "undefined" ? undefined : location.href)
    : mensajeAlezza("Quiero consultar por mi auto en el taller."));

  return (
    <main className="lp min-h-screen">
      <SitioCabecera accion={<a href={consulta} target="_blank" rel="noopener noreferrer" className="lp-btn lp-btn-sm lp-btn-linea">¿Dudas? WhatsApp</a>} />
      <section className="mx-auto grid max-w-3xl gap-4 px-6 pb-16 pt-10">
        {avance === undefined ? (
          <Cargando frase="Mirando cómo va tu auto…" />
        ) : avance === null ? (
          <p className="rounded-lg border border-gray-200 bg-white p-6">No encontramos ese seguimiento. <a href={consulta} className="underline">Escribinos</a>.</p>
        ) : (
          <>
            <h1 className="text-3xl font-extrabold">Hola {avance.nombre}</h1>
            <Seguimiento avance={avance} />
            <p className="text-sm text-gray-500">Esta página se actualiza sola mientras trabajamos.</p>
          </>
        )}
      </section>
      <SitioPie />
    </main>
  );
}
