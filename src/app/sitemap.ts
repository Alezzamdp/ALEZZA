import type { MetadataRoute } from "next";
import { SITIO } from "@/lib/contacto";

// Solo las páginas públicas; gestión y enlaces personales quedan afuera (ver robots.ts).
export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/turnos", "/contacto"].map((ruta) => ({
    url: SITIO + ruta,
    changeFrequency: "weekly" as const,
    priority: ruta === "" ? 1 : 0.8,
  }));
}
