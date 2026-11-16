import type { NextConfig } from "next";

const dev = process.env.NODE_ENV !== "production";

// Content-Security-Policy: el navegador solo carga y contacta lo que el sitio usa de verdad.
// - Scripts: propios e inline (el script de tema y la hidratación de Next no llevan nonce); eval solo en desarrollo.
// - Conexiones: el propio sitio y Supabase (API, Auth, Storage y tiempo real). Todo lo demás (ML, MP, dólar) pasa por /api.
// - Imágenes: https en general (fotos de vehículos, Storage firmado y mosaicos del mapa).
const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' https://*.supabase.co wss://*.supabase.co${dev ? " ws: http://localhost:*" : ""}`,
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  ...(dev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

// Zonas privadas o con enlaces personales: no se indexan en buscadores.
const noIndexar = [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Permutas está fuera del sitio por ahora: el portal /simulador no se muestra (el código se conserva).
  async redirects() {
    return [{ source: "/simulador", destination: "/", permanent: false }];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: CSP },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
          { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
          { key: "Permissions-Policy", value: "geolocation=(), microphone=(self), payment=(), usb=(), bluetooth=(), serial=(), browsing-topics=()" },
        ],
      },
      { source: "/admin/:path*", headers: noIndexar },
      { source: "/os/:path*", headers: noIndexar },
      { source: "/api/:path*", headers: noIndexar },
      { source: "/turnos/:token", headers: noIndexar },
      { source: "/seguimiento/:path*", headers: noIndexar },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
