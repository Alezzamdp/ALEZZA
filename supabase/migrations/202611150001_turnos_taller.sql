-- Turnos con seña (público vía funciones) y órdenes de taller (solo admin).
-- El público nunca toca las tablas: pide, consulta e informa el pago con funciones
-- security definer que validan todo. La confirmación por Mercado Pago solo la puede
-- llamar el servidor (service_role) después de leer el pago en la API de Mercado Pago.
begin;

create schema if not exists private;

-- ---------- Configuración pública de turnos ----------
-- Días ISO (1 lunes … 7 domingo), autos por día, seña y datos para transferir.
insert into public.app_settings (key, value)
values ('turnos', jsonb_build_object(
  'dias', jsonb_build_array(1, 2, 3, 4, 5),
  'cupo', 2,
  'sena', 30000,
  'anticipacion', 1,
  'horizonte', 45,
  'alias', '',
  'cbu', '',
  'titular', ''
))
on conflict (key) do nothing;

drop policy if exists "public read public profile" on public.app_settings;
create policy "public read public profile"
on public.app_settings for select to anon, authenticated
using (key in ('public_profile', 'turnos'));

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------- Turnos ----------
create table if not exists public.turnos (
  id uuid primary key default gen_random_uuid(),
  token uuid not null unique default gen_random_uuid(),
  creado timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  fecha date not null,
  servicio text not null check (servicio in ('lavado', 'puesta', 'agencia', 'otro')),
  nombre text not null check (char_length(nombre) between 2 and 120),
  whatsapp text not null check (whatsapp ~ '^[0-9]{8,15}$'),
  patente text not null check (patente ~ '^[A-Z0-9]{5,8}$'),
  vehiculo text not null check (char_length(vehiculo) between 2 and 120),
  direccion text check (char_length(direccion) <= 200),
  notas text check (char_length(notas) <= 1000),
  sena numeric(12, 2) not null check (sena >= 0),
  estado text not null default 'solicitado'
    check (estado in ('solicitado', 'confirmado', 'realizado', 'cancelado')),
  pago_estado text not null default 'pendiente'
    check (pago_estado in ('pendiente', 'informado', 'confirmado', 'rechazado')),
  pago_metodo text check (pago_metodo in ('transferencia', 'mercadopago')),
  comprobante text check (char_length(comprobante) <= 200),
  mp_pago_id text check (char_length(mp_pago_id) <= 40),
  pago_confirmado timestamptz,
  visto boolean not null default false
);

create index if not exists turnos_fecha_idx on public.turnos (fecha);

drop trigger if exists turnos_touch on public.turnos;
create trigger turnos_touch before update on public.turnos
for each row execute function private.touch_updated_at();

-- Sin FORCE: las funciones de arriba corren como dueño de la tabla. El público no tiene permisos directos.
alter table public.turnos enable row level security;
revoke all on public.turnos from anon, public;
grant select, update, delete on public.turnos to authenticated;

drop policy if exists "admin manage turnos" on public.turnos;
create policy "admin manage turnos" on public.turnos for all to authenticated
using (public.is_admin()) with check (public.is_admin());

-- Días con lugar (sin datos de nadie).
create or replace function public.turnos_disponibles()
returns table (fecha date, libres integer)
language sql
stable
security definer
set search_path = ''
as $$
  with c as (
    select value as v from public.app_settings where key = 'turnos'
  ), hoy as (
    select (now() at time zone 'America/Argentina/Buenos_Aires')::date as d
  )
  select g.dia::date, ((c.v ->> 'cupo')::int - count(t.id))::int
  from c
  cross join hoy
  cross join lateral generate_series(hoy.d + (c.v ->> 'anticipacion')::int, hoy.d + (c.v ->> 'horizonte')::int, interval '1 day') as g(dia)
  left join public.turnos t on t.fecha = g.dia::date and t.estado <> 'cancelado'
  where (c.v -> 'dias') @> to_jsonb(extract(isodow from g.dia)::int)
  group by g.dia, c.v
  having (c.v ->> 'cupo')::int - count(t.id) > 0
  order by g.dia;
