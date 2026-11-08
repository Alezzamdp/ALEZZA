# ALEZZA

Sistema web para la asesoría automotor integral de ALEZZA. Reúne el catálogo
público, las solicitudes de permuta y el panel comercial para administrar
vehículos, oportunidades, tasaciones, referencias, configuración y actividad.

## Desarrollo local

1. Instalar dependencias con `npm.cmd install`.
2. Crear `.env.local` en la raíz del proyecto con la URL y la clave publicable
   del proyecto Supabase:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
   ```

   No guardar `.env.local` ni claves secretas en Git. La clave `service_role`
   no se usa en el navegador.
3. Iniciar Next.js con `npm.cmd run dev` y abrir `http://localhost:3000`.

Comandos disponibles:

- `npm.cmd run dev`: servidor de desarrollo.
- `npm.cmd run build`: compilación de producción.
- `npm.cmd run lint`: revisión estática con ESLint.

## Configuración de Supabase

Para inicializar o actualizar la base de datos, seguir el orden y las notas de
[`supabase/README.md`](supabase/README.md). Ese documento explica el esquema
base, las migraciones existentes y la configuración de Storage.

## Rutas principales

- `/`: catálogo público.
- `/consultar?vehicle_id=...`: consulta registrada sobre una unidad del catálogo.
- `/simulador`: solicitud de evaluación y permuta.
- `/admin`: oportunidades comerciales y seguimiento.
- `/admin/consultas`: consultas de compradores por vehículos publicados.
- `/admin/vehiculos`: catálogo de vehículos.
- `/admin/referencias`: referencias ingresadas manualmente.
- `/admin/configuracion`: datos públicos de contacto.
- `/admin/actividad`: registro de cambios administrativos.

Las tasaciones actuales son internas y manuales. La verificación con
publicaciones reales se incorporará después; no se deben presentar precios
estimados como si fueran comparables observados.

Las consultas por unidades del catálogo se guardan en `vehicle_inquiries` y se
gestionan por separado de las solicitudes de permuta. En bases existentes,
aplicá la migración `202611070009_vehicle_inquiries.sql` antes de habilitar este
flujo.
