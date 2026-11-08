begin;

-- Keep administrative activity and contact histories append-only.
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

revoke all on public.audit_logs from anon, authenticated, public;
grant select, insert on public.audit_logs to authenticated;

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

revoke all on public.opportunity_followups from anon, authenticated, public;
grant select, insert on public.opportunity_followups to authenticated;

-- Preserve appraisal versions. An approval must belong to the acting admin.
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

revoke all on public.appraisals from anon, authenticated, public;
grant select, insert on public.appraisals to authenticated;

-- Opportunities close through status changes; do not hard-delete their history.
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

revoke all on public.opportunities from anon, authenticated, public;
grant insert on public.opportunities to anon, authenticated;
grant select, update on public.opportunities to authenticated;

commit;
