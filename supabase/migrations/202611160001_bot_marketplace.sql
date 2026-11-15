-- Bot de Marketplace (extensión de Messenger) en Supabase, para poder publicar la web.
-- Antes vivía en archivos de la PC (LOCALAPPDATA/ALEZZA/bot).
-- Administradores: todo por RLS (public.is_admin()).
-- La extensión NO tiene sesión: entra solo por funciones security definer que verifican
-- la clave del bot contra su hash (sha256). Nunca ve otras tablas ni datos de otros módulos.

create extension if not exists pgcrypto with schema extensions;

-- ---------- Tablas ----------
create table if not exists public.bot_config (
  id smallint primary key default 1 check (id = 1),
  negocio text not null default '' check (char_length(negocio) <= 8000),
  estilo text not null default '' check (char_length(estilo) <= 8000),
  clave_hash text check (clave_hash ~ '^[a-f0-9]{64}$'),
  actualizado timestamptz
);
insert into public.bot_config (id) values (1) on conflict do nothing;

create table if not exists public.bot_actividad (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  cliente text not null default '' check (char_length(cliente) <= 120),
  publicacion text not null default '' check (char_length(publicacion) <= 200),
  mensaje text not null default '' check (char_length(mensaje) <= 2000),
  entendido text not null default '' check (char_length(entendido) <= 500),
  respuesta text not null default '' check (char_length(respuesta) <= 4000)
);
create index if not exists bot_actividad_at_idx on public.bot_actividad (at desc);

create table if not exists public.bot_fichas (
  id text primary key check (id ~ '^[0-9]{1,30}$'),
  cliente text not null default '' check (char_length(cliente) <= 120),
  publicacion text not null default '' check (char_length(publicacion) <= 200),
  etapa text not null default 'consulta' check (char_length(etapa) <= 40),
  pide text not null default '' check (char_length(pide) <= 500),
  proximo_paso text not null default '' check (char_length(proximo_paso) <= 300),
  permuta text not null default '' check (char_length(permuta) <= 120),
  financiacion boolean not null default false,
  pendientes text[] not null default '{}',
  hechos text[] not null default '{}',
  fotos_info jsonb not null default '{}'::jsonb check (pg_column_size(fotos_info) <= 32768),
  actualizado timestamptz not null default now()
);
create index if not exists bot_fichas_actualizado_idx on public.bot_fichas (actualizado desc);

-- Fotos que manda el cliente (auto, DNI, recibo): privadas, solo administradores.
create table if not exists public.bot_fotos (
  conv text not null references public.bot_fichas (id) on delete cascade,
  nombre text not null check (nombre ~ '^[a-f0-9]{24}\.(jpg|png|webp)$'),
  tipo text not null check (tipo in ('image/jpeg', 'image/png', 'image/webp')),
  datos bytea not null check (octet_length(datos) between 1 and 5242880),
  creado timestamptz not null default now(),
  primary key (conv, nombre)
);

