begin;

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

commit;