$$;

create or replace function public.pedir_turno(p jsonb)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_fecha date := (p ->> 'fecha')::date;
  v_whatsapp text := regexp_replace(coalesce(p ->> 'whatsapp', ''), '[^0-9]', '', 'g');
  v_patente text := upper(regexp_replace(coalesce(p ->> 'patente', ''), '[^A-Za-z0-9]', '', 'g'));
  v_cfg jsonb;
  v_token uuid;
begin
  select value into v_cfg from public.app_settings where key = 'turnos';
  -- Un turno a la vez por día: evita pasarse del cupo con dos pedidos simultáneos.
  perform pg_advisory_xact_lock(hashtext('turno:' || v_fecha::text));
  if not exists (select 1 from public.turnos_disponibles() d where d.fecha = v_fecha) then
    raise exception 'Ese día ya no tiene lugar.' using errcode = 'P0001';
  end if;
  if (select count(*) from public.turnos
      where whatsapp = v_whatsapp and estado = 'solicitado' and creado > now() - interval '1 day') >= 3 then
    raise exception 'Ya hay turnos pedidos con ese WhatsApp. Escribinos y lo resolvemos.' using errcode = 'P0001';
  end if;
  insert into public.turnos (fecha, servicio, nombre, whatsapp, patente, vehiculo, direccion, notas, sena)
  values (
    v_fecha,
    p ->> 'servicio',
    btrim(p ->> 'nombre'),
    v_whatsapp,
    v_patente,
    btrim(p ->> 'vehiculo'),
    nullif(btrim(coalesce(p ->> 'direccion', '')), ''),
    nullif(btrim(coalesce(p ->> 'notas', '')), ''),
    coalesce((v_cfg ->> 'sena')::numeric, 0)
  )
  returning token into v_token;
  return v_token;
end;
$$;

-- Lo que ve quien tiene el enlace de su turno.
create or replace function public.turno_publico(p_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', id, 'fecha', fecha, 'servicio', servicio, 'nombre', nombre, 'patente', patente,
    'vehiculo', vehiculo, 'sena', sena, 'estado', estado, 'pago_estado', pago_estado,
    'pago_metodo', pago_metodo
  )
  from public.turnos where token = p_token;
$$;

