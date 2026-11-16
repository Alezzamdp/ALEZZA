import type { MetadataRoute } from "next";
import { SITIO } from "@/lib/contacto";

// Solo las páginas públicas; gestión y enlaces personales quedan afuera (ver robots.ts).
export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/vehiculos", "/simulador", "/financiacion", "/servicios", "/turnos"].map((ruta) => ({
    url: SITIO + ruta,
    changeFrequency: ruta === "/vehiculos" ? "daily" : "weekly",
    priority: ruta === "" ? 1 : 0.8,
  }));
}
