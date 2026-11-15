# Turnos y Taller

Migraciones 202611150001 y 202611150002. Tablas turnos y ordenes. Buckets privados turno-comprobantes y orden-fotos.

## Público
- /turnos: servicio, día con cupo, datos y patente → función pedir_turno → /turnos/<token> (enlace privado: estado y pago de la seña).
- El público nunca toca las tablas: funciones security definer turnos_disponibles, pedir_turno, turno_publico, informar_pago. Comprobantes en turno-comprobantes/<token>/.
- "Otro / a definir": el cliente elige extras (interiores, motor, butacas, pulido2, pulido1).
- Seguimiento en vivo: /seguimiento/<token de la orden> y la página del turno muestran etapa y checklist (orden_publica / turno_publico, sin precios).
- Catálogo antes/después en /servicios: órdenes con publicar=true (trabajos_publicos; fotos con URL firmada).

## Seña
- porcentaje_sena (50 %) del precio del servicio (precios en app_settings 'turnos'); si algo está a cotizar, seña fija de respaldo.
- La base calcula el precio (private.precio_turno), no el navegador.
- Transferencia + comprobante (confirma el admin) o Mercado Pago (src/lib/mercadopago.ts, se habilita con MERCADOPAGO_ACCESS_TOKEN).
- MP se confirma solo después de leerlo en la API de MP (vuelta del cliente o /api/mercadopago/webhook) con confirmar_pago_mp, que solo puede llamar service_role.
- El webhook necesita una dirección https pública (NEXT_PUBLIC_SITE_URL).

## Admin
- Configuración (días, cupo, seña, alias/CBU): app_settings 'turnos', desde /admin/configuracion.
- /admin/turnos: avisos (no vistos, aviso del navegador), verificar comprobante, confirmar turno → se anota en bruno_items (agenda BRUNO OS), WhatsApp con un toque.
- /admin/taller: órdenes de trabajo (cliente, vehículo, trabajos, fotos antes/después achicadas en el navegador, estado, historial). Se abre desde un turno con ?turno=<id>. Tildar un trabajo guarda al instante.
- Notas para el cliente: historial tipo "nota" de la orden, visibles en el seguimiento.
- Mapa del taller: src/components/MapaTaller.tsx (Leaflet + mapas públicos de Esri; CARTO pide clave).

## WhatsApp
- Siempre mensajes estructurados (saludo, datos en renglones, firma): PLANTILLAS y mensajeAlezza en src/lib/turnos.ts, por wa.me.
- Hacia ALEZZA: waAlezza() en src/lib/turnos.ts arma el mensaje con contexto (servicio, fecha, patente, enlace).
