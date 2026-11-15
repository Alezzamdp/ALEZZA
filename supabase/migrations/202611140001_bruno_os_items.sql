-- BRUNO OS: agenda, tareas, ideas y notas en Supabase.
-- Solo administradores, y cada uno ve únicamente lo suyo.

create table if not exists public.bruno_items (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null check (id ~ '^[a-z0-9]{6,40}$'),
  tipo text not null check (tipo ~ '^[a-z]{1,20}$'),
  titulo text not null default '' check (char_length(titulo) <= 500),
  fecha date,
  hora text check (hora ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  area text check (char_length(area) <= 40),
  estado text not null default 'pendiente' check (estado in ('pendiente', 'hecha')),
  prioridad boolean not null default false,
  hecho timestamptz,
  creado timestamptz not null default now(),
  -- Campos de versiones anteriores (p. ej. movimientos de plata) para no perder nada al restaurar.
  extra jsonb not null default '{}'::jsonb check (pg_column_size(extra) <= 8192),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists bruno_items_user_fecha_idx on public.bruno_items (user_id, fecha);

create or replace function public.bruno_items_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists bruno_items_touch on public.bruno_items;
create trigger bruno_items_touch
before update on public.bruno_items
for each row execute function public.bruno_items_touch();

alter table public.bruno_items enable row level security;
alter table public.bruno_items force row level security;

revoke all on public.bruno_items from anon, public;
grant select, insert, update, delete on public.bruno_items to authenticated;

drop policy if exists "bruno owner admin" on public.bruno_items;
create policy "bruno owner admin"
on public.bruno_items
for all
to authenticated
using (user_id = (select auth.uid()) and public.is_admin())
with check (user_id = (select auth.uid()) and public.is_admin());
