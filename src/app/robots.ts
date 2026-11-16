import type { MetadataRoute } from "next";

// Los buscadores solo recorren el sitio público; gestión, API y enlaces personales quedan afuera.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/os", "/api/", "/turnos/", "/seguimiento/"] },
  };
}
