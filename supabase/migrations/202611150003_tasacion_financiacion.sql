-- Tasación estimada (agregado de comparables, sin exponerlos), notas para el cliente en el
-- seguimiento y solicitudes de financiación con DNI (CreditCar).
begin;

-- Estadística de mercado para una tasación: solo números agregados, nunca los comparables.
-- Toma comparables de la misma marca y modelo, año ±1, de los últimos 180 días.
create or replace function public.estimar_mercado(p_marca text, p_modelo text, p_anio integer)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'moneda', currency, 'n', n,
    'mediana', case when n >= 3 then mediana end,
    'p25', case when n >= 3 then p25 end,
    'p75', case when n >= 3 then p75 end
  )), '[]'::jsonb)
  from (
    select currency, count(*)::int as n,
      round(percentile_cont(0.5) within group (order by published_price))::numeric as mediana,
      round(percentile_cont(0.25) within group (order by published_price))::numeric as p25,
      round(percentile_cont(0.75) within group (order by published_price))::numeric as p75
    from public.comparables
    where published_price > 0
      and lower(btrim(brand)) = lower(btrim(p_marca))
      and lower(btrim(model)) = lower(btrim(p_modelo))
      and year between p_anio - 1 and p_anio + 1
      and observed_at > now() - interval '180 days'
    group by currency
  ) s
  where char_length(p_marca) between 1 and 60 and char_length(p_modelo) between 1 and 80;
$$;
revoke all on function public.estimar_mercado(text, text, integer) from public;
grant execute on function public.estimar_mercado(text, text, integer) to anon, authenticated;

-- Seguimiento: las notas que el taller marca para el cliente (historial tipo "nota").
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
    ), '[]'::jsonb),
    'notas', coalesce((
      select jsonb_agg(jsonb_build_object('en', x ->> 'en', 'texto', x ->> 'texto') order by x ->> 'en' desc)
      from jsonb_array_elements(o.historial) x where x ->> 'tipo' = 'nota'
    ), '[]'::jsonb)
  );
$$;
revoke all on function private.avance_orden(public.ordenes) from public;

-- ---------- Financiación con DNI ----------
create table if not exists public.financiaciones (
  id uuid primary key default gen_random_uuid(),
  creado timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  dni text not null check (dni ~ '^[0-9]{7,8}$'),
  nombre text not null check (char_length(nombre) between 2 and 120),
  whatsapp text not null check (whatsapp ~ '^[0-9]{8,15}$'),
  vehicle_id uuid references public.vehicles(id) on delete set null,
  vehiculo text not null check (char_length(vehiculo) between 2 and 160),
  anio integer not null check (anio between 2011 and 2100),
  precio numeric(15, 2) not null check (precio > 0),
  monto numeric(15, 2) not null check (monto > 0),
  plazo integer not null check (plazo between 6 and 36),
  cuota_estimada numeric(15, 2),
  origen text not null default 'financiacion' check (origen in ('financiacion', 'tasacion')),
  estado text not null default 'nueva'
    check (estado in ('nueva', 'cargada', 'aprobada', 'rechazada', 'vendida', 'desistio')),
  notas text check (char_length(notas) <= 4000),
  visto boolean not null default false,
  consentimiento timestamptz not null
);

create index if not exists financiaciones_estado_idx on public.financiaciones (estado, creado desc);

drop trigger if exists financiaciones_touch on public.financiaciones;
create trigger financiaciones_touch before update on public.financiaciones
for each row execute function private.touch_updated_at();

alter table public.financiaciones enable row level security;
revoke all on public.financiaciones from anon, public;
grant select, update, delete on public.financiaciones to authenticated;

drop policy if exists "admin manage financiaciones" on public.financiaciones;
create policy "admin manage financiaciones" on public.financiaciones for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create or replace function public.pedir_financiacion(p jsonb)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_dni text := regexp_replace(coalesce(p ->> 'dni', ''), '[^0-9]', '', 'g');
  v_whatsapp text := regexp_replace(coalesce(p ->> 'whatsapp', ''), '[^0-9]', '', 'g');
  v_id uuid;
begin
  if coalesce((p ->> 'consiento')::boolean, false) is not true then
    raise exception 'Necesitamos tu autorización para gestionar la financiación.' using errcode = 'P0001';
  end if;
  if (select count(*) from public.financiaciones where dni = v_dni and creado > now() - interval '1 day') >= 3 then
    raise exception 'Ya recibimos solicitudes con ese DNI. Te contactamos a la brevedad.' using errcode = 'P0001';
  end if;
  insert into public.financiaciones (dni, nombre, whatsapp, vehicle_id, vehiculo, anio, precio, monto, plazo, cuota_estimada, origen, consentimiento)
  values (
    v_dni, btrim(p ->> 'nombre'), v_whatsapp,
    nullif(p ->> 'vehicle_id', '')::uuid, btrim(p ->> 'vehiculo'), (p ->> 'anio')::int,
    (p ->> 'precio')::numeric, (p ->> 'monto')::numeric, (p ->> 'plazo')::int,
    nullif(p ->> 'cuota', '')::numeric,
    coalesce(nullif(p ->> 'origen', ''), 'financiacion'),
    now()
  )
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.pedir_financiacion(jsonb) from public;
grant execute on function public.pedir_financiacion(jsonb) to anon, authenticated;

commit;
