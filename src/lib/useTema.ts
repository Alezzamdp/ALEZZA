"use client";

import { useSyncExternalStore } from "react";

// Modo claro/oscuro actual del sitio (<html data-tema>, que pone src/lib/tema.ts). null mientras se hidrata.
const suscribir = (aviso: () => void) => {
  const o = new MutationObserver(aviso);
  o.observe(document.documentElement, { attributes: true, attributeFilter: ["data-tema"] });
  return () => o.disconnect();
};

// Pantalla chica (celular): se usa para aligerar el fondo animado.
const suscribirChico = (aviso: () => void) => {
  const m = window.matchMedia("(max-width: 720px)");
  m.addEventListener("change", aviso);
  return () => m.removeEventListener("change", aviso);
};
export const useChico = (): boolean => useSyncExternalStore(suscribirChico, () => window.matchMedia("(max-width: 720px)").matches, () => false);

export function useOscuro(): boolean | null {
  return useSyncExternalStore<boolean | null>(
    suscribir,
    () => document.documentElement.dataset.tema === "oscuro",
    () => null,
  );
}
