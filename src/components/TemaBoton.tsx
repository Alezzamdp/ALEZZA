"use client";

import { cambiarTema } from "@/lib/tema";
import { useOscuro } from "@/lib/useTema";

// Botón para que quien visita elija modo claro u oscuro (queda guardado en su navegador).
export default function TemaBoton() {
  const oscuro = useOscuro();
  if (oscuro === null) return <span className="tema-btn" aria-hidden />;
  return (
    <button type="button" className="tema-btn" onClick={cambiarTema}
      aria-label={oscuro ? "Cambiar a modo claro" : "Cambiar a modo oscuro"} title={oscuro ? "Modo claro" : "Modo oscuro"}>
      {oscuro ? (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />
        </svg>
      )}
    </button>
  );
}
