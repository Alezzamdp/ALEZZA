begin;

alter table public.vehicle_inquiries
  add column if not exists opportunity_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conname = 'vehicle_inquiries_opportunity_id_fkey'
      and conrelid = 'public.vehicle_inquiries'::regclass
  ) then
    alter table public.vehicle_inquiries
      add constraint vehicle_inquiries_opportunity_id_fkey
      foreign key (opportunity_id)
      references public.opportunities(id)
      on delete restrict;
  end if;
end;
$$;

create unique index if not exists idx_vehicle_inquiries_opportunity
  on public.vehicle_inquiries (opportunity_id)
  where opportunity_id is not null;

create or replace function public.convert_vehicle_inquiry_to_opportunity(
  p_inquiry_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_inquiry public.vehicle_inquiries%rowtype;
  v_opportunity_id uuid;
  v_actor_id uuid := auth.uid();
  v_initial_note text;
begin
  if v_actor_id is null or not public.is_admin() then
    raise exception 'Solo un administrador puede convertir consultas.'
      using errcode = '42501';
  end if;

  select *
  into v_inquiry
  from public.vehicle_inquiries
  where id = p_inquiry_id
  for update;

  if not found then
    raise exception 'No existe la consulta indicada.'
      using errcode = 'P0002';
  end if;

  if v_inquiry.opportunity_id is not null then
    return v_inquiry.opportunity_id;
  end if;

  if v_inquiry.status in ('closed', 'discarded') then
    raise exception 'No se puede convertir una consulta cerrada.'
      using errcode = '22023';
  end if;

  v_initial_note := 'Consulta inicial por vehículo del catálogo.';
  if length(btrim(v_inquiry.message)) > 0 then
    v_initial_note := v_initial_note || E'\n\nMensaje del comprador: ' || btrim(v_inquiry.message);
  end if;

  insert into public.opportunities (
    customer_name,
    phone,
    email,
    desired_vehicle_id,
    trade_vehicle,
    customer_notes,
    status
  ) values (
    v_inquiry.customer_name,
    v_inquiry.phone,
    v_inquiry.email,
    v_inquiry.vehicle_id,
    '{}'::jsonb,
    nullif(btrim(v_inquiry.message), ''),
    'new'
  )
  returning id into v_opportunity_id;

  insert into public.opportunity_followups (
    opportunity_id,
    actor_user_id,
    type,
    content
  ) values (
    v_opportunity_id,
    v_actor_id,
    'conversion',
    v_initial_note
  );

  insert into public.audit_logs (
    actor_user_id,
    action,
    entity_type,
    entity_id,
    changes
  ) values (
    v_actor_id,
    'vehicle_inquiry_converted',
    'opportunity',
    v_opportunity_id,
    jsonb_build_object('source_vehicle_inquiry_id', v_inquiry.id)
  );

  update public.vehicle_inquiries
  set opportunity_id = v_opportunity_id,
      status = 'contacted',
      updated_at = now()
  where id = v_inquiry.id;

  return v_opportunity_id;
end;
$$;

revoke all on function public.convert_vehicle_inquiry_to_opportunity(uuid)
  from public, anon, authenticated;
grant execute on function public.convert_vehicle_inquiry_to_opportunity(uuid)
  to authenticated;

commit;
