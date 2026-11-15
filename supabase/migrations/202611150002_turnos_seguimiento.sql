-- Turnos v2: seña como % del precio del servicio, servicios a elección ("otro"),
-- seguimiento público de la orden (checklist en vivo) y catálogo de trabajos antes/después.
begin;

-- Precios por servicio (0 = a cotizar) y porcentaje de seña. Lo ya configurado se respeta.
update public.app_settings
set value = jsonb_build_object(
  'porcentaje_sena', 50,
  'precios', jsonb_build_object(
    'lavado', 100000, 'puesta', 250000, 'agencia', 0,
    'interiores', 0, 'motor', 0, 'butacas', 0, 'pulido2', 0, 'pulido1', 0
  )
) || value
where key = 'turnos';

alter table public.turnos
  add column if not exists extras text[] not null default '{}'
    check (extras <@ array['interiores', 'motor', 'butacas', 'pulido2', 'pulido1']::text[]),
  add column if not exists precio numeric(12, 2) check (precio >= 0);

alter table public.ordenes
  add column if not exists token uuid not null unique default gen_random_uuid(),
  add column if not exists publicar boolean not null default false,
  add column if not exists titulo_publico text check (char_length(titulo_publico) <= 120);

-- Precio del pedido: suma de lo elegido; si algo no tiene precio, queda a cotizar (null).
create or replace function private.precio_turno(p_cfg jsonb, p_servicio text, p_extras text[])
returns numeric
language sql
immutable
set search_path = ''
as $$
  select case when bool_and(coalesce((p_cfg -> 'precios' ->> k)::numeric, 0) > 0)
              then sum((p_cfg -> 'precios' ->> k)::numeric) end
  from unnest(case when p_servicio = 'otro' then p_extras else array[p_servicio] end) as k;
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
  v_servicio text := p ->> 'servicio';
  v_extras text[] := coalesce(array(select distinct jsonb_array_elements_text(coalesce(p -> 'extras', '[]'::jsonb))), '{}');
  v_whatsapp text := regexp_replace(coalesce(p ->> 'whatsapp', ''), '[^0-9]', '', 'g');
  v_patente text := upper(regexp_replace(coalesce(p ->> 'patente', ''), '[^A-Za-z0-9]', '', 'g'));
  v_cfg jsonb;
  v_precio numeric;
  v_token uuid;
begin
  select value into v_cfg from public.app_settings where key = 'turnos';
  if v_servicio = 'otro' and cardinality(v_extras) = 0 then
    raise exception 'Elegí al menos un servicio.' using errcode = 'P0001';
  end if;
  if v_servicio <> 'otro' then v_extras := '{}'; end if;
  perform pg_advisory_xact_lock(hashtext('turno:' || v_fecha::text));
  if not exists (select 1 from public.turnos_disponibles() d where d.fecha = v_fecha) then
    raise exception 'Ese día ya no tiene lugar.' using errcode = 'P0001';
  end if;
  if (select count(*) from public.turnos
      where whatsapp = v_whatsapp and estado = 'solicitado' and creado > now() - interval '1 day') >= 3 then
    raise exception 'Ya hay turnos pedidos con ese WhatsApp. Escribinos y lo resolvemos.' using errcode = 'P0001';
  end if;
  v_precio := private.precio_turno(v_cfg, v_servicio, v_extras);
  insert into public.turnos (fecha, servicio, extras, nombre, whatsapp, patente, vehiculo, direccion, notas, precio, sena)
  values (
    v_fecha, v_servicio, v_extras, btrim(p ->> 'nombre'), v_whatsapp, v_patente, btrim(p ->> 'vehiculo'),
    nullif(btrim(coalesce(p ->> 'direccion', '')), ''),
    nullif(btrim(coalesce(p ->> 'notas', '')), ''),
    v_precio,
    -- Seña: porcentaje del precio; si está a cotizar, el monto fijo de respaldo.
    case when v_precio is null then coalesce((v_cfg ->> 'sena')::numeric, 0)
         else round(v_precio * coalesce((v_cfg ->> 'porcentaje_sena')::numeric, 50) / 100) end
  )
  returning token into v_token;
  return v_token;
