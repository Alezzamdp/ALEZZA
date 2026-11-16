-- Estética: el plan "lavado" pasa a llamarse Preparación base (el nombre vive en src/lib/turnos.ts)
-- y su precio baja de 100.000 a 60.000. Solo se toca si sigue con el valor anterior,
-- así no pisa un precio que se haya cambiado desde Configuración.
update public.app_settings
set value = jsonb_set(value, '{precios,lavado}', '60000'::jsonb)
where key = 'turnos'
  and (value -> 'precios' ->> 'lavado')::numeric = 100000;
