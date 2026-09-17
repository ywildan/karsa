/**
 * Karsa — app/(desktop)/admin/kelas/[id]/page.tsx
 * ----------------------------------------------------------------------------
 * Detail kelas (Sub-Fase 2C, PRD §7.1 langkah 3): header kelas + tab
 * "Mahasiswa" (2C) dan "Matkul & PJ" (placeholder → 2D).
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

export default async function AdminKelasDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();

  const { id } = await params;

  const [kelas, mahasiswaRaw] = await Promise.all([
    prisma.kelas.findUnique({
      where: { id },
      include: {
        prodi: true,
        semester: true,
        _count: { select: { users: true, kelasMatkul: true } },
      },
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
        jumlahMatkul={kelas._count.kelasMatkul}
      />
    </main>
  );
}
