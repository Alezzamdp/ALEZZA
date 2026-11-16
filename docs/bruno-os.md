# BRUNO OS (sistema central)

BRUNO OS es la parte interna (admin) de ALEZZA: /os y /admin. El sitio público no lo muestra ni lo nombra:
no usa su pantalla de entrada, sus frases de carga, su manifest ni su tema (ver "Sitio público" abajo).

- /os: agenda, tareas, ideas y Apps. Login de administrador (admin_users).
- src/app/os/BrunoOS.tsx: login y puente con Supabase (window.BRUNO_NUBE). Valida con src/lib/bruno.ts.
- public/os/app.js: la interfaz (JS sin dependencias). Copia local + cola de cambios sin subir.
- Datos: tabla bruno_items (solo admin y dueño, migración 202611140001).
- Portal nuevo: una línea en src/app/os/portales.ts (aparece en el Inicio de BRUNO OS y en la barra común).
- Barra común: src/components/PortalBar.tsx (layout raíz; en páginas públicas solo con sesión). Incluye Claro / Oscuro.

## Tema
- Único: papel, tinta, mostaza; Unbounded, DM Sans, IBM Plex Mono.
- src/app/globals.css remapea Tailwind a --n* (neutros) y --m* (mostaza); /admin las usa al revés con .tema-admin.
- Claro/oscuro: `<html data-tema>`, lo fija SCRIPT_TEMA (src/lib/tema.ts) antes de pintar; sin elección guardada sigue al sistema.
- Colores nuevos: var(--tinta), var(--papel), var(--n*), var(--m*). Nunca hex fijos.
- Logo: src/components/Logo.tsx + public/logo-alezza.png (negro sin fondo; en oscuro se invierte).
- Diseño: primero escritorio (menú lateral, tablero en columnas); en teléfono, una columna.

## Dictado
- Botón de micrófono en la caja para anotar (tecla M). Reconocimiento de voz del navegador (Edge/Chrome), continuo, corta tras 2,5 s de silencio.
- Pasa números en palabras a cifras ("a las cinco y media de la tarde" → 17:30). NO guarda solo: queda para revisar y se anota con Enter.
- Chequeo: `node scripts/test-dictado.js` (desde simulador-permutas). Permissions-Policy permite microphone=(self).

## Páginas relacionadas
- /vehiculos: stock (src/components/StockVehiculos.tsx, también en el Inicio). "Ver autos en stock" apunta acá.
- /servicios: estética (src/app/servicios/page.tsx), mismo tema y logo.
- Pantalla de entrada: src/components/Arranque.tsx (solo en /os y /admin; avanza con la carga real; tope 8 s).
- Pantallas de carga: src/components/Cargando.tsx (las frases que rotan solo aparecen en /os y /admin).

## Sitio público
- Todos los portales que ve el cliente usan `<main className="lp">` + SitioCabecera / SitioPie (src/components/SitioMarco.tsx). Estilos .lp, .sm, .ad y .rv en globals.css: blanco y negro, sin mostaza.
- Menú escalonado: src/components/SitioMenu.tsx (CSS, sin librerías). Portal nuevo en el menú = una línea en ITEMS.
- Antes y después: src/components/AntesDespues.tsx; los datos los firma el servidor en src/lib/sitio.ts (trabajosPublicos). El primero publicado es la pieza central del Inicio.
- Qué se publica se maneja en /admin/taller: panel "Antes y después publicados en la web" (quitar de la web o borrar fotos).
- Planes y servicios individuales: textos en src/lib/turnos.ts (PLANES, DETALLE_EXTRAS); precios desde app_settings "turnos".
- Permutas (/simulador) está fuera del sitio: redirige al Inicio desde next.config.ts. El código se conserva.
