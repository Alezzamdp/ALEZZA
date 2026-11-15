-- Mercado hoy (/admin/mercado): una foto por día del dólar y del stock contra el mercado.
-- Antes vivía en un archivo de la PC (LOCALAPPDATA/ALEZZA/mercado). Solo administradores.

create table if not exists public.mercado_historial (
  fecha date primary key,
  datos jsonb not null check (pg_column_size(datos) <= 262144),
  actualizado timestamptz not null default now()
);

alter table public.mercado_historial enable row level security;
alter table public.mercado_historial force row level security;
revoke all on public.mercado_historial from anon, public;
grant select, insert, update, delete on public.mercado_historial to authenticated;

drop policy if exists "mercado admin" on public.mercado_historial;
create policy "mercado admin" on public.mercado_historial
for all to authenticated
using (public.is_admin())
with check (public.is_admin());
