begin;

alter table public.opportunities
  add column if not exists next_followup_date date,
  add column if not exists next_followup_note text;

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
  and length(coalesce(customer_name,'')) <= 120
  and length(coalesce(phone,'')) <= 40
  and length(coalesce(email,'')) <= 254
);

commit;
