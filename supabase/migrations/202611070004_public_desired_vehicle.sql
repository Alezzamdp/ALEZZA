begin;

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
);

commit;
