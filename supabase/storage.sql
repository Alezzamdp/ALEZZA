-- Public catalog images. Upload and deletion remain restricted to admins.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'vehicle-photos',
  'vehicle-photos',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 8388608,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "Admin upload vehicle photos"
on storage.objects;

create policy "Admin upload vehicle photos"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'vehicle-photos'
  and public.is_admin()
);

drop policy if exists "Admin read vehicle photos"
on storage.objects;

create policy "Admin read vehicle photos"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'vehicle-photos'
  and public.is_admin()
);

drop policy if exists "Admin delete vehicle photos"
on storage.objects;

create policy "Admin delete vehicle photos"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'vehicle-photos'
  and public.is_admin()
);

-- Private intake photos for trade-in opportunities.
-- Supabase no permite crear funciones en el esquema storage: va en "private",
-- que no está expuesto por la API REST.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

create or replace function private.is_declared_trade_vehicle_photo(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.opportunities as opportunity
    cross join lateral pg_catalog.jsonb_each_text(
      case
        when pg_catalog.jsonb_typeof(opportunity.trade_vehicle -> 'photos') = 'object'
          then opportunity.trade_vehicle -> 'photos'
        else '{}'::jsonb
      end
    ) as photo(slot, path)
    where photo.slot = any (
      array['front', 'rear', 'left', 'right', 'interior', 'dashboard']::text[]
    )
      and photo.path = object_name
  );
$$;

revoke all on function private.is_declared_trade_vehicle_photo(text) from public;
grant execute on function private.is_declared_trade_vehicle_photo(text)
  to anon, authenticated;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'trade-vehicle-photos',
  'trade-vehicle-photos',
  false,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 8388608,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "Public upload trade vehicle photos"
on storage.objects;

create policy "Public upload trade vehicle photos"
on storage.objects
for insert
to anon, authenticated
with check (
  bucket_id = 'trade-vehicle-photos'
  and array_length(storage.foldername(name), 1) = 2
  and (storage.foldername(name))[1] = 'inbox'
  and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and storage.filename(name) ~* '^(front|rear|left|right|interior|dashboard)-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}[.](jpg|png|webp)$'
  and private.is_declared_trade_vehicle_photo(name)
);

drop policy if exists "Admin read trade vehicle photos"
on storage.objects;

create policy "Admin read trade vehicle photos"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'trade-vehicle-photos'
  and public.is_admin()
);
