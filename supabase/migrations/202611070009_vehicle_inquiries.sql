begin;

create table if not exists public.vehicle_inquiries (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete restrict,
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

-- Keep this migration safe if an earlier version created the table first.
alter table public.vehicle_inquiries
  add column if not exists next_followup_date date,
  add column if not exists next_followup_note text;

do $$
begin
  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conname = 'vehicle_inquiries_followup_note_length'
      and conrelid = 'public.vehicle_inquiries'::regclass
  ) then
    alter table public.vehicle_inquiries
      add constraint vehicle_inquiries_followup_note_length
      check (next_followup_note is null or length(next_followup_note) <= 500);
  end if;

  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conname = 'vehicle_inquiries_followup_requires_date'
      and conrelid = 'public.vehicle_inquiries'::regclass
  ) then
    alter table public.vehicle_inquiries
      add constraint vehicle_inquiries_followup_requires_date
      check (next_followup_note is null or next_followup_date is not null);
  end if;

  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conname = 'vehicle_inquiries_closed_followup_check'
      and conrelid = 'public.vehicle_inquiries'::regclass
  ) then
    alter table public.vehicle_inquiries
      add constraint vehicle_inquiries_closed_followup_check
      check (
        status not in ('closed', 'discarded')
        or (next_followup_date is null and next_followup_note is null)
      );
  end if;
end;
$$;

create index if not exists idx_vehicle_inquiries_status
  on public.vehicle_inquiries (status, created_at desc);

create index if not exists idx_vehicle_inquiries_vehicle
  on public.vehicle_inquiries (vehicle_id, created_at desc);

create index if not exists idx_vehicle_inquiries_followup
  on public.vehicle_inquiries (next_followup_date, created_at desc)
  where next_followup_date is not null;

alter table public.vehicle_inquiries enable row level security;

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

revoke all on public.vehicle_inquiries from anon, authenticated, public;
grant insert (vehicle_id, customer_name, phone, email, message)
  on public.vehicle_inquiries to anon, authenticated;
grant select on public.vehicle_inquiries to authenticated;
grant update (status, internal_notes, next_followup_date, next_followup_note, updated_at)
  on public.vehicle_inquiries to authenticated;

commit;
