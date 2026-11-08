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

Estado del diagnóstico al 7/11/2026:
- PKCE está desactivado en el DevCenter.
- El usuario utiliza su cuenta personal propietaria de la aplicación.
- La ruta /api/mercadolibre/auth responde HTTP 307.
- El servidor de autorización utilizado es auth.mercadolibre.com.ar.
- Se comprobó que client_id está presente.
- El redirect_uri enviado es:
  https://engagement-possibilities-wit-find.trycloudflare.com/api/mercadolibre/callback
- La aplicación de Mercado Libre devuelve:
  "Lo sentimos, la aplicación no puede conectarse a tu cuenta".

La causa todavía NO está identificada.
Falta comparar el APP ID y el redirect_uri con los datos registrados en el DevCenter y revisar el estado de habilitación de la aplicación.

No asumir que OAuth está resuelto porque la ruta devuelve 307.

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

La tabla comparables contiene referencias, precios, fuente, URL, ubicación y fechas.
La tabla appraisals contiene rangos de mercado, valor de toma, confianza y aprobación.

Hay políticas RLS para proteger datos administrativos.
Las oportunidades permiten inserción pública según la implementación existente.

NO debilitar RLS.
NO publicar datos internos de comparables.
NO solicitar ni inventar una clave service_role.
Respetar las políticas y buckets privados existentes.

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
