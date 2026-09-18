/**
 * Karsa — app/(desktop)/admin/kelas/[id]/page.tsx
 * ----------------------------------------------------------------------------
 * Detail kelas (Sub-Fase 2C + 2D, PRD §7.1 langkah 3): header kelas + tab
 * "Mahasiswa" (2C) dan "Matkul & PJ" (2D — assign matkul & kelola PJ).
 *
 * Server component: `requireAdmin()` → query paralel → kirim data primitif ke
 * komponen client. `params` di-await (Next.js 15 — params berupa Promise).
 *
 * Query mahasiswa memakai `select` eksplisit + `kelasMatkulAsPj` BER-FILTER
 * `kelas_id`: badge PJ hanya muncul kalau user memang PJ di KELAS INI, bukan di
 * kelas lain (koreksi review 2C — menjaga invariant PRD tetap benar walau data
 * lama sempat menyimpang).
 */
import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";

import { requireAdmin } from "@/lib/auth-helpers";
import { formatDateWib } from "@/lib/utils";
import type {
  KelasMatkulRow,
  MatkulOption,
  PjKandidatOption,
} from "@/lib/kelas-matkul";
import type { MahasiswaRow } from "@/lib/mahasiswa";
import { prisma } from "@/lib/prisma";

import { AdminNav } from "@/components/admin-nav";
import { Button } from "@/components/button";
import { KelasDetailTabs } from "./_components/kelas-detail-tabs";

export const metadata: Metadata = {
  title: "Detail Kelas",
};

/**
 * Bentuk baris hasil `select` mahasiswa di bawah. Ditulis manual supaya file ini
 * tetap ter-typecheck walau `prisma generate` belum jalan (pola
 * `lib/user-snapshot.ts`); hasil query asli kompatibel persis.
 */
interface MahasiswaQueryRow {
  id: string;
  name: string | null;
  nim: string | null;
  email: string;
  is_admin: boolean;
  kelasMatkulAsPj: { id: string }[];
}

/** Bentuk baris hasil query `kelasMatkul` (lihat alasannya di tipe di atas). */
interface KelasMatkulQueryRow {
  id: string;
  matkul: { id: string; name: string; code: string | null };
  pj: { id: string; name: string | null; nim: string | null; email: string };
}

export default async function AdminKelasDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();

  const { id } = await params;

  const [kelas, mahasiswaRaw, kelasMatkulRaw, matkulsRaw, adminRaw] =
    await Promise.all([
      prisma.kelas.findUnique({
        where: { id },
        include: { prodi: true, semester: true },
      }),
      prisma.user.findMany({
        where: { kelas_id: id },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          nim: true,
          email: true,
          is_admin: true,
          kelasMatkulAsPj: {
            where: { kelas_id: id },
            select: { id: true },
            take: 1,
          },
        },
      }),
      // Penugasan matkul di kelas ini (tab 2D). Unique (kelas_id, matkul_id)
      // menjamin tidak ada baris ganda untuk matkul yang sama.
      prisma.kelasMatkul.findMany({
        where: { kelas_id: id },
        include: {
          matkul: true,
          pj: { select: { id: true, name: true, nim: true, email: true } },
        },
        orderBy: { matkul: { name: "asc" } },
      }),
      // Semua matkul: dropdown "Assign Matkul" menyaring yang belum di-assign
      // di client (daftarnya kecil & halaman ini sudah memuat seluruh data).
      prisma.matkul.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, code: true },
      }),
      // Admin di luar kelas ini tetap boleh merangkap PJ (PRD §6), jadi diambil
      // terpisah lalu digabung tanpa duplikasi dengan anggota kelas.
      prisma.user.findMany({
        where: { is_admin: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true, nim: true, email: true },
      }),
    ]);

  if (!kelas) notFound();

  const mahasiswa: MahasiswaRow[] = mahasiswaRaw.map(
    (row: MahasiswaQueryRow): MahasiswaRow => ({
      id: row.id,
      name: row.name,
      nim: row.nim,
      email: row.email,
      is_admin: row.is_admin,
      is_pj: row.kelasMatkulAsPj.length > 0,
    }),
  );

  const kelasMatkul: KelasMatkulRow[] = kelasMatkulRaw.map(
    (row: KelasMatkulQueryRow): KelasMatkulRow => ({
      id: row.id,
      matkul: row.matkul,
      pj: row.pj,
    }),
  );

  const matkuls: MatkulOption[] = matkulsRaw;

  /**
   * Kandidat PJ: semua anggota kelas + admin di luar kelas ini. Admin yang
   * sudah menjadi anggota kelas tidak diduplikasi dan tetap ber-flag admin.
   */
  const mahasiswaIds = new Set(mahasiswa.map((row) => row.id));
  const pjKandidat: PjKandidatOption[] = [
    ...mahasiswa
      .map((row): PjKandidatOption => ({
        id: row.id,
        name: row.name,
        nim: row.nim,
        email: row.email,
        is_admin: row.is_admin,
      })),
    ...adminRaw
      .filter((row) => !mahasiswaIds.has(row.id))
      .map((row): PjKandidatOption => ({ ...row, is_admin: true })),
  ];

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <AdminNav />

      <header className="flex flex-col gap-3">
        <Button asChild variant="outline" size="sm" className="w-fit">
          <Link href="/admin/kelas">
            <ChevronLeft aria-hidden />
            Kembali
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{kelas.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Prodi {kelas.prodi.name} · Semester {kelas.semester.name} · Dibuat{" "}
            {formatDateWib(kelas.created_at)} WIB
          </p>
        </div>
      </header>

      <KelasDetailTabs
        kelasId={kelas.id}
        kelasName={kelas.name}
        mahasiswa={mahasiswa}
        kelasMatkul={kelasMatkul}
        matkuls={matkuls}
        pjKandidat={pjKandidat}
      />
    </main>
  );
}
