begin;

alter table public.opportunities
  add column if not exists internal_notes text,
  add column if not exists estimated_value numeric(15,2),
  add column if not exists approved_value numeric(15,2),
  add column if not exists final_offer numeric(15,2),
  add column if not exists valuation_notes text;

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

create index if not exists idx_opportunity_followups_timeline
  on public.opportunity_followups (opportunity_id, created_at desc);

alter table public.opportunity_followups enable row level security;

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
  and length(coalesce(customer_name,'')) <= 120
  and length(coalesce(phone,'')) <= 40
  and length(coalesce(email,'')) <= 254
);

drop policy if exists "admin manage opportunity followups"
on public.opportunity_followups;
create policy "admin manage opportunity followups"
on public.opportunity_followups for all to authenticated
using (public.is_admin())
with check (public.is_admin());

revoke all on public.opportunity_followups from anon, public;
grant select, insert, update, delete on public.opportunity_followups to authenticated;

commit;
