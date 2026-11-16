# Infraestructura y dominio

Estado al 2026-11-15. La fuente de verdad de los registros DNS es Vercel (`get_domain_config`); no copiar valores de otros lados.

## Estado actual
| Pieza | Estado |
|---|---|
| Hosting | Vercel, team `alezzamdp`, proyecto `alezza05-cqnt`. Deploy de producción READY, responde 200. |
| Auto-deploy | GitHub `Alezzamdp/Alezza05`, rama `master`. Cada push a master publica en producción. |
| URL actual | https://alezza05-cqnt.vercel.app |
| Dominio | `alezza.com.ar` y `www.alezza.com.ar` ya están agregados al proyecto en Vercel. `www` redirige a apex con 308. |
| DNS | **Falta.** `alezza.com.ar` hoy no resuelve (NXDOMAIN) porque NIC.ar no lo tiene delegado. |
| SSL | Lo emite Vercel en forma automática cuando el DNS apunte bien. |
| Headers de seguridad | En `next.config.ts`: HSTS de 2 años, CSP completa (scripts propios, conexiones solo al sitio y a Supabase, sin iframes), X-Frame-Options DENY, nosniff, COOP, Referrer-Policy y Permissions-Policy. `X-Robots-Tag: noindex` en /admin, /os, /api, /turnos/[token] y /seguimiento. Si se suma un servicio externo que el navegador llame directo, hay que agregarlo a `connect-src`. |
| Sitio viejo | https://alezzamdp.github.io/ALEZZA/ (GitHub Pages). Sus og:url apuntan a `alezzamdp.com`, que no existe. |

## Pasos para activar el dominio (requieren al usuario)
1. **NIC.ar**: confirmar que `alezza.com.ar` está registrado a nombre del titular y vigente. Anotar la fecha de vencimiento.
2. **Cloudflare**: Add a site con `alezza.com.ar`, plan Free. Cloudflare asigna dos nameservers (`*.ns.cloudflare.com`).
3. **Revisar** los registros que Cloudflare importe solo. Si hay registros de mail (MX/TXT) que se usan, conservarlos.
4. **Cargar en Cloudflare** los registros de abajo.
5. **NIC.ar**: en Delegaciones, reemplazar los DNS por los dos nameservers de Cloudflare. La propagación tarda entre minutos y 24 h.
6. **Verificar**: Vercel marca los dominios como Valid Configuration y emite el SSL. Con eso, `https://www.alezza.com.ar` responde 308 hacia `https://alezza.com.ar`.

## Registros DNS en Cloudflare
| Tipo | Nombre | Valor | Proxy |
|---|---|---|---|
| A | `@` | `216.198.79.1` | DNS only (nube gris) |
| A | `@` | `64.29.17.1` | DNS only (nube gris) |
| CNAME | `www` | `af06648748c0426d.vercel-dns-017.com` | DNS only (nube gris) |

- Alternativas genéricas que documenta Vercel: A `76.76.21.21` y CNAME `cname.vercel-dns.com`.
- Se elige **DNS only** para que Vercel emita y renueve el certificado sin interferencias; su CDN ya cubre el caché.
- Si más adelante se activa el proxy naranja, poner SSL/TLS en **Full (strict)**. Nunca usar Flexible, porque genera loops de redirección.

## Después de activar el dominio
- Actualizar en Supabase Auth: Site URL y Redirect URLs con `https://alezza.com.ar`.
- Revisar las URLs absolutas del bot de Marketplace (`messenger-ai-agent`) que llaman a `/api/bot/*`.
- Configurar `metadataBase` y canonical con `https://alezza.com.ar`, y sumar sitemap y robots.
- Sitio viejo: agregar en GitHub Pages un aviso o meta refresh hacia `alezza.com.ar`. No borrarlo hasta que el nuevo esté indexado.

## Variables de entorno y entornos
- **Local**: `.env.local`, que no se versiona. Variables públicas: `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- **Vercel**: las variables se cargan por entorno (Production / Preview / Development). Las claves sensibles van sin `NEXT_PUBLIC_`, así no llegan al navegador.
  - Son sensibles los tokens de ML, MP y el bot, y `MERCADOLIBRE_ENCRYPTION_KEY`.
- **Previews**: cada rama distinta de master genera una URL de preview. Así se prueba sin tocar producción.
- **Dev local**: `npm.cmd run dev`, en el puerto 3000.

## Costos
Todo en planes gratuitos: Vercel Hobby, Cloudflare Free y GitHub. El único costo es la renovación anual del dominio en NIC.ar.

> Nota: Vercel Hobby es para uso no comercial. Si el tráfico o el uso comercial crecen, evaluar Vercel Pro antes de que lo exijan.

## Arquitectura propuesta del sitio público
El sitio viejo solo presenta estética (Abrillantado, Acondicionado, Saneamiento; planes Lavado Técnico, Puesta en Valor y Plan Agencia). El nuevo tiene que presentar la **asesoría automotor integral**.

Navegación principal:
1. **Inicio** (`/`): propuesta de valor, los tres caminos (comprar, vender/permutar, cuidar tu auto) y CTA a WhatsApp.
2. **Vehículos** (`/vehiculos`): catálogo.
3. **Tasá / Permutá** (`/simulador`): simulador de permuta y tasación.
4. **Financiación** (`/financiacion`).
5. **Estética** (`/servicios`): migra el contenido del sitio viejo, con servicios, planes, proceso en 4 pasos y la línea "Particulares / Agencias".
6. **Turnos** (`/turnos`).
7. **Contacto** (footer en todas las páginas): WhatsApp 223 421-2621, Instagram @alezzamdp, Google Maps "ALEZZA DETAIL".

Identidad: negro y blanco, sin dorado, con el logo oficial `public/logo-alezza.png` sin modificar. Hay que reemplazar el favicon dorado del sitio viejo.
