"use client";

import { useSyncExternalStore } from "react";

// Modo claro/oscuro actual del sitio (<html data-tema>, que pone src/lib/tema.ts). null mientras se hidrata.
const suscribir = (aviso: () => void) => {
  const o = new MutationObserver(aviso);
  o.observe(document.documentElement, { attributes: true, attributeFilter: ["data-tema"] });
  return () => o.disconnect();
};

export function useOscuro(): boolean | null {
  return useSyncExternalStore<boolean | null>(
    suscribir,
    () => document.documentElement.dataset.tema === "oscuro",
    () => null,
  );
}