-- ---------- RLS: solo administradores ----------
do $$
declare t text;
begin
  foreach t in array array['bot_config', 'bot_actividad', 'bot_fichas', 'bot_fotos'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('revoke all on public.%I from anon, public', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('drop policy if exists "bot admin" on public.%I', t);
    execute format('create policy "bot admin" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

-- ---------- Acceso de la extensión (con la clave del bot) ----------
create or replace function private.bot_ok(p_clave text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.bot_config
    where clave_hash is not null
      and char_length(coalesce(p_clave, '')) between 10 and 100
      and clave_hash = encode(extensions.digest(p_clave, 'sha256'), 'hex')
  );
$$;
revoke all on function private.bot_ok(text) from public;

-- Lo que sabe el bot (el stock lo lee aparte, es público).
create or replace function public.bot_leer_config(p_clave text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.bot_ok(p_clave) then raise exception 'clave del bot inválida' using errcode = '28000'; end if;
  return (select jsonb_build_object('negocio', negocio, 'estilo', estilo) from public.bot_config where id = 1);
end;
$$;

create or replace function public.bot_registrar(p_clave text, p jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.bot_ok(p_clave) then raise exception 'clave del bot inválida' using errcode = '28000'; end if;
  insert into public.bot_actividad (cliente, publicacion, mensaje, entendido, respuesta)
  values (left(coalesce(p->>'cliente', ''), 120), left(coalesce(p->>'publicacion', ''), 200),
          left(coalesce(p->>'mensaje', ''), 2000), left(coalesce(p->>'entendido', ''), 500),
          left(coalesce(p->>'respuesta', ''), 4000));
  -- Se guardan las últimas 5000.
  delete from public.bot_actividad where id <= (select max(id) - 5000 from public.bot_actividad);
end;
$$;

-- Pendientes válidos del checklist (igual que PENDIENTES en src/lib/bot-store.ts).
create or replace function private.bot_pendientes_validos(p text[])
returns text[]
language sql
immutable
set search_path = ''
as $$
  select coalesce(array_agg(distinct x), '{}') from unnest(coalesce(p, '{}')) x
  where x in ('pedir DNI', 'recibir fotos del auto', 'tasar permuta', 'recibir recibo de sueldo',
              'precalificar financiación', 'coordinar visita', 'cerrar operación');
$$;

create or replace function public.bot_guardar_ficha(p_clave text, p jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id text := p->>'id';
  v_pend text[] := private.bot_pendientes_validos(
    (select array_agg(value) from jsonb_array_elements_text(case when jsonb_typeof(p->'pendientes') = 'array' then p->'pendientes' else '[]'::jsonb end)));
begin
  if not private.bot_ok(p_clave) then raise exception 'clave del bot inválida' using errcode = '28000'; end if;
  if v_id is null or v_id !~ '^[0-9]{1,30}$' then raise exception 'chat inválido'; end if;

  insert into public.bot_fichas as f (id, cliente, publicacion, etapa, pide, proximo_paso, permuta, financiacion, pendientes)
  values (v_id, left(coalesce(p->>'cliente', ''), 120), left(coalesce(p->>'publicacion', ''), 200),
          coalesce(nullif(left(p->>'etapa', 40), ''), 'consulta'), left(coalesce(p->>'pide', ''), 500),
          left(coalesce(p->>'proximoPaso', ''), 300), left(coalesce(p->>'permuta', ''), 120),
          coalesce((p->>'financiacion')::boolean, false), v_pend)
  on conflict (id) do update set
    cliente = coalesce(nullif(excluded.cliente, ''), f.cliente),
    publicacion = coalesce(nullif(excluded.publicacion, ''), f.publicacion),
    etapa = excluded.etapa,
    pide = excluded.pide,
    proximo_paso = excluded.proximo_paso,
    permuta = coalesce(nullif(excluded.permuta, ''), f.permuta),
    financiacion = f.financiacion or excluded.financiacion,
    -- Se suman los pendientes nuevos; lo que tildaste queda tildado.
    pendientes = private.bot_pendientes_validos(f.pendientes || excluded.pendientes),
    actualizado = now();
end;
$$;

create or replace function public.bot_guardar_foto(p_clave text, p_conv text, p_nombre text, p_tipo text, p_datos text, p_info jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tipo_foto text := coalesce(p_info->>'tipo', '');
  v_tarea text := case v_tipo_foto when 'auto' then 'recibir fotos del auto' when 'dni' then 'pedir DNI'
                                   when 'recibo' then 'recibir recibo de sueldo' end;
begin
  if not private.bot_ok(p_clave) then raise exception 'clave del bot inválida' using errcode = '28000'; end if;
  if p_conv !~ '^[0-9]{1,30}$' then raise exception 'chat inválido'; end if;

  insert into public.bot_fichas (id) values (p_conv) on conflict do nothing;
  insert into public.bot_fotos (conv, nombre, tipo, datos)
  values (p_conv, p_nombre, p_tipo, decode(p_datos, 'base64'))
  on conflict do nothing;

  update public.bot_fichas set
    fotos_info = case when v_tipo_foto in ('auto', 'dni', 'recibo', 'papeles', 'otro')
      then fotos_info || jsonb_build_object(p_nombre, jsonb_build_object('tipo', v_tipo_foto, 'desc', left(coalesce(p_info->>'desc', ''), 300)))
      else fotos_info end,
    -- Según lo que vio la IA, se tilda solo el pendiente que corresponde.
    pendientes = case when v_tarea is null then pendientes else private.bot_pendientes_validos(pendientes || array[v_tarea]) end,
    hechos = case when v_tarea is null then hechos else private.bot_pendientes_validos(hechos || array[v_tarea]) end,
    actualizado = now()
  where id = p_conv;
end;
$$;

revoke all on function public.bot_leer_config(text) from public;
revoke all on function public.bot_registrar(text, jsonb) from public;
revoke all on function public.bot_guardar_ficha(text, jsonb) from public;
revoke all on function public.bot_guardar_foto(text, text, text, text, text, jsonb) from public;
grant execute on function public.bot_leer_config(text) to anon, authenticated;
grant execute on function public.bot_registrar(text, jsonb) to anon, authenticated;
grant execute on function public.bot_guardar_ficha(text, jsonb) to anon, authenticated;
grant execute on function public.bot_guardar_foto(text, text, text, text, text, jsonb) to anon, authenticated;