create or replace function public.informar_pago(p_token uuid, p_comprobante text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if p_comprobante is null or split_part(p_comprobante, '/', 1) <> p_token::text then
    raise exception 'Comprobante inválido.' using errcode = 'P0001';
  end if;
  update public.turnos
  set pago_estado = 'informado', pago_metodo = 'transferencia', comprobante = p_comprobante, visto = false
  where token = p_token and estado <> 'cancelado' and pago_estado in ('pendiente', 'rechazado');
  if not found then
    raise exception 'Este turno no espera un pago.' using errcode = 'P0001';
  end if;
end;
$$;

-- Solo el servidor, después de leer el pago aprobado en la API de Mercado Pago.
create or replace function public.confirmar_pago_mp(p_turno uuid, p_pago text, p_monto numeric)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  update public.turnos
  set pago_estado = 'confirmado', pago_metodo = 'mercadopago', mp_pago_id = p_pago,
      pago_confirmado = coalesce(pago_confirmado, now()),
      estado = case when estado = 'solicitado' then 'confirmado' else estado end,
      visto = false
  where id = p_turno and p_monto >= sena and pago_estado <> 'confirmado';
end;
$$;

revoke all on function public.turnos_disponibles() from public;
revoke all on function public.pedir_turno(jsonb) from public;
revoke all on function public.turno_publico(uuid) from public;
revoke all on function public.informar_pago(uuid, text) from public;
revoke all on function public.confirmar_pago_mp(uuid, text, numeric) from public, anon, authenticated;
grant execute on function public.turnos_disponibles() to anon, authenticated;
grant execute on function public.pedir_turno(jsonb) to anon, authenticated;
grant execute on function public.turno_publico(uuid) to anon, authenticated;
grant execute on function public.informar_pago(uuid, text) to anon, authenticated;
grant execute on function public.confirmar_pago_mp(uuid, text, numeric) to service_role;

-- Comprobantes: carpeta = token del turno, y solo mientras espera el pago.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('turno-comprobantes', 'turno-comprobantes', false, 5242880,
        array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update set public = false, file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

create or replace function private.turno_espera_comprobante(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.turnos
    where token::text = split_part(object_name, '/', 1)
      and estado <> 'cancelado' and pago_estado in ('pendiente', 'rechazado')
  );
$$;
revoke all on function private.turno_espera_comprobante(text) from public;
grant usage on schema private to anon, authenticated;
grant execute on function private.turno_espera_comprobante(text) to anon, authenticated;

drop policy if exists "Public upload turno comprobante" on storage.objects;
create policy "Public upload turno comprobante" on storage.objects for insert to anon, authenticated
with check (
  bucket_id = 'turno-comprobantes'
  and array_length(storage.foldername(name), 1) = 1
  and storage.filename(name) ~* '^comprobante-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}[.](jpg|png|webp|pdf)$'
  and private.turno_espera_comprobante(name)
);

drop policy if exists "Admin read turno comprobante" on storage.objects;
create policy "Admin read turno comprobante" on storage.objects for select to authenticated
using (bucket_id = 'turno-comprobantes' and public.is_admin());

-- ---------- Órdenes de taller ----------
create table if not exists public.ordenes (
  id uuid primary key default gen_random_uuid(),
  numero bigint generated always as identity unique,
  creado timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  turno_id uuid references public.turnos(id) on delete set null,
  estado text not null default 'presupuesto'
    check (estado in ('presupuesto', 'aprobado', 'en_trabajo', 'listo', 'entregado', 'cancelado')),
  cliente_nombre text not null check (char_length(cliente_nombre) between 1 and 120),
  cliente_whatsapp text check (char_length(cliente_whatsapp) <= 30),
  cliente_email text check (char_length(cliente_email) <= 120),
  direccion text check (char_length(direccion) <= 200),
  patente text check (char_length(patente) <= 10),
  marca text check (char_length(marca) <= 60),
  modelo text check (char_length(modelo) <= 80),
  anio integer check (anio between 1950 and 2100),
  km integer check (km between 0 and 3000000),
  color text check (char_length(color) <= 40),
  trabajos jsonb not null default '[]'
    check (jsonb_typeof(trabajos) = 'array' and pg_column_size(trabajos) <= 16384),
  notas text check (char_length(notas) <= 4000),
  fotos_antes text[] not null default '{}' check (cardinality(fotos_antes) <= 40),
  fotos_despues text[] not null default '{}' check (cardinality(fotos_despues) <= 40),
  historial jsonb not null default '[]'
    check (jsonb_typeof(historial) = 'array' and pg_column_size(historial) <= 65536)
);

create index if not exists ordenes_estado_idx on public.ordenes (estado, updated_at desc);

drop trigger if exists ordenes_touch on public.ordenes;
create trigger ordenes_touch before update on public.ordenes
for each row execute function private.touch_updated_at();

alter table public.ordenes enable row level security;
alter table public.ordenes force row level security;
revoke all on public.ordenes from anon, public;
grant select, insert, update, delete on public.ordenes to authenticated;

drop policy if exists "admin manage ordenes" on public.ordenes;
create policy "admin manage ordenes" on public.ordenes for all to authenticated
using (public.is_admin()) with check (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('orden-fotos', 'orden-fotos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = 10485760,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "Admin manage orden fotos" on storage.objects;
create policy "Admin manage orden fotos" on storage.objects for all to authenticated
using (bucket_id = 'orden-fotos' and public.is_admin())
with check (bucket_id = 'orden-fotos' and public.is_admin());

commit;
