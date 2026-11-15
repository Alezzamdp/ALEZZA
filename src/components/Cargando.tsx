"use client";

import { useEffect, useState } from "react";
import Logo from "@/components/Logo";

// Pantalla de carga de todos los portales: logo de ALEZZA y una barra mostaza.
// Con `progreso` (0 a 100) la barra muestra el avance real; sin él, se desliza mientras esperamos datos.
export const FRASES = [
  "Cebando un mate…",
  "Inflando las ruedas…",
  "Calentando el motor…",
  "Pasando la franela…",
  "Midiendo el aceite…",
  "Ajustando los espejos…",
  "Encerando el capó…",
  "Poniendo primera…",
  "Buscando la llave del portón…",
  "Limpiando el parabrisas…",
  "Cargando nafta…",
  "Acomodando la butaca…",
];

type Props = { frase?: string; pantalla?: boolean; progreso?: number };

export default function Cargando({ frase = "Calentando motores…", pantalla = true, progreso }: Props) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setN((x) => x + 1), 1600);
    return () => clearInterval(t);
  }, []);
  const texto = n === 0 ? frase : FRASES[(n * 5 + frase.length) % FRASES.length];
  const real = typeof progreso === "number";

  return (
    <div className={`carga ${pantalla ? "carga-pantalla" : ""}`} role="status" aria-live="polite">
      {pantalla && <Logo alto={34} className="carga-logo" />}
      <div className="carga-barra" aria-hidden>
        <span className={real ? "carga-relleno" : "carga-desliza"} style={real ? { width: `${progreso}%` } : undefined} />
      </div>
      <p className="carga-pie">
        <span key={texto} className="carga-frase">{texto}</span>
        {real && <span className="carga-pct">{Math.round(progreso)} %</span>}
      </p>
    </div>
  );
}
