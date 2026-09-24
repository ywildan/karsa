-- Karsa Mobile Group — retention function and daily Supabase Cron job.
-- Prasyarat: Supabase Integrations > Cron sudah diaktifkan.
-- Jalankan melalui SQL Editor sebagai database owner setelah mobile-groups.sql.

BEGIN;

CREATE OR REPLACE FUNCTION public.karsa_purge_group_retention()
RETURNS TABLE (
    body_purged BIGINT,
    messages_deleted BIGINT,
    ran_at TIMESTAMP(3)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $retention$
DECLARE
    deleted_count BIGINT := 0;
    purged_count BIGINT := 0;
    execution_time TIMESTAMP(3) := CURRENT_TIMESTAMP;
BEGIN
    -- Seluruh riwayat grup dihapus setelah semester berakhir + 90 hari.
    DELETE FROM public."GroupMessage" AS message
    USING public."KelasMatkul" AS assignment,
          public."Kelas" AS class,
          public."Semester" AS semester
    WHERE message.kelas_matkul_id = assignment.id
      AND assignment.kelas_id = class.id
      AND class.semester_id = semester.id
      AND semester.end_date < execution_time - INTERVAL '90 days'
      AND NOT EXISTS (
          SELECT 1
          FROM public."GroupReport" AS report
          WHERE report.message_id = message.id
            AND (
                report.status = 'OPEN'
                OR report.resolved_at IS NULL
                OR report.resolved_at >= execution_time - INTERVAL '90 days'
            )
      );
    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    -- Body tombstone dibuang setelah 30 hari, kecuali masih menjadi bukti
    -- laporan terbuka atau laporan yang selesai dalam 90 hari terakhir.
    UPDATE public."GroupMessage" AS message
    SET body = NULL,
        updated_at = execution_time
    WHERE message.body IS NOT NULL
      AND COALESCE(message.deleted_at, message.hidden_at)
          < execution_time - INTERVAL '30 days'
      AND NOT EXISTS (
          SELECT 1
          FROM public."GroupReport" AS report
          WHERE report.message_id = message.id
            AND (
                report.status = 'OPEN'
                OR report.resolved_at IS NULL
                OR report.resolved_at >= execution_time - INTERVAL '90 days'
            )
      );
    GET DIAGNOSTICS purged_count = ROW_COUNT;

    RETURN QUERY SELECT purged_count, deleted_count, execution_time;
END;
$retention$;

REVOKE ALL ON FUNCTION public.karsa_purge_group_retention()
    FROM PUBLIC, anon, authenticated, karsa_runtime, karsa_backup;

-- Pastikan deploy ulang bersifat idempotent dan hanya menyisakan satu job.
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'karsa-group-retention-daily';

SELECT cron.schedule(
    'karsa-group-retention-daily',
    '17 20 * * *',
    $cron$SELECT public.karsa_purge_group_retention();$cron$
);

COMMIT;

-- Jadwal 20:17 UTC = 03:17 WIB setiap hari.
