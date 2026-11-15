<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->


# ALEZZA — CONTEXTO Y REGLAS PARA CODEX

## 1. Forma de trabajar
- El usuario dirige ALEZZA y espera que Codex actúe como socio técnico.
- Comunicarse en español argentino, de forma directa y práctica.
- Priorizar siempre el próximo paso de mayor impacto.
- Evitar preguntas innecesarias y cambios cosméticos prematuros.
- Antes de modificar, inspeccionar el código y entender la arquitectura existente.
- Hacer cambios pequeños, completos y verificables.
- No sobrescribir funcionalidades existentes sin revisar sus dependencias.
- Informar qué se modificó y cómo se comprobó.
- Dar comandos compatibles con Windows PowerShell.
- Usar npm.cmd en lugar de npm cuando corresponda.

## 2. Proyecto
Ruta: D:\Alezza\simulador-permutas

ALEZZA es una asesoría automotor integral. El proyecto web busca unificar:
- Simulador de permutas y tasaciones.
- Gestión comercial de oportunidades.
- Catálogo de vehículos.
- Preparación y servicios de estética vehicular.
- Información y guías para compradores y vendedores.
- Investigación de mercado con referencias reales.

No es solamente un lavadero ni una agencia de autos.

## 3. Tecnología
- Next.js 16.4.5.
- TypeScript.
- App Router.
- Supabase.
- Entorno local Windows.
- Puerto de desarrollo habitual: 3000.

Comandos:
- npm.cmd run dev
- npm.cmd run build

No iniciar dos servidores Next.js simultáneamente.
Antes de detener un proceso, verificar que realmente pertenezca a este proyecto.

## 4. Prioridades de desarrollo
Primero funcionalidades y seguridad; el rediseño visual queda para después.

El panel administrativo debe permitir gestionar efectivamente:
- Vehículos.
- Consultas de compradores por unidades publicadas.
- Oportunidades comerciales.
- Tasaciones.
- Referencias de mercado.
- Configuración.
- Actividad.

El simulador debe funcionar bien en celular y computadora.
Las fotografías deben poder seleccionarse desde dispositivos y archivos locales.

## 5. Mercado Libre — integración OAuth en curso

Archivos principales:
- src/app/api/mercadolibre/auth/route.ts
- src/app/api/mercadolibre/callback/route.ts
- src/lib/mercadolibre-token.ts

Comportamiento implementado:
- Inicio OAuth con response_type=code.
- Generación de state.
- Cookie HttpOnly para validar state.
- Intercambio de authorization code.
- Guardado cifrado de tokens.
- Renovación mediante refresh_token.

Almacenamiento:
- AES-256-GCM.
- Variable requerida: MERCADOLIBRE_ENCRYPTION_KEY.
- Formato esperado: 64 caracteres hexadecimales (32 bytes).
- Archivo privado en LOCALAPPDATA/ALEZZA/secrets/mercadolibre-token.enc.

La generación de la clave y una prueba de cifrado/descifrado ya fueron realizadas correctamente.
NO regenerar la clave ni borrar los tokens sin una razón comprobada.

IMPORTANTE:
- No mostrar ni copiar valores de .env.local.
- No exponer client_secret, access_token, refresh_token ni códigos OAuth.
- No solicitar al usuario que comparta secretos.
- No debilitar la seguridad de las cookies ni la validación state.
- No devolver tokens al navegador.

Estado verificado al 13/11/2026:
- OAuth completado (tokens guardados el 9/11). Renovación con refresh_token probada OK; /users/me responde 200.
- /sites/MLA/search y /items/{id} responden 403: Mercado Libre no habilitó a la app para leer publicaciones de terceros. Se gestiona aparte con ML; mientras tanto los comparables se cargan de forma asistida en /admin/referencias.
- No hacer scraping del sitio público de Mercado Libre.
- /api/mercadolibre/auth es POST y exige administrador (JWT de Supabase + admin_users, ver src/lib/server-admin.ts). Se inicia desde /admin/configuracion.
- /api/mercadolibre/status (admin) informa el estado sin exponer tokens; ?check=1 prueba la API.
- La renovación usa un lockfile (<token>.lock) para evitar renovaciones simultáneas entre procesos.

