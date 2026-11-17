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
