/**
 * Karsa — app/(desktop)/admin/kelas/page.tsx
 * ----------------------------------------------------------------------------
 * Halaman master Kelas (Sub-Fase 2B, PRD §7.1 langkah 2).
 * Server component: `requireAdmin()` + query paralel; tabel & dialog dirender
 * `KelasManager` (client).
 */
import type { Metadata } from "next";

import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

import { AdminNav } from "@/components/admin-nav";
import { KelasManager } from "./_components/kelas-manager";

export const metadata: Metadata = {
  title: "Kelola Kelas",
};

export default async function AdminKelasPage() {
  await requireAdmin();

  const [kelas, prodis, semesters] = await Promise.all([
    prisma.kelas.findMany({
      include: {
        prodi: true,
        semester: true,
        _count: { select: { users: true, kelasMatkul: true } },
      },
      orderBy: [{ semester: { start_date: "desc" } }, { name: "asc" }],
    }),
    prisma.prodi.findMany({ orderBy: { name: "asc" } }),
    prisma.semester.findMany({ orderBy: { start_date: "desc" } }),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <AdminNav />

      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Kelas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Rombongan belajar per prodi & semester. Satu nama unik per kombinasi
          prodi + semester.
        </p>
      </header>

      <KelasManager kelas={kelas} prodis={prodis} semesters={semesters} />
    </main>
  );
}