end;
$$;

-- Avance de una orden para el cliente (sin precios ni datos internos).
create or replace function private.avance_orden(o public.ordenes)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'numero', o.numero, 'estado', o.estado, 'updated_at', o.updated_at,
    'vehiculo', nullif(btrim(concat_ws(' ', o.marca, o.modelo)), ''), 'patente', o.patente,
    'nombre', split_part(o.cliente_nombre, ' ', 1),
    'trabajos', coalesce((
      select jsonb_agg(jsonb_build_object('t', x ->> 't', 'hecho', coalesce((x ->> 'hecho')::boolean, false)))
      from jsonb_array_elements(o.trabajos) x where btrim(coalesce(x ->> 't', '')) <> ''
    ), '[]'::jsonb)
  );
$$;

create or replace function public.turno_publico(p_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', t.id, 'fecha', t.fecha, 'servicio', t.servicio, 'extras', t.extras, 'nombre', t.nombre,
    'patente', t.patente, 'vehiculo', t.vehiculo, 'precio', t.precio, 'sena', t.sena, 'estado', t.estado,
    'pago_estado', t.pago_estado, 'pago_metodo', t.pago_metodo,
    'orden', (select private.avance_orden(o) from public.ordenes o
              where o.turno_id = t.id and o.estado <> 'cancelado' order by o.creado desc limit 1)
  )
  from public.turnos t where t.token = p_token;
$$;

create or replace function public.orden_publica(p_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select private.avance_orden(o) from public.ordenes o where o.token = p_token and o.estado <> 'cancelado';
$$;

-- Catálogo de trabajos (solo los marcados para publicar; sin patente ni datos del cliente).
create or replace function public.trabajos_publicos()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(x order by x ->> 'en' desc), '[]'::jsonb) from (
    select jsonb_build_object(
      'id', o.id, 'en', o.updated_at,
      'titulo', coalesce(nullif(btrim(o.titulo_publico), ''), nullif(btrim(concat_ws(' ', o.marca, o.modelo)), ''), 'Trabajo ALEZZA'),
      'trabajos', coalesce((select jsonb_agg(x ->> 't') from jsonb_array_elements(o.trabajos) x where btrim(coalesce(x ->> 't', '')) <> ''), '[]'::jsonb),
      'antes', to_jsonb(o.fotos_antes), 'despues', to_jsonb(o.fotos_despues)
    ) as x
    from public.ordenes o
    where o.publicar and cardinality(o.fotos_antes) > 0 and cardinality(o.fotos_despues) > 0
    order by o.updated_at desc
    limit 24
  ) s;
$$;

create or replace function private.foto_publica(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.ordenes
    where id::text = split_part(object_name, '/', 1) and publicar
      and (object_name = any (fotos_antes) or object_name = any (fotos_despues))
  );
$$;

revoke all on function private.precio_turno(jsonb, text, text[]) from public;
revoke all on function private.avance_orden(public.ordenes) from public;
revoke all on function private.foto_publica(text) from public;
grant execute on function private.foto_publica(text) to anon, authenticated;
revoke all on function public.orden_publica(uuid) from public;
revoke all on function public.trabajos_publicos() from public;
grant execute on function public.orden_publica(uuid) to anon, authenticated;
grant execute on function public.trabajos_publicos() to anon, authenticated;

-- Fotos de trabajos publicados: se pueden ver (con URL firmada) sin sesión.
drop policy if exists "Public read published orden fotos" on storage.objects;
create policy "Public read published orden fotos" on storage.objects for select to anon, authenticated
using (bucket_id = 'orden-fotos' and private.foto_publica(name));

commit;
