-- Quita políticas creadas a mano desde el panel de Supabase que no están en el repo.
-- Las políticas permisivas se suman (OR): mientras existan, anulan las restricciones
-- de 007 (historial append-only) y de storage.sql (rutas de fotos de permuta).
-- Ejecutar DESPUÉS de 007 y de storage.sql, que crean sus reemplazos.
begin;

-- Reemplazadas por "admin read/insert opportunity followups" (007).
drop policy if exists "Admins insert opportunity followups" on public.opportunity_followups;
drop policy if exists "Admins manage opportunity followups" on public.opportunity_followups;
drop policy if exists "Admins read opportunity followups" on public.opportunity_followups;

-- Permitían subir cualquier archivo a cualquier ruta del bucket privado.
-- Reemplazadas por "Public upload trade vehicle photos" (storage.sql), que exige
-- inbox/<uuid>/<slot>-<uuid>.<ext> declarado en una oportunidad.
drop policy if exists "Allow anonymous vehicle photo uploads" on storage.objects;
drop policy if exists "Allow authenticated vehicle photo uploads" on storage.objects;

-- Duplicadas por "Admin upload/delete vehicle photos" (storage.sql).
-- "Admins update vehicle photos" se conserva: storage.sql no define update.
drop policy if exists "Admins upload vehicle photos" on storage.objects;
drop policy if exists "Admins delete vehicle photos" on storage.objects;

commit;
