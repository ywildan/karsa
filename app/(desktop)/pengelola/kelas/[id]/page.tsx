/**
 * Karsa — app/(desktop)/pengelola/kelas/[id]/page.tsx
 * ----------------------------------------------------------------------------
 * Detail kelas untuk pengelola — komponen tab yang sama dengan halaman
 * admin (`KelasDetailTabs`), tetapi dijaga `requirePengelolaKelas()`:
 * pengelola hanya bisa membuka kelas dalam lingkup penunjukannya.
 * Semua mutasi di tab tetap diperiksa ulang per-resource di server actions.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";

import { KelasDetailTabs } from "@/app/(desktop)/admin/kelas/[id]/_components/kelas-detail-tabs";
import { Button } from "@/components/button";
import { requirePengelolaKelas } from "@/lib/auth-helpers";
import type {
  KelasMatkulRow,
  MatkulOption,
  PjKandidatOption,
} from "@/lib/kelas-matkul";
import type { MahasiswaRow } from "@/lib/mahasiswa";
import { prisma } from "@/lib/prisma";
import { formatDateWib } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Detail Kelas — Pengelola",
};

interface MahasiswaQueryRow {
  id: string;
  name: string | null;
  nim: string | null;
  email: string;
  is_admin: boolean;
  kelasMatkulAsPj: { id: string }[];
}

interface KelasMatkulQueryRow {
  id: string;
  matkul: { id: string; name: string; code: string | null };
  pj: { id: string; name: string | null; nim: string | null; email: string };
}

export default async function PengelolaKelasDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requirePengelolaKelas(id);

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
      prisma.kelasMatkul.findMany({
        where: { kelas_id: id },
        include: {
          matkul: true,
          pj: { select: { id: true, name: true, nim: true, email: true } },
        },
        orderBy: { matkul: { name: "asc" } },
      }),
      prisma.matkul.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, code: true },
      }),
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

  const mahasiswaIds = new Set(mahasiswa.map((row) => row.id));
  const pjKandidat: PjKandidatOption[] = [
    ...mahasiswa.map((row): PjKandidatOption => ({
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
      <header className="flex flex-col gap-3">
        <Button asChild variant="outline" size="sm" className="w-fit">
          <Link href="/pengelola">
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
