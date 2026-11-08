-- Auditoría de solo lectura para comparar la base con las funciones actuales.
-- Ejecutar en Supabase SQL Editor. No muestra registros de clientes ni modifica datos.

with expected_tables(table_name) as (
  values
    ('admin_users'),
    ('vehicles'),
    ('opportunities'),
    ('vehicle_inquiries'),
    ('opportunity_followups'),
    ('appraisals'),
    ('comparables'),
    ('audit_logs'),
    ('app_settings')
)
select
  'table_rls' as check_group,
  expected.table_name as item,
  case
    when relation.oid is null then 'MISSING'
    when relation.relrowsecurity then 'OK'
    else 'RLS_DISABLED'
  end as status,
  case
    when relation.oid is null then 'La tabla no existe en public.'
    when relation.relrowsecurity then 'Tabla presente con RLS habilitado.'
    else 'La tabla existe, pero RLS está deshabilitado.'
  end as details
from expected_tables as expected
left join pg_catalog.pg_class as relation
  on relation.relname = expected.table_name
left join pg_catalog.pg_namespace as namespace_info
  on namespace_info.oid = relation.relnamespace
  and namespace_info.nspname = 'public'
where relation.oid is null or namespace_info.oid is not null
order by check_group, item;

-- Columnas que habilitan las funciones públicas y comerciales.
with expected_columns(table_name, column_name) as (
  values
    ('opportunities', 'desired_vehicle_id'),
    ('opportunities', 'trade_vehicle'),
    ('opportunities', 'next_followup_date'),
    ('opportunities', 'next_followup_note'),
    ('vehicle_inquiries', 'vehicle_id'),
    ('vehicle_inquiries', 'customer_name'),
    ('vehicle_inquiries', 'phone'),
    ('vehicle_inquiries', 'email'),
    ('vehicle_inquiries', 'message'),
    ('vehicle_inquiries', 'internal_notes'),
    ('vehicle_inquiries', 'next_followup_date'),
    ('vehicle_inquiries', 'next_followup_note'),
    ('vehicle_inquiries', 'status'),
    ('opportunity_followups', 'opportunity_id'),
    ('appraisals', 'opportunity_id'),
    ('comparables', 'appraisal_id'),
    ('audit_logs', 'actor_user_id'),
    ('app_settings', 'key')
)
select
  'column' as check_group,
  expected.table_name || '.' || expected.column_name as item,
  case when column_info.column_name is null then 'MISSING' else 'OK' end as status,
  case
    when column_info.column_name is null then 'Columna requerida por el sistema.'
    else 'Columna presente; nulabilidad=' || column_info.is_nullable
  end as details
from expected_columns as expected
left join information_schema.columns as column_info
  on column_info.table_schema = 'public'
  and column_info.table_name = expected.table_name
  and column_info.column_name = expected.column_name
order by item;

-- Restricciones de integridad aplicadas por las migraciones 006 y 008.
with expected_constraints(table_name, constraint_name, expected_type) as (
  values
    ('opportunities', 'opportunities_closed_followup_check', 'check'),
    ('opportunities', 'opportunities_desired_vehicle_id_fkey', 'foreign key'),
    ('vehicle_inquiries', 'vehicle_inquiries_vehicle_id_fkey', 'foreign key'),
    ('vehicle_inquiries', 'vehicle_inquiries_contact_required', 'check'),
    ('vehicle_inquiries', 'vehicle_inquiries_internal_notes_length', 'check'),
    ('vehicle_inquiries', 'vehicle_inquiries_followup_note_length', 'check'),
    ('vehicle_inquiries', 'vehicle_inquiries_followup_requires_date', 'check'),
    ('vehicle_inquiries', 'vehicle_inquiries_closed_followup_check', 'check')
)
select
  'constraint' as check_group,
  expected.table_name || '.' || expected.constraint_name as item,
  case
    when constraint_info.oid is null then 'MISSING'
    when expected.expected_type = 'foreign key'
      and (constraint_info.contype <> 'f' or constraint_info.confdeltype <> 'r')
      then 'WRONG_FOREIGN_KEY'
    when expected.expected_type = 'check'
      and constraint_info.contype <> 'c' then 'WRONG_CONSTRAINT_TYPE'
    else 'OK'
  end as status,
  case
    when constraint_info.oid is null then 'Restricción requerida por una migración.'
    when expected.expected_type = 'check'
      then 'CHECK presente; validada=' || constraint_info.convalidated::text
    when constraint_info.confdeltype = 'r'
      then 'FK presente con ON DELETE RESTRICT.'
    else 'FK presente, pero la regla ON DELETE no es RESTRICT.'
  end as details
from expected_constraints as expected
left join pg_catalog.pg_constraint as constraint_info
  on constraint_info.conname = expected.constraint_name
  and constraint_info.conrelid = pg_catalog.to_regclass('public.' || expected.table_name)
order by item;

