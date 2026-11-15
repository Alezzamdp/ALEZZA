# Bot de Marketplace

Extensión de Chrome en D:\0\messenger-ai-agent (repo propio; prueba: `node messenger-ai-agent/test-bot.js` desde D:\0).

- Portal /admin/bot: Clientes (fichas de Marketplace con checklist y fotos + oportunidades de la web), Actividad y Configuración (lo que sabe, cómo escribe Bruno, clave del bot, traer datos viejos de la PC).
- Datos (migración 202611160001): bot_config, bot_actividad, bot_fichas, bot_fotos (bytea, privadas). RLS solo administradores.
- La extensión no tiene sesión: usa funciones security definer bot_leer_config / bot_registrar / bot_guardar_ficha / bot_guardar_foto, que validan la clave del bot contra clave_hash (sha256).
- Rutas /api/bot/* reciben la clave en X-Bot-Key (src/app/api/bot/clave.ts, con límite por IP).
- Stock y precios del bot salen de vehicles (mismo dato que /vehiculos).
- La permuta se tasa con /api/tasacion (ML, referencias ARS o USD al blue del día − 15 %). Dólar del día: /api/dolar.
- Tabla mercado_historial (migración 202611160002) sigue en la base; su pantalla vieja ya no existe.
