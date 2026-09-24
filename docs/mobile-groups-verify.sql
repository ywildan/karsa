-- Karsa Mobile Group — verifikasi read-only setelah prisma/mobile-groups.sql.
-- Aman dijalankan di Supabase SQL Editor; tidak mengubah data maupun schema.

SELECT
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced,
  pg_get_userbyid(c.relowner) AS table_owner
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname IN ('GroupMessage', 'GroupReport', 'GroupBlock')
ORDER BY c.relname;

SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    table_name IN ('GroupMessage', 'GroupReport', 'GroupBlock')
    OR (table_name = 'KelasMatkul' AND column_name IN ('group_locked_at', 'group_locked_by_id'))
  )
ORDER BY table_name, ordinal_position;

SELECT
  table_name,
  has_table_privilege('karsa_runtime', format('%I.%I', table_schema, table_name), 'SELECT') AS can_select,
  has_table_privilege('karsa_runtime', format('%I.%I', table_schema, table_name), 'INSERT') AS can_insert,
  has_table_privilege('karsa_runtime', format('%I.%I', table_schema, table_name), 'UPDATE') AS can_update,
  has_table_privilege('karsa_runtime', format('%I.%I', table_schema, table_name), 'DELETE') AS can_delete,
  has_table_privilege('anon', format('%I.%I', table_schema, table_name), 'SELECT,INSERT,UPDATE,DELETE') AS anon_has_any,
  has_table_privilege('authenticated', format('%I.%I', table_schema, table_name), 'SELECT,INSERT,UPDATE,DELETE') AS authenticated_has_any
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('GroupMessage', 'GroupReport', 'GroupBlock')
ORDER BY table_name;

SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('GroupMessage', 'GroupReport', 'GroupBlock')
ORDER BY tablename, policyname;

SELECT
  conrelid::regclass::text AS table_name,
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE connamespace = 'public'::regnamespace
  AND conrelid IN (
    'public."KelasMatkul"'::regclass,
    'public."GroupMessage"'::regclass,
    'public."GroupReport"'::regclass,
    'public."GroupBlock"'::regclass
  )
  AND (
    conrelid <> 'public."KelasMatkul"'::regclass
    OR conname = 'KelasMatkul_group_locked_by_id_fkey'
  )
ORDER BY table_name, constraint_name;

SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('GroupMessage', 'GroupReport', 'GroupBlock')
ORDER BY tablename, indexname;