Importación de publicaciones (14/11/2026, en /admin/referencias):
- POST /api/mercadolibre/item (admin): lee un aviso por enlace con /items/{id} y completa la referencia (src/lib/mercadolibre-items.ts). Si ML responde 401/403, avisa y se carga a mano.
- GET /api/mercadolibre/search?q= (admin): busca en MLA1744. Hoy ML responde 403; devuelve el enlace de la búsqueda pública para abrirla a mano. Cuando ML habilite el permiso, funciona sin cambios.
- Estado probado 15/11: /sites/MLA/search 403, /items/{id} 403 y el catálogo de autos (domain MLA-CARS_AND_VANS) vacío: la app no tiene acceso a publicaciones de autos; hay que pedirlo a Mercado Libre. Estado probado 14/11: /users/me 200; /sites/MLA/search 403; /items/{id} ya no da 403 de entrada (inexistente → 404), falta confirmar con un aviso real.
- Todo lo importado se revisa antes de guardar: son precios publicados, no de cierre.

## 6. Cloudflare
Se utilizaron Quick Tunnels de trycloudflare.com.

Último dominio utilizado:
https://engagement-possibilities-wit-find.trycloudflare.com

Ese túnel respondió HTTP 200 para la página pública y HTTP 307 para la ruta OAuth.

Los Quick Tunnels son temporales:
- Si se cierra cloudflared, la dirección deja de funcionar.
- Si se crea otro túnel, cambia el dominio.
- El callback de Mercado Libre debe coincidir exactamente con el callback de ALEZZA.

No seguir generando dominios aleatorios como solución permanente.
Investigar una dirección estable mediante un Named Tunnel con dominio propio o un entorno de staging desplegado.

## 7. Investigación de mercado
Objetivo: obtener comparables reales de vehículos comercializados en Argentina y Mercosur.

No inventar publicaciones ni precios.
No presentar estimaciones de IA como si fueran precios observados.

Preferencias:
- Al menos 3 comparables válidos, idealmente 5 o más.
- Misma moneda.
- Modelo, versión, año y kilometraje similares.
- Publicaciones recientes.
- Conservar fuente y URL verificable.
- Utilizar métodos robustos como mediana y analizar dispersión.
- Si faltan referencias, informar insuficiencia y derivar a revisión.

Diferenciar siempre:
- Valor estimado de mercado.
- Valor de toma de ALEZZA.

No aplicar descuentos o márgenes arbitrarios.
Margen de toma definido por el dueño (15/11/2026): valor de toma sugerido = mediana de comparables − 15 % (MARGEN_TOMA en src/lib/market.ts). Es una sugerencia; la toma final la aprueba una persona.

## 8. Supabase y seguridad
Tablas existentes:
- admin_users
- vehicles
- opportunities
- vehicle_inquiries
- appraisals
- comparables
- audit_logs
- app_settings
- bruno_items (BRUNO OS; solo admin y dueño, migración 202611140001)
- turnos y ordenes (migraciones 202611150001 y 202611150002; buckets privados turno-comprobantes y orden-fotos)
- financiaciones (solicitudes con DNI; migración 202611150003, solo admin)

La tabla comparables contiene referencias, precios, fuente, URL, ubicación y fechas.
La tabla appraisals contiene rangos de mercado, valor de toma, confianza y aprobación.

Hay políticas RLS para proteger datos administrativos.
Las oportunidades permiten inserción pública según la implementación existente.

NO debilitar RLS.
NO publicar datos internos de comparables.
NO solicitar ni inventar una clave service_role.
Respetar las políticas y buckets privados existentes.

