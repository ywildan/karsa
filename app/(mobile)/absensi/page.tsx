/**
 * Karsa — app/(mobile)/absensi/page.tsx
 * ----------------------------------------------------------------------------
 * Tab Absensi channel mobile PJ: daftar matkul yang dipegang pada semester
 * aktif, lengkap dengan jumlah catatan dan alpha.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, ClipboardCheck, Info, Users } from "lucide-react";

import { listPjAttendanceAssignments } from "@/lib/services/attendance-service";
import { requireUser } from "@/lib/auth-helpers";

export const metadata: Metadata = {
  title: "Absensi",
};

export default async function AbsensiPjPage() {
  const user = await requireUser();
  const assignments = await listPjAttendanceAssignments(user.id);

  return (
    <main className="flex flex-col gap-4 px-4 py-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Absensi</h1>
        <p className="text-sm text-muted-foreground">
          Catat mahasiswa yang tidak hadir di mata kuliah yang kamu pegang.
        </p>
      </header>

      {assignments.length === 0 ? (
        <div className="flex flex-col gap-3 rounded-xl border border-dashed border-border bg-card p-5">
          <div className="flex items-start gap-2">
            <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div>
              <h2 className="text-sm font-medium">
                Belum ada matkul aktif yang bisa diabsen
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Kamu belum ditugaskan sebagai PJ, atau kelasnya belum memakai
                semester aktif. Minta admin menugaskan lewat Admin → Kelas →
                tab Matkul &amp; PJ.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {assignments.length} matkul · ketuk kartu untuk melihat mahasiswa
            dan mencatat absensi.
          </p>

          <ul className="grid gap-3">
            {assignments.map((assignment) => (
              <li key={assignment.id}>
                <Link
                  href={`/absensi/${assignment.id}`}
                  className="flex min-h-11 flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-soft transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
                      <ClipboardCheck className="h-5 w-5" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{assignment.matkul.name}</p>
                      <p className="mt-0.5 truncate text-sm text-muted-foreground">
                        Kelas {assignment.kelas.name} · {assignment.kelas.prodi.name}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        Semester {assignment.kelas.semester.name}
                        {assignment.matkul.code ? ` · ${assignment.matkul.code}` : ""}
                      </p>
                    </div>
                    <ChevronRight aria-hidden className="mt-1 size-4 shrink-0 text-muted-foreground" />
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-secondary px-2 py-2">
                      <p className="text-base font-semibold tabular-nums">
                        {assignment.student_count}
                      </p>
                      <p className="text-[11px] text-muted-foreground">Mahasiswa</p>
                    </div>
                    <div className="rounded-lg bg-secondary px-2 py-2">
                      <p className="text-base font-semibold tabular-nums">
                        {assignment.total_records}
                      </p>
                      <p className="text-[11px] text-muted-foreground">Catatan</p>
                    </div>
                    <div className="rounded-lg bg-secondary px-2 py-2">
                      <p className="text-base font-semibold tabular-nums text-destructive">
                        {assignment.alpha_records}
                      </p>
                      <p className="text-[11px] text-muted-foreground">Tanpa ket.</p>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          <p className="flex items-start gap-2 rounded-lg bg-accent px-3 py-2.5 text-xs leading-5 text-accent-foreground">
            <Users className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            Kuota kampus: maksimal 2 tanpa keterangan per mahasiswa per matkul
            per semester. Catatan ke-3 tetap tersimpan dengan peringatan.
          </p>
        </>
      )}
    </main>
  );
}
