"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Cargando from "@/components/Cargando";

// Pantalla de entrada de BRUNO OS y Gestión (el sitio público no la muestra): avanza con la carga real de la página (imágenes, tipografías y documento)
// y se va apenas termina. Tope de seguridad por si algún recurso nunca responde.
const RUTAS: [string, string][] = [
  ["/os", "Encendiendo BRUNO OS…"],
  ["/admin/taller", "Abriendo el portón del taller…"],
  ["/admin/turnos", "Revisando la agenda del taller…"],
  ["/admin", "Abriendo la oficina…"],
];
const TOPE_MS = 8000;

function avance() {
  const imgs = Array.from(document.images);
  const listas = imgs.filter((i) => i.complete).length;
  const fuentes = document.fonts?.status === "loaded" ? 1 : 0;
  const documento = document.readyState === "complete" ? 1 : document.readyState === "interactive" ? 0.5 : 0;
  return ((listas + fuentes + documento) / (imgs.length + 2)) * 100;
}

export default function Arranque() {
  const ruta = usePathname();
  const [progreso, setProgreso] = useState(0);
  const [fase, setFase] = useState<"visible" | "saliendo" | "fuera">("visible");

  useEffect(() => {
    const inicio = Date.now();
    const t = setInterval(() => {
      const listo = document.readyState === "complete" || Date.now() - inicio > TOPE_MS;
      setProgreso((p) => Math.max(p, listo ? 100 : avance()));
      if (listo) {
        clearInterval(t);
        setTimeout(() => setFase("saliendo"), 250);
        setTimeout(() => setFase("fuera"), 700);
      }
    }, 80);
    return () => clearInterval(t);
  }, []);

  if (fase === "fuera" || !RUTAS.some(([r]) => ruta.startsWith(r))) return null;
  const frase = RUTAS.find(([r]) => ruta.startsWith(r))?.[1] ?? "Preparando ALEZZA…";
  return (
    <div className={`arranque-os ${fase === "saliendo" ? "saliendo" : ""}`} aria-hidden={fase === "saliendo"}>
      <Cargando frase={frase} progreso={progreso} />
    </div>
  );
}
