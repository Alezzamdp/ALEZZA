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
- Producción en Vercel (repo Alezzamdp/Alezza05, rama master). Los Quick Tunnels de Cloudflare ya no se usan.
