/**
 * Karsa — app/(desktop)/kehadiran/page.tsx
 * ----------------------------------------------------------------------------
 * Kehadiran mahasiswa (web): sisa jatah TANPA_KETERANGAN per matkul pada
 * semester aktif, plus riwayat singkat. Data dan otorisasi dari server.
 */
import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarDays,
  ChevronLeft,
  ClipboardCheck,
  Info,
  TriangleAlert,
} from "lucide-react";

import { Button } from "@/components/button";
import { QuotaDots } from "@/components/absensi/quota-dots";
import { Badge } from "@/components/ui/badge";
import {
  absensiStatusLabel,
  absensiStatusTone,
  formatTanggalAbsensi,
} from "@/lib/absensi-view";
import { requireUser } from "@/lib/auth-helpers";
import { getStudentAttendance } from "@/lib/services/attendance-service";

export const metadata: Metadata = {
  title: "Kehadiran",
};

export default async function KehadiranPage() {
  const user = await requireUser();
  const data = await getStudentAttendance({
    id: user.id,
    kelas_id: user.kelas_id ?? null,
  });

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-7 px-6 py-10 sm:px-8">
      <div>
        <Button asChild variant="outline" size="sm" className="w-fit">
          <Link href="/dashboard">
            <ChevronLeft aria-hidden />
            Kembali ke rapor
          </Link>
        </Button>
      </div>

      <header className="border-b border-border pb-6">
        <p className="text-sm text-muted-foreground">Kehadiran semester ini</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Kehadiran</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {data.empty
            ? "Rekap ketidakhadiran per mata kuliah pada semester aktif."
            : `${data.kelas.name} · ${data.prodi.name} · ${data.semester.name}`}
        </p>
      </header>

      {data.empty ? (
        <section className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <ClipboardCheck className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden />
          <h2 className="mt-3 text-lg font-semibold tracking-tight">
            Belum ada data kehadiran
          </h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Kamu belum terdaftar di kelas, atau admin belum menetapkan semester
            aktif untuk prodi dan angkatanmu.
          </p>
          <Button asChild className="mt-5 w-fit">
            <Link href="/dashboard">Kembali ke rapor</Link>
          </Button>
        </section>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-3" aria-label="Ringkasan kehadiran">
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-xs font-medium text-muted-foreground">
                Tanpa keterangan
              </p>
              <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight text-destructive">
                {data.totals.tanpa_keterangan}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-xs font-medium text-muted-foreground">Sakit</p>
              <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight">
                {data.totals.sakit}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-xs font-medium text-muted-foreground">
                Keterangan / izin
              </p>
              <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight">
                {data.totals.izin}
              </p>
            </div>
          </section>

          <p className="flex items-start gap-2.5 rounded-xl bg-accent px-4 py-3 text-sm leading-6 text-accent-foreground">
            <Info className="mt-1 h-4 w-4 shrink-0" aria-hidden />
            <span>
              Jatah tanpa keterangan maksimal {data.limit} per mata kuliah per
              semester. Catatan sakit dan keterangan tidak mengurangi jatah.
            </span>
          </p>

          <section aria-labelledby="kehadiran-matkul" className="grid gap-3">
            <div className="flex items-baseline justify-between gap-4">
              <h2 id="kehadiran-matkul" className="text-lg font-semibold tracking-tight">
                Jatah per mata kuliah
              </h2>
              <span className="text-sm text-muted-foreground">
                {data.courses.length} matkul
              </span>
            </div>

            {data.courses.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
                Belum ada mata kuliah yang ditugaskan untuk kelas ini.
              </div>
            ) : (
              <ul className="grid gap-3">
                {data.courses.map((course) => {
                  const name = course.matkul.name;
                  const over = course.alpha_over > 0;
                  const exhausted = course.alpha_remaining === 0 && !over;
                  return (
                    <li
                      key={course.id}
                      className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
                    >
                      <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="font-semibold tracking-tight">{name}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {course.matkul.code ? `${course.matkul.code} · ` : ""}
                            PJ: {course.pj.name?.trim() || "Belum ditentukan"}
                          </p>
                          <div className="mt-3">
                            <QuotaDots alpha={course.counts.tanpa_keterangan} limit={course.alpha_limit} />
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {over ? (
                            <Badge variant="destructive">Lewat {course.alpha_over}</Badge>
                          ) : exhausted ? (
                            <Badge variant="destructive">Jatah habis</Badge>
                          ) : (
                            <Badge variant="secondary">
                              Sisa {course.alpha_remaining}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {course.history.length} catatan
                          </span>
                        </div>
                      </div>

                      {course.history.length > 0 ? (
                        <details className="group border-t border-border bg-muted/40">
                          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
                            <span>Riwayat absensi</span>
                            <span className="text-xs text-muted-foreground group-open:hidden">
                              Buka
                            </span>
                            <span className="hidden text-xs text-muted-foreground group-open:inline">
                              Tutup
                            </span>
                          </summary>
                          <ul className="divide-y divide-border/70 border-t border-border/70">
                            {course.history.map((record) => (
                              <li
                                key={record.id}
                                className="flex flex-wrap items-center gap-3 px-5 py-3"
                              >
                                <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                                <span className="text-sm font-medium">
                                  {formatTanggalAbsensi(record.tanggal)}
                                </span>
                                <span
                                  className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${absensiStatusTone(record.status)}`}
                                >
                                  {absensiStatusLabel(record.status)}
                                </span>
                                {record.catatan ? (
                                  <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                                    {record.catatan}
                                  </span>
                                ) : null}
                              </li>
                            ))}
                          </ul>
                        </details>
                      ) : (
                        <p className="border-t border-border px-5 py-3 text-sm text-muted-foreground">
                          Belum ada catatan untuk mata kuliah ini.
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {data.totals.tanpa_keterangan > 0 ? (
            <p className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm leading-6 text-amber-800 dark:text-amber-200">
              <TriangleAlert className="mt-1 h-4 w-4 shrink-0" aria-hidden />
              Ada catatan tanpa keterangan pada semester ini. Hubungi PJ mata
              kuliah terkait bila ada catatan yang keliru.
            </p>
          ) : null}
        </>
      )}
    </main>
  );
}
