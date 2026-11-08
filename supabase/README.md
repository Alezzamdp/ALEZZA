# Supabase de ALEZZA

Este directorio contiene el esquema base, las migraciones incrementales y las
políticas de Storage. No contiene credenciales.

## Base de datos nueva

Desde el SQL Editor del proyecto Supabase, ejecutar en este orden:

1. `schema.sql`
2. `storage.sql`

`schema.sql` deja creadas las tablas, RLS y políticas en su estado actual.
`storage.sql` crea los buckets y las políticas para fotografías.

## Primer acceso administrador

1. Crear o invitar al usuario desde la sección de usuarios de Auth en Supabase.
   La app no ofrece registro público.
2. En el SQL Editor, asociar el usuario existente a `admin_users`, reemplazando
   el correo por el mismo que se usó en Auth:

   ```sql
   do $$
   declare
     admin_id uuid;
   begin
     select id into admin_id
     from auth.users
     where email = 'admin@ejemplo.com';

     if admin_id is null then
       raise exception 'No existe ese usuario en Auth; crealo o invitalo primero.';
     end if;

     insert into public.admin_users (user_id)
     values (admin_id)
     on conflict (user_id) do nothing;
   end;
   $$;
   ```

3. Iniciar sesión en `/admin`. Las demás pantallas administrativas comparten
   el mismo acceso y RLS verifica el registro de `admin_users`.

## Base existente

Ejecutar cada archivo de `migrations/` en orden numérico, sin saltear ninguno:

1. `202611070001_crm_persistence.sql`
2. `202611070002_public_profile.sql`
3. `202611070003_opportunity_followup_plan.sql`
4. `202611070004_public_desired_vehicle.sql`
5. `202611070005_opportunity_contact_required.sql`
6. `202611070006_closed_opportunity_followup_check.sql`
7. `202611070007_crm_history_integrity.sql`
8. `202611070008_restrict_vehicle_delete_with_leads.sql`
9. `202611070009_vehicle_inquiries.sql`
10. `storage.sql`

Para inspeccionar una base existente antes de decidir qué aplicar, ejecutar
[`audit_schema.sql`](audit_schema.sql) en el SQL Editor de Supabase. La consulta
es de solo lectura: informa tablas, columnas, restricciones, políticas y buckets
faltantes o que requieren revisión, sin mostrar registros de clientes ni cambiar
la base. Comparar el resultado con el historial disponible y aplicar únicamente
las migraciones pendientes, en orden.

Las migraciones 003 a 006 amplían el seguimiento comercial, validan que el
vehículo buscado esté publicado y disponible o reservado, exigen un medio de
contacto en las solicitudes públicas y evitan programar seguimientos en
oportunidades cerradas. La restricción de la migración 006 es `NOT VALID`: no
cambia ni valida los registros históricos, pero se aplica a las nuevas
escrituras. Si se actualiza un registro histórico cerrado que todavía tiene un
seguimiento, hay que limpiar esa fecha y su nota en la misma operación.

La migración 007 aplica en una sola transacción las reglas de integridad del
CRM: `audit_logs`, el historial de contactos y las versiones de tasación quedan
append-only; los administradores solo pueden leer e insertar, y cada evento o
aprobación queda asociado al usuario autenticado. También quita el borrado
definitivo de oportunidades para los roles de la app: el panel conserva los
estados `Concretada` y `Descartada` como cierre, evitando que un borrado arrastre
las tasaciones y los seguimientos asociados.

La migración 008 impide borrar vehículos que todavía aparecen como objetivo en
una oportunidad. Para retirarlos del catálogo, pausá la publicación o marcá la
unidad como vendida; así se conserva el contexto de las solicitudes existentes.

La migración 009 agrega el registro separado de consultas de compradores. Los
visitantes sólo pueden crear consultas para vehículos publicados y disponibles
o reservados. Los datos de contacto y notas internas sólo quedan disponibles
para administradores; el borrado de una unidad con consultas asociadas queda
restringido. También incorpora fecha y motivo del próximo contacto y exige
limpiarlos al cerrar o descartar la consulta.

Si se había ejecutado una versión anterior de la migración 009 que todavía no
tenía los campos de seguimiento, se puede volver a ejecutar el archivo
actualizado: agrega las columnas y restricciones faltantes de forma idempotente.

## Storage

- `vehicle-photos` es público para mostrar imágenes del catálogo. Sólo los
  administradores pueden cargar, listar o borrar sus objetos.
- `trade-vehicle-photos` permanece privado. Los visitantes pueden subir fotos
  de permuta sólo bajo `inbox/<uuid>/<slot>-<uuid>.<ext>` y si la ruta ya está
  declarada en una oportunidad; sólo los administradores pueden leerlas. Los
  slots aceptados son `front`, `rear`, `left`, `right`, `interior` y
  `dashboard`, con extensión JPG, PNG o WEBP.

Al ejecutar `storage.sql`, un bucket existente `vehicle-photos` queda público.
Revisar su contenido antes de aplicarlo si ya tenía archivos.
Volver a ejecutar `storage.sql` en bases existentes para aplicar o actualizar
las políticas de Storage; el archivo elimina y recrea sus propias políticas.

## Entorno local

Crear `.env.local` en la raíz del proyecto con `NEXT_PUBLIC_SUPABASE_URL` y
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, obtenidas del proyecto Supabase. Son
credenciales publicables; no usar `service_role` en el navegador ni subir el
archivo a Git. Este checkout no tiene Supabase CLI ni configuración local de
proyecto; por eso las instrucciones de arriba usan el SQL Editor.
