-- Verifikasi read-only retention Karsa Mobile Group.

SELECT
  p.proname AS function_name,
  pg_get_userbyid(p.proowner) AS function_owner,
  p.prosecdef AS security_definer,
  has_function_privilege('karsa_runtime', p.oid, 'EXECUTE') AS runtime_can_execute,
  has_function_privilege('karsa_backup', p.oid, 'EXECUTE') AS backup_can_execute,
  has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_can_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_can_execute
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'karsa_purge_group_retention';

SELECT jobid, jobname, schedule, command, active
FROM cron.job
WHERE jobname = 'karsa-group-retention-daily';

-- Kandidat saat ini; query ini tidak menghapus atau mengubah data.
SELECT
  (
    SELECT count(*)
    FROM "GroupMessage" AS message
    WHERE message.pinned_at IS NOT NULL
      AND message.pinned_at < CURRENT_TIMESTAMP - INTERVAL '40 days'
  ) AS pins_due_for_expiry,
  (
    SELECT count(*)
    FROM "GroupMessage" AS message
    JOIN "KelasMatkul" AS assignment ON assignment.id = message.kelas_matkul_id
    JOIN "Kelas" AS class ON class.id = assignment.kelas_id
    JOIN "Semester" AS semester ON semester.id = class.semester_id
    WHERE semester.end_date < CURRENT_TIMESTAMP - INTERVAL '90 days'
      AND NOT EXISTS (
        SELECT 1
        FROM "GroupReport" AS report
        WHERE report.message_id = message.id
          AND (
            report.status = 'OPEN'
            OR report.resolved_at IS NULL
            OR report.resolved_at >= CURRENT_TIMESTAMP - INTERVAL '90 days'
          )
      )
  ) AS messages_due_for_delete,
  (
    SELECT count(*)
    FROM "GroupMessage" AS message
    WHERE message.body IS NOT NULL
      AND COALESCE(message.deleted_at, message.hidden_at)
          < CURRENT_TIMESTAMP - INTERVAL '30 days'
      AND NOT EXISTS (
        SELECT 1
        FROM "GroupReport" AS report
        WHERE report.message_id = message.id
          AND (
            report.status = 'OPEN'
            OR report.resolved_at IS NULL
            OR report.resolved_at >= CURRENT_TIMESTAMP - INTERVAL '90 days'
          )
      )
  ) AS message_bodies_due_for_purge;
