create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  brand text not null,
  model text not null,
  version text,
  year integer not null check (year between 1950 and 2100),
  kilometers integer,
  fuel text,
  transmission text,
  price_ars numeric(15,2),
  price_usd numeric(15,2),
  currency text not null default 'ARS',
  status text not null default 'available'
    check (status in ('available','reserved','sold')),
  description text,
  image_urls text[] not null default '{}',
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  customer_name text,
  phone text,
  email text,
  desired_vehicle_id uuid references public.vehicles(id) on delete restrict,
  trade_vehicle jsonb not null,
  customer_notes text,
  internal_notes text,
  estimated_value numeric(15,2) check (estimated_value is null or estimated_value >= 0),
  approved_value numeric(15,2) check (approved_value is null or approved_value >= 0),
  final_offer numeric(15,2) check (final_offer is null or final_offer >= 0),
  valuation_notes text,
  next_followup_date date,
  next_followup_note text,
  status text not null default 'new'
    check (status in (
      'new','analyzed','pending_review','approved','contacted',
      'inspection_scheduled','negotiation','completed','discarded'
    )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Mantiene el esquema compatible con proyectos existentes que ya tenían
-- opportunities creada antes de incorporar la gestión comercial del panel.
alter table public.opportunities
  add column if not exists internal_notes text,
  add column if not exists estimated_value numeric(15,2),
  add column if not exists approved_value numeric(15,2),
  add column if not exists final_offer numeric(15,2),
  add column if not exists valuation_notes text,
  add column if not exists next_followup_date date,
  add column if not exists next_followup_note text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'opportunities_closed_followup_check'
      and conrelid = 'public.opportunities'::regclass
  ) then
    alter table public.opportunities
      add constraint opportunities_closed_followup_check
      check (
        status not in ('completed', 'discarded')
        or (next_followup_date is null and next_followup_note is null)
      ) not valid;
  end if;
end;
$$;

create table if not exists public.opportunity_followups (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  type text not null default 'note',
  content text not null,
  created_at timestamptz not null default now(),
  constraint opportunity_followups_type_length check (length(type) between 1 and 40),
  constraint opportunity_followups_content_length check (length(content) between 1 and 5000)
);