## 8b. BRUNO OS (sistema central)
Todas las apps de ALEZZA viven en este proyecto y se abren desde BRUNO OS (/os).
- /os: agenda, tareas, ideas y Apps. Login de administrador (admin_users).
- src/app/os/BrunoOS.tsx: login y puente con Supabase (window.BRUNO_NUBE). Valida con src/lib/bruno.ts.
- public/os/app.js: la interfaz (JS sin dependencias). Copia local + cola de cambios sin subir.
- Portal nuevo: una línea en src/app/os/portales.ts (aparece en el Inicio de BRUNO OS y en la barra común).
- Barra común de portales: src/components/PortalBar.tsx (en el layout raíz; en páginas públicas solo con sesión). Incluye el botón Claro / Oscuro.
- Tema único (papel, tinta, mostaza; Unbounded, DM Sans, IBM Plex Mono): src/app/globals.css remapea los colores de Tailwind a las escalas --n* (neutros) y --m* (mostaza); /admin las usa al revés con .tema-admin.
- Claro / oscuro: <html data-tema>, lo fija SCRIPT_TEMA (src/lib/tema.ts) antes de pintar; sin elección guardada sigue al sistema. Para colores nuevos usar var(--tinta), var(--papel), var(--n*), var(--m*), no hex fijos.
- Logo: src/components/Logo.tsx con public/logo-alezza.png (el original, negro sin fondo; en oscuro se invierte).
- Dictado: botón de micrófono en la caja para anotar (tecla M). Reconocimiento de voz del navegador (Edge/Chrome), continuo, corta tras 2,5 s de silencio; pasa números en palabras a cifras ("a las cinco y media de la tarde" → 17:30) y NO guarda solo: queda para revisar y se anota con Enter. Chequeo: node scripts/test-dictado.js. Permissions-Policy permite microphone=(self).
- /vehiculos: portal del stock (src/components/StockVehiculos.tsx, también lo usa el Inicio). "Ver autos en stock" apunta acá.
- /servicios: página de estética (src/app/servicios/page.tsx), resumida; usa el mismo tema y logo.
- Diseño: primero escritorio (menú lateral, tablero en columnas); en el teléfono, una columna.

## 8c. Turnos y Taller
- /turnos (público): servicio, día con cupo, datos y patente → función pedir_turno → /turnos/<token> (enlace privado del cliente: estado y pago de la seña).
- El público nunca toca las tablas: usa funciones security definer (turnos_disponibles, pedir_turno, turno_publico, informar_pago). Comprobantes en turno-comprobantes/<token>/.
- Seña: transferencia + comprobante (confirma el admin) o Mercado Pago (src/lib/mercadopago.ts), que se habilita con MERCADOPAGO_ACCESS_TOKEN. El pago se confirma solo después de leerlo en la API de Mercado Pago (vuelta del cliente o /api/mercadopago/webhook) con confirmar_pago_mp, que solo puede llamar service_role. El webhook necesita una dirección https pública (NEXT_PUBLIC_SITE_URL).
- Configuración de turnos (días, cupo, seña, alias/CBU): app_settings 'turnos', desde /admin/configuracion.
- /admin/turnos: avisos (no vistos, aviso del navegador), verificar comprobante, confirmar turno → se anota en bruno_items (agenda de BRUNO OS), mensajes de WhatsApp con un toque.
- /admin/taller: órdenes de trabajo (cliente, vehículo, trabajos, fotos antes/después achicadas en el navegador, estado, historial). Mensajes rápidos por wa.me (src/lib/turnos.ts, PLANTILLAS). Se abre desde un turno con ?turno=<id>.

