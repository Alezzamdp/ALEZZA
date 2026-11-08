begin;

alter table public.opportunities
  drop constraint if exists opportunities_desired_vehicle_id_fkey;

alter table public.opportunities
  add constraint opportunities_desired_vehicle_id_fkey
  foreign key (desired_vehicle_id)
  references public.vehicles(id)
  on delete restrict;

commit;