create table if not exists public.appraisals (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  market_value_min numeric(15,2),
  market_value_max numeric(15,2),
  estimated_take_value numeric(15,2),
  approved_take_value numeric(15,2),
  currency text not null default 'ARS',
  confidence text,
  explanation text,
  ai_analysis jsonb,
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.comparables (
  id uuid primary key default gen_random_uuid(),
  appraisal_id uuid references public.appraisals(id) on delete cascade,
  brand text not null,
  model text not null,
  version text,
  year integer,
  kilometers integer,
  location text,
  listing_url text,
  source text,
  published_price numeric(15,2),
  currency text not null default 'ARS',
  published_at date,
  observed_at timestamptz not null default now(),
  listing_status text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  changes jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.vehicle_inquiries (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete restrict,
  opportunity_id uuid references public.opportunities(id) on delete restrict,
  customer_name text not null,
  phone text,
  email text,
  message text not null default '',
  internal_notes text,
  next_followup_date date,
  next_followup_note text,
  status text not null default 'new'
    check (status in ('new', 'contacted', 'closed', 'discarded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vehicle_inquiries_customer_name_length
    check (length(btrim(customer_name)) between 1 and 120),
  constraint vehicle_inquiries_phone_length
    check (phone is null or length(phone) <= 40),
  constraint vehicle_inquiries_email_length
    check (email is null or length(email) <= 254),
  constraint vehicle_inquiries_contact_required
    check (
      length(btrim(coalesce(phone, ''))) > 0
      or length(btrim(coalesce(email, ''))) > 0
    ),
  constraint vehicle_inquiries_message_length
    check (length(message) <= 1000),
  constraint vehicle_inquiries_internal_notes_length
    check (internal_notes is null or length(internal_notes) <= 5000),
  constraint vehicle_inquiries_followup_note_length
    check (next_followup_note is null or length(next_followup_note) <= 500),
  constraint vehicle_inquiries_followup_requires_date
    check (next_followup_note is null or next_followup_date is not null),
  constraint vehicle_inquiries_closed_followup_check
    check (
      status not in ('closed', 'discarded')
      or (next_followup_date is null and next_followup_note is null)
    )
);

create index if not exists idx_vehicles_catalog
  on public.vehicles (is_published, status);

create index if not exists idx_opportunities_status
  on public.opportunities (status, created_at desc);

create index if not exists idx_vehicle_inquiries_status
  on public.vehicle_inquiries (status, created_at desc);

create index if not exists idx_vehicle_inquiries_vehicle
  on public.vehicle_inquiries (vehicle_id, created_at desc);

create index if not exists idx_vehicle_inquiries_followup
  on public.vehicle_inquiries (next_followup_date, created_at desc)
  where next_followup_date is not null;

create unique index if not exists idx_vehicle_inquiries_opportunity
  on public.vehicle_inquiries (opportunity_id)
  where opportunity_id is not null;

create index if not exists idx_opportunity_followups_timeline
  on public.opportunity_followups (opportunity_id, created_at desc);

create index if not exists idx_appraisals_opportunity
  on public.appraisals (opportunity_id, created_at desc);

create index if not exists idx_comparables_vehicle
  on public.comparables (brand, model, year, observed_at desc);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

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

alter table public.admin_users enable row level security;
alter table public.vehicles enable row level security;
alter table public.opportunities enable row level security;
alter table public.opportunity_followups enable row level security;
alter table public.appraisals enable row level security;
alter table public.comparables enable row level security;
alter table public.audit_logs enable row level security;
alter table public.app_settings enable row level security;
alter table public.vehicle_inquiries enable row level security;

drop policy if exists "admin read own record" on public.admin_users;
create policy "admin read own record"
on public.admin_users for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "public read published vehicles" on public.vehicles;
create policy "public read published vehicles"
on public.vehicles for select to anon, authenticated
using (is_published = true and status in ('available','reserved'));

drop policy if exists "admin manage vehicles" on public.vehicles;
create policy "admin manage vehicles"
on public.vehicles for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "public create opportunities" on public.opportunities;
create policy "public create opportunities"
on public.opportunities for insert to anon, authenticated
with check (
  status = 'new'
  and internal_notes is null
  and estimated_value is null
  and approved_value is null
  and final_offer is null
  and valuation_notes is null
  and next_followup_date is null
  and next_followup_note is null
  and (
    desired_vehicle_id is null
    or exists (
      select 1
      from public.vehicles as v
      where v.id = desired_vehicle_id
        and v.is_published = true
        and v.status in ('available', 'reserved')
    )
  )
  and length(coalesce(customer_name,'')) <= 120
  and length(coalesce(phone,'')) <= 40
  and length(coalesce(email,'')) <= 254
  and (
    length(trim(coalesce(phone, ''))) > 0
    or length(trim(coalesce(email, ''))) > 0
  )
);

drop policy if exists "public create vehicle inquiries"
on public.vehicle_inquiries;
create policy "public create vehicle inquiries"
on public.vehicle_inquiries for insert to anon, authenticated
with check (
  status = 'new'
  and internal_notes is null
  and next_followup_date is null
  and next_followup_note is null
  and exists (
    select 1
    from public.vehicles as vehicle
    where vehicle.id = vehicle_id
      and vehicle.is_published = true
      and vehicle.status in ('available', 'reserved')
  )
);

drop policy if exists "admin read vehicle inquiries"
on public.vehicle_inquiries;
create policy "admin read vehicle inquiries"
on public.vehicle_inquiries for select to authenticated
using (public.is_admin());

drop policy if exists "admin update vehicle inquiries"
on public.vehicle_inquiries;
create policy "admin update vehicle inquiries"
on public.vehicle_inquiries for update to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "admin manage opportunities" on public.opportunities;
drop policy if exists "admin read opportunities" on public.opportunities;
create policy "admin read opportunities"
on public.opportunities for select to authenticated
using (public.is_admin());

drop policy if exists "admin update opportunities" on public.opportunities;
create policy "admin update opportunities"
on public.opportunities for update to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "admin manage opportunity followups"
on public.opportunity_followups;
drop policy if exists "admin read opportunity followups"
on public.opportunity_followups;
create policy "admin read opportunity followups"
on public.opportunity_followups for select to authenticated
using (public.is_admin());

drop policy if exists "admin insert opportunity followups"
on public.opportunity_followups;
create policy "admin insert opportunity followups"
on public.opportunity_followups for insert to authenticated
with check (
  public.is_admin()
  and actor_user_id = (select auth.uid())
);

drop policy if exists "admin manage appraisals" on public.appraisals;
drop policy if exists "admin read appraisals" on public.appraisals;
create policy "admin read appraisals"
on public.appraisals for select to authenticated
using (public.is_admin());

drop policy if exists "admin insert appraisals" on public.appraisals;
create policy "admin insert appraisals"
on public.appraisals for insert to authenticated
with check (
  public.is_admin()
  and (approved_by is null or approved_by = (select auth.uid()))
);

drop policy if exists "admin manage comparables" on public.comparables;
create policy "admin manage comparables"
on public.comparables for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "admin manage audit logs" on public.audit_logs;
drop policy if exists "admin read audit logs" on public.audit_logs;
create policy "admin read audit logs"
on public.audit_logs for select to authenticated
using (public.is_admin());

drop policy if exists "admin insert audit logs" on public.audit_logs;
create policy "admin insert audit logs"
on public.audit_logs for insert to authenticated
with check (
  public.is_admin()
  and actor_user_id = (select auth.uid())
);

drop policy if exists "admin manage settings" on public.app_settings;
create policy "admin manage settings"
on public.app_settings for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "public read public profile" on public.app_settings;
create policy "public read public profile"
on public.app_settings for select to anon, authenticated
using (key = 'public_profile');

grant select on public.vehicles to anon, authenticated;
grant select on public.app_settings to anon;
grant select, insert, update, delete on
  public.admin_users,
  public.vehicles,
  public.comparables,
  public.app_settings
to authenticated;

revoke all on public.opportunities from anon, authenticated, public;
grant insert on public.opportunities to anon, authenticated;
grant select, update on public.opportunities to authenticated;

revoke all on public.vehicle_inquiries from anon, authenticated, public;
grant insert (vehicle_id, customer_name, phone, email, message)
  on public.vehicle_inquiries to anon, authenticated;
grant select on public.vehicle_inquiries to authenticated;
grant update (status, internal_notes, next_followup_date, next_followup_note, updated_at)
  on public.vehicle_inquiries to authenticated;

revoke all on function public.convert_vehicle_inquiry_to_opportunity(uuid)
  from public, anon;
grant execute on function public.convert_vehicle_inquiry_to_opportunity(uuid)
  to authenticated;

revoke all on public.audit_logs from anon, authenticated, public;
grant select, insert on public.audit_logs to authenticated;

revoke all on public.opportunity_followups from anon, authenticated, public;
grant select, insert on public.opportunity_followups to authenticated;

revoke all on public.appraisals from anon, authenticated, public;
grant select, insert on public.appraisals to authenticated;
