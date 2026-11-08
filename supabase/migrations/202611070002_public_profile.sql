begin;

drop policy if exists "public read public profile" on public.app_settings;
create policy "public read public profile"
on public.app_settings for select to anon, authenticated
using (key = 'public_profile');

grant select on public.app_settings to anon;

commit;
