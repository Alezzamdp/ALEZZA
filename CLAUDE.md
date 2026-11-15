@AGENTS.md

# simulador-permutas (app web ALEZZA)

## Stack
- Next.js 16.4.5 (App Router), React 19, TypeScript, Tailwind 4.
- Supabase (Auth, Postgres con RLS, Storage, funciones security definer).
- Producción en Vercel (Alezzamdp/Alezza05, rama master). Puerto local 3000.

## Comandos (PowerShell)
```
npm.cmd run dev
npm.cmd run build
npm.cmd test                    # node --test src/lib/*.test.*
npm.cmd run lint
node scripts/test-dictado.js
```
No levantar dos servidores Next a la vez.

## Prioridades
Primero funcionalidad y seguridad; rediseño después. Celular y escritorio. Fotos desde dispositivo y archivos locales.

## Seguridad (obligatorio)
- NO debilitar RLS. Respetar políticas y buckets privados (turno-comprobantes, orden-fotos).
- No pedir, inventar ni exponer la clave service_role.
- No mostrar valores de .env.local ni exponer tokens (ML, MP, bot) al navegador.
- No tocar el token cifrado de Mercado Libre en LOCALAPPDATA ni regenerar MERCADOLIBRE_ENCRYPTION_KEY.
- No hacer scraping de Mercado Libre. No usar la API de CreditCar sin autorización escrita.
- No publicar datos internos de comparables.
- Margen de toma: mediana − 15 % (MARGEN_TOMA en src/lib/market.ts); lo aprueba una persona.
- Migraciones: nunca editar las existentes en supabase/migrations; agregar una nueva.
- Rutas admin: validar con src/lib/server-admin.ts. Público solo vía funciones security definer.

## Supabase
- Tablas: admin_users, vehicles, opportunities (insert público), vehicle_inquiries, appraisals, comparables, audit_logs, app_settings, bruno_items, turnos, ordenes, financiaciones (DNI, solo admin), bot_config/actividad/fichas/fotos, mercado_historial.
- Migraciones y orden de aplicación: supabase/README.md.

## Índice de docs/ (leer solo el del tema en curso)
- docs/decisiones.md — decisiones del dueño, qué es ALEZZA, prioridades, despliegue.
- docs/bruno-os.md — /os, portales, PortalBar, tema claro/oscuro, logo, dictado.
- docs/turnos-taller.md — turnos, seña, Mercado Pago, taller, seguimiento, WhatsApp.
- docs/tasacion-financiacion.md — reglas de mercado, /api/tasacion, CreditCar.
- docs/mercadolibre.md — OAuth ML, token cifrado, estado de la API.
- docs/bot-marketplace.md — /admin/bot, /api/bot/*, extensión messenger-ai-agent.
- README.md — rutas actuales.
