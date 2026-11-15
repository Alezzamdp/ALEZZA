# Mercado Libre — OAuth e importación

## Archivos
- src/app/api/mercadolibre/auth/route.ts — POST, exige admin (JWT Supabase + admin_users, src/lib/server-admin.ts). Se inicia desde /admin/configuracion (MercadoLibreCard.tsx).
- src/app/api/mercadolibre/callback/route.ts
- src/app/api/mercadolibre/status — admin; estado sin exponer tokens; `?check=1` prueba la API.
- src/app/api/mercadolibre/item — POST admin: lee un aviso por enlace (/items/{id}, src/lib/mercadolibre-items.ts). 401/403 → avisa y se carga a mano.
- src/app/api/mercadolibre/search — GET `?q=` admin: busca en MLA1744. Con 403 devuelve el enlace a la búsqueda pública.
- src/lib/mercadolibre-token.ts — guardado cifrado y renovación.
- Hoy item/search no tienen pantalla que las llame (la vieja /admin/referencias ya no existe).

## Flujo implementado
response_type=code → state en cookie HttpOnly → intercambio de code → tokens cifrados → renovación con refresh_token (lockfile `<token>.lock` evita renovaciones simultáneas entre procesos).

## Almacenamiento
- AES-256-GCM. Variable MERCADOLIBRE_ENCRYPTION_KEY (64 hex = 32 bytes).
- Archivo local: LOCALAPPDATA/ALEZZA/secrets/mercadolibre-token.enc (solo funciona desde la PC).
- Clave y prueba de cifrado ya hechas. NO regenerar la clave ni borrar tokens sin razón comprobada. NO tocar ese archivo.
- Pasar el token a Supabase recién cuando ML habilite la lectura de avisos. Publicado sin token, la tasación usa las referencias.

## Seguridad (obligatorio)
- No mostrar ni copiar valores de .env.local.
- No exponer client_secret, access_token, refresh_token ni códigos OAuth.
- No pedirle secretos al usuario.
- No debilitar cookies ni la validación de state.
- No devolver tokens al navegador.
- NO hacer scraping del sitio público de Mercado Libre.

## Estado (probado 13–15/11/2026)
- OAuth OK (tokens del 9/11), refresh OK, /users/me 200.
- /sites/MLA/search 403; /items/{id} 403; catálogo MLA-CARS_AND_VANS vacío → la app no tiene acceso a publicaciones de autos. Hay que pedirlo a Mercado Libre.
- Lo importado se revisa antes de guardar: son precios publicados, no de cierre.