-- Las definiciones completas permiten confirmar el control de cada política.
with expected_policies(schema_name, table_name, policy_name) as (
  values
    ('public', 'opportunities', 'public create opportunities'),
    ('public', 'vehicle_inquiries', 'public create vehicle inquiries'),
    ('public', 'vehicle_inquiries', 'admin read vehicle inquiries'),
    ('public', 'vehicle_inquiries', 'admin update vehicle inquiries'),
    ('public', 'opportunities', 'admin read opportunities'),
    ('public', 'opportunities', 'admin update opportunities'),
    ('public', 'opportunity_followups', 'admin read opportunity followups'),
    ('public', 'opportunity_followups', 'admin insert opportunity followups'),
    ('public', 'appraisals', 'admin read appraisals'),
    ('public', 'appraisals', 'admin insert appraisals'),
    ('public', 'audit_logs', 'admin read audit logs'),
    ('public', 'audit_logs', 'admin insert audit logs'),
    ('public', 'app_settings', 'public read public profile'),
    ('storage', 'objects', 'Admin upload vehicle photos'),
    ('storage', 'objects', 'Admin read vehicle photos'),
    ('storage', 'objects', 'Admin delete vehicle photos'),
    ('storage', 'objects', 'Public upload trade vehicle photos'),
    ('storage', 'objects', 'Admin read trade vehicle photos')
)
select
  'policy' as check_group,
  expected.schema_name || '.' || expected.table_name || '.' || expected.policy_name as item,
  case when policy.policyname is null then 'MISSING' else 'PRESENT_REVIEW_DEFINITION' end as status,
  case
    when policy.policyname is null then 'Política requerida por el sistema.'
    else 'cmd=' || policy.cmd || '; roles=' || policy.roles::text
      || '; using=' || coalesce(policy.qual, '-')
      || '; check=' || coalesce(policy.with_check, '-')
  end as details
from expected_policies as expected
left join pg_catalog.pg_policies as policy
  on policy.schemaname = expected.schema_name
  and policy.tablename = expected.table_name
  and policy.policyname = expected.policy_name
order by item;

-- Comprueba que RLS esté acompañado por los permisos SQL esperados.
with expected_privileges(schema_name, table_name, role_name, privilege_name, expected) as (
  values
    ('public', 'opportunities', 'anon', 'INSERT', true),
    ('public', 'opportunities', 'anon', 'SELECT', false),
    ('public', 'opportunities', 'anon', 'UPDATE', false),
    ('public', 'vehicle_inquiries', 'anon', 'INSERT', true),
    ('public', 'vehicle_inquiries', 'anon', 'SELECT', false),
    ('public', 'vehicle_inquiries', 'anon', 'UPDATE', false),
    ('public', 'vehicle_inquiries', 'authenticated', 'INSERT', true),
    ('public', 'vehicle_inquiries', 'authenticated', 'SELECT', true),
    ('public', 'vehicle_inquiries', 'authenticated', 'UPDATE', true),
    ('public', 'vehicle_inquiries', 'authenticated', 'DELETE', false),
    ('public', 'opportunities', 'authenticated', 'INSERT', true),
    ('public', 'opportunities', 'authenticated', 'SELECT', true),
    ('public', 'opportunities', 'authenticated', 'UPDATE', true),
    ('public', 'opportunities', 'authenticated', 'DELETE', false),
    ('public', 'opportunity_followups', 'authenticated', 'SELECT', true),
    ('public', 'opportunity_followups', 'authenticated', 'INSERT', true),
    ('public', 'opportunity_followups', 'authenticated', 'UPDATE', false),
    ('public', 'opportunity_followups', 'authenticated', 'DELETE', false),
    ('public', 'appraisals', 'authenticated', 'SELECT', true),
    ('public', 'appraisals', 'authenticated', 'INSERT', true),
    ('public', 'appraisals', 'authenticated', 'UPDATE', false),
    ('public', 'appraisals', 'authenticated', 'DELETE', false),
    ('public', 'audit_logs', 'authenticated', 'SELECT', true),
    ('public', 'audit_logs', 'authenticated', 'INSERT', true),
    ('public', 'audit_logs', 'authenticated', 'UPDATE', false),
    ('public', 'audit_logs', 'authenticated', 'DELETE', false)
)
select
  'privilege' as check_group,
  expected.schema_name || '.' || expected.table_name || '.'
    || expected.role_name || '.' || expected.privilege_name as item,
  case
    when relation.oid is null then 'TABLE_MISSING'
    when privilege_check.has_privilege = expected.expected then 'OK'
    else 'UNEXPECTED_PRIVILEGE'
  end as status,
  'expected=' || expected.expected::text || '; actual='
    || coalesce(privilege_check.has_privilege::text, 'false') as details
from expected_privileges as expected
left join pg_catalog.pg_class as relation
  on relation.oid = pg_catalog.to_regclass(
    expected.schema_name || '.' || expected.table_name
  )
left join lateral (
  select case
    when expected.privilege_name = 'DELETE' then
      pg_catalog.has_table_privilege(
        expected.role_name::name,
        relation.oid,
        expected.privilege_name
      )
    else
      pg_catalog.has_any_column_privilege(
        expected.role_name::name,
        relation.oid,
        expected.privilege_name
      )
  end as has_privilege
) as privilege_check on relation.oid is not null
order by item;

-- Buckets usados por las imágenes públicas del catálogo y las fotos privadas.
select
  'storage_bucket' as check_group,
  expected.bucket_id as item,
  case when bucket.id is null then 'MISSING' else 'OK' end as status,
  case
    when bucket.id is null then 'Bucket requerido por el flujo de fotografías.'
    else 'public=' || bucket.public::text
  end as details
from (values ('vehicle-photos'), ('trade-vehicle-photos')) as expected(bucket_id)
left join storage.buckets as bucket on bucket.id = expected.bucket_id
order by item;
