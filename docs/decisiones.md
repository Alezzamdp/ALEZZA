# Decisiones del dueño y prioridades

## Decisiones (no cambiar sin el dueño)
- Margen de toma: mediana de comparables − 15 % (15/11/2026). Sugerencia; la aprueba una persona.
- No hacer scraping del sitio público de Mercado Libre.
- No usar la API interna de CreditCar sin autorización escrita.
- NO debilitar RLS. Respetar políticas y buckets privados.
- No exponer tokens ni pedir/inventar la clave service_role.
- No regenerar MERCADOLIBRE_ENCRYPTION_KEY ni borrar el token cifrado sin razón comprobada.
- WhatsApp: mensajes siempre estructurados (PLANTILLAS en src/lib/turnos.ts).
- Datos personales (DNI) solo con consentimiento (Ley 25.326).

## Qué es ALEZZA
Asesoría automotor integral (no solo lavadero ni agencia): simulador de permutas y tasaciones, gestión comercial de oportunidades, catálogo, estética vehicular, guías para compradores/vendedores, investigación de mercado con referencias reales.

## Prioridades
- Primero funcionalidad y seguridad; el rediseño visual después.
- El panel debe gestionar: vehículos, consultas de compradores, oportunidades, tasaciones, referencias de mercado, configuración, actividad.
- Simulador usable en celular y computadora. Fotos seleccionables desde dispositivos y archivos locales.

## Despliegue
- Producción en Vercel (repo Alezzamdp/ALEZZA, rama master). Los Quick Tunnels de Cloudflare ya no se usan.
- 2026-11-15: dominio oficial `alezza.com.ar`, con el apex como principal y `www` redirigiendo con 308. DNS en Cloudflare en modo DNS only, con SSL emitido por Vercel. Detalle y registros en `docs/infraestructura.md`.

## Sitio público = solo ALEZZA DETAIL (2026-11-17)
- El sitio es una sola página (/) de estética vehicular, pensada para vender el taller y buscar alianzas con agencias, más /turnos y /contacto.
- Retirados por ahora (redirect a / en next.config.ts, el código se conserva): /simulador, /vehiculos, /financiacion, /consultar y /servicios. La visión de ecosistema (src/lib/ecosistema.ts) queda para cuando vuelvan.
- Los precios destacan la Preparación integral como la mejor opción; el ahorro frente a las tres etapas por separado (barniz, motor, habitáculo) sale de los precios de la configuración (valorSeparado en src/lib/turnos.ts).
- Google: solo se muestran las cinco estrellas (src/components/GoogleEstrellas.tsx), sin puntaje ni cantidad de reseñas.
- Fondo de píxeles PixelBlast (React Bits) en todo el sitio público: src/components/PixelBlast.tsx y FondoPixeles.tsx.

## Plan Agencias, turno por WhatsApp y paleta rosa (2026-11-18)
- Plan Agencias = Preparación integral ($250.000 por unidad, precio de app_settings 'turnos'.puesta). La Preparación base ($60.000) es para particulares.
- /turnos ya no tiene calendario ni seña online: es un pedido (plan, nombre, vehículo) que abre WhatsApp con el mensaje armado; el día y la hora se coordinan por WhatsApp. Estos pedidos NO se guardan en la base ni aparecen en /admin/turnos. Las rutas /turnos/[token] y /seguimiento/[token] siguen funcionando para los turnos ya creados.
- Sitio público siempre oscuro: negro, blanco y rosa #ff2e93 (variable --rosa en globals.css). Fondo PixelBlast rosa con opacidad baja y más tenue en el centro, y tarjetas con fondo negro sólido para cuidar la legibilidad.
- El Inicio tiene cuatro bloques: oferta de agencias, particulares, cómo trabajamos con la agencia y mapa.

## Galería, modo claro/oscuro y datos del auto (2026-11-18)
- Fotos de unidades en public/fotos/unidad-N.webp, igualadas en brillo, contraste, saturación y tono; se muestran con AccordionGallery (React Bits, GSAP) en src/components/GaleriaUnidades.tsx, que la carga recién al acercarse. Los nombres de las unidades están ahí; actualizarlos si cambian las fotos.
- El visitante elige modo claro u oscuro con el botón de la cabecera (se guarda en su navegador; por defecto sigue al sistema). El fondo PixelBlast rosa sigue ese modo (src/components/FondoPixeles.tsx).
- Antes de abrir WhatsApp (en /contacto y /turnos) se piden marca y modelo, año y patente, y el mensaje sale con esos datos (src/lib/auto.ts). Para agencias son opcionales.
- Estrellas de Google en amarillo, sin puntaje ni cantidad.

## Celular primero, fotos claras y datos obligatorios (2026-11-19)
- El sitio se diseña primero para celular (la mayoría de las visitas): títulos grandes, botones de 48-50 px, barra fija abajo con "Soy agencia" y "Solicitar turno" (src/components/BarraMovil.tsx) y fondo animado más liviano.
- Fotos de unidades en 3:2 (1200x800), con el auto entero, más claras y con el mismo color. La foto abierta del mostrador mide siempre 3:2 (GaleriaUnidades.tsx calcula el alto); en celular el mostrador es vertical. Se quitó el detalle trasero del Passat porque no mostraba el auto entero. La camioneta negra es una Suran.
- Marca y modelo, año y patente son obligatorios en /contacto y /turnos, también para agencias (que además indican unidades). Ya no hay campos opcionales.

## Foto de la persona del taller (2026-11-19)
- Bloque "Quién está detrás" en el Inicio (id equipo): foto de Bruno con marco redondo (public/fotos/bruno-2.webp, recorte cuadrado con el color de la web) y su bio. La bio y las cifras (+30 operaciones comerciales, +70 servicios) las dio Bruno el 2026-11-19; actualizarlas en src/app/page.tsx cuando cambien.

## Fotos con cartel, detalles, avisos y fluidez (2026-11-19)
- Mostrador con 7 unidades en 4:3, con el auto entero y el cartel de ALEZZA a la vista (Tracker, Vento, Passat CC x2, Suran, Partner, Gol Trend). La foto trasera del Vento blanco no se usa. Patentes difuminadas en las fotos originales antes del recorte.
- Fotos de detalle (public/fotos/detalle-*.webp) (hoy el faro del Vento en Particulares; la del Passat se quitó por tener la rueda cortada); para sumar más, usar la clase .lp-visual junto al bloque de texto.
- Modo claro con texto negro (--lp-mute casi negro y grises de Tailwind oscurecidos en .lp).
- Formularios: si faltan datos se avisa cuáles (aviso arriba y en cada campo, con foco en el primero); con todo completo se redirige a WhatsApp con el mensaje armado (y un enlace de respaldo).
- Fluidez: fondo PixelBlast limitado a 30 cuadros (maxFps) y menor resolución, sin desenfoques de fondo (backdrop-filter) ni máscaras sobre el fondo animado, y paneles del mostrador aislados (contain). Medido en local: unos 97-99 fps al hacer scroll y al mover el mostrador.
- Bio de Bruno: se suma la calificación como vendedor en Marketplace (4,9 e insignia "Calificación alta") sin cantidad de reseñas ni puntos fuertes. Datos de la captura de Bruno del 2026-11-19; actualizar en src/app/page.tsx si cambian.
