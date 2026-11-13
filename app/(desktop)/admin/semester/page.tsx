/**
 * Karsa — app/(desktop)/admin/semester/page.tsx
 * ----------------------------------------------------------------------------
 * Halaman master semester + penetapan semester aktif per (prodi, angkatan).
 * Server component: otorisasi (`requireAdmin()`) + query data di server,
 * interaksi tabel & dialog dirender komponen client.
 */
import type { Metadata } from "next";

import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

import { CohortSemesterManager, type CohortRow } from "./_components/cohort-semester-manager";
import { SemesterManager } from "./_components/semester-manager";

export const metadata: Metadata = {
  title: "Kelola Semester",
};

export default async function AdminSemesterPage() {
  await requireAdmin();

  const [semesters, kelasCohorts, pointers] = await Promise.all([
    prisma.semester.findMany({ orderBy: { start_date: "desc" } }),
    prisma.kelas.findMany({
      where: { angkatan: { not: null } },
      select: {
        prodi_id: true,
        angkatan: true,
        prodi: { select: { name: true } },
      },
    }),
    prisma.cohortSemester.findMany({
      select: {
        prodi_id: true,
        angkatan: true,
        semester_id: true,
        prodi: { select: { name: true } },
      },
    }),
  ]);

  const cohorts = new Map<string, CohortRow>();
  for (const kelas of kelasCohorts) {
    if (kelas.angkatan === null) continue;
    const key = `${kelas.prodi_id}:${kelas.angkatan}`;
    if (!cohorts.has(key)) {
      cohorts.set(key, {
        prodi_id: kelas.prodi_id,
        prodi_name: kelas.prodi.name,
        angkatan: kelas.angkatan,
        semester_id: null,
      });
    }
  }
  for (const pointer of pointers) {
    const key = `${pointer.prodi_id}:${pointer.angkatan}`;
    cohorts.set(key, {
      prodi_id: pointer.prodi_id,
      prodi_name: pointer.prodi.name,
      angkatan: pointer.angkatan,
      semester_id: pointer.semester_id,
    });
  }

  const rows = [...cohorts.values()].sort(
    (a, b) =>
      a.prodi_name.localeCompare(b.prodi_name, "id") ||
      b.angkatan - a.angkatan,
  );

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8">

      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Semester</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Periode akademik bersifat umum, sedangkan <strong>semester aktif</strong>{" "}
          ditetapkan per (prodi, angkatan). Dua kelas dalam angkatan yang sama
          otomatis mengikuti periode yang sama.
        </p>
      </header>

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Periode semester</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Master periode, mis. &quot;Ganjil 2026/2027&quot;. Menambah periode
            tidak langsung mengaktifkannya.
          </p>
        </div>
        <SemesterManager semesters={semesters} />
      </section>

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Semester aktif per angkatan</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Rapor, leaderboard, dan input poin mengikuti baris ini. Angkatan yang
            belum ditetapkan akan melihat rapor kosong sampai periodenya dipilih.
          </p>
        </div>
        <CohortSemesterManager cohorts={rows} semesters={semesters} />
      </section>
    </main>
  );
}