- Seña: porcentaje_sena (50 %) del precio del servicio (precios en app_settings 'turnos'); si algo está a cotizar, la seña fija de respaldo. La base calcula el precio (private.precio_turno), no el navegador.
- "Otro / a definir": el cliente elige extras (interiores, motor, butacas, pulido2, pulido1).
- Seguimiento en vivo: /seguimiento/<token de la orden> y la página del turno muestran etapa y checklist (orden_publica / turno_publico, sin precios). Tildar un trabajo en el Taller guarda al instante.
- Catálogo antes/después en /servicios: órdenes con publicar=true (trabajos_publicos; las fotos publicadas se leen con URL firmada).
- WhatsApp hacia ALEZZA: waAlezza() en src/lib/turnos.ts arma el mensaje con el contexto (servicio, fecha, patente, enlace).
- Pantallas de carga: src/components/Cargando.tsx (logo + barra mostaza; con progreso real o deslizante mientras llegan datos, frase por página).

## 8d. Tasación, financiación y extras (15/11/2026)
- Tasación al cliente: después de enviar el simulador, src/components/AsesorCompra.tsx pide primero /api/tasacion (Mercado Libre en vivo: marca+modelo, año ±1, ARS, mín. 3 avisos; solo devuelve el agregado). Si ML responde 403 o hay pocos avisos, usa estimar_mercado (agregado de comparables ARS, mín. 3, sin exponerlos) − 15 % y recomienda autos del stock con el plan de financiación.
- Financiación CreditCar: condiciones de su gráfica en src/lib/financiacion.ts (no hay integración con su API: no tenemos acuerdo). /financiacion pide DNI + WhatsApp con consentimiento (Ley 25.326); /admin/financiacion lleva el embudo hasta "vendida" y estima la comisión.
- No llamar a la API interna de CreditCar sin autorización escrita de ellos.
- Mapa del taller: src/components/MapaTaller.tsx (Leaflet + mapas públicos de Esri; CARTO pide clave).
- Notas para el cliente: historial tipo "nota" de la orden, visibles en el seguimiento.
- Mensajes de WhatsApp: siempre estructurados (saludo, datos en renglones, firma): PLANTILLAS y mensajeAlezza en src/lib/turnos.ts.
- Pantalla de entrada (src/components/Arranque.tsx): avanza con la carga real (imágenes, fuentes, documento) y se va al terminar; tope 8 s.

## 8e. Bot de Marketplace (extensión D:Alezzamessenger-ai-agent)
- Portal /admin/bot: Clientes (fichas de Marketplace con checklist y fotos + oportunidades de la web), Actividad y Configuración (lo que sabe, cómo escribe Bruno, clave del bot, traer datos viejos de la PC).
- Datos en Supabase (migración 202611160001): bot_config, bot_actividad, bot_fichas, bot_fotos (bytea, privadas). RLS solo administradores.
- La extensión no tiene sesión: usa funciones security definer bot_leer_config / bot_registrar / bot_guardar_ficha / bot_guardar_foto que validan la clave del bot contra clave_hash (sha256). Las rutas /api/bot/* reciben la clave en X-Bot-Key (src/app/api/bot/clave.ts, con límite por IP).
- El stock y los precios del bot salen de vehicles (mismo dato que /vehiculos). La permuta se tasa con /api/tasacion (ML, referencias ARS o USD al blue del día − 15 %).
- Mercado hoy (/admin/mercado, /api/mercado-hoy): dólar del día y stock contra el mercado; historial en mercado_historial (migración 202611160002).
- Token de Mercado Libre: sigue en archivo local cifrado (solo funciona desde la PC). Pasarlo a Supabase cuando ML habilite la lectura de avisos; publicado sin token, la tasación usa las referencias.

## 9. Próxima tarea de Codex
Primero realizar una auditoría de estado, sin cambiar archivos:

1. Inspeccionar la estructura del proyecto.
2. Revisar git status.
3. Leer las tres rutas/archivos de OAuth.
4. Verificar las variables de entorno únicamente por presencia y formato, nunca mostrar sus valores.
5. Confirmar el callback utilizado por el código.
6. Comprobar si los procesos Next.js y Cloudflare están activos.
7. Identificar por qué Mercado Libre rechaza la autorización.
8. Proponer el siguiente paso de mayor impacto.

No iniciar otra autorización hasta identificar la causa.
No hacer un rediseño ni refactor general.
