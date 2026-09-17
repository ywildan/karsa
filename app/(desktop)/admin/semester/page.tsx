/**
 * Karsa — app/(desktop)/admin/semester/page.tsx
 * ----------------------------------------------------------------------------
 * Halaman master Semester (Sub-Fase 2A, PRD §7.1 langkah 2).
 * Server component: otorisasi (`requireAdmin()`) + query data di server,
 * interaksi tabel & dialog dirender `SemesterManager` (client).
 */
import type { Metadata } from "next";

import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

import { AdminNav } from "@/components/admin-nav";
import { SemesterManager } from "./_components/semester-manager";

export const metadata: Metadata = {
  title: "Kelola Semester",
};

export default async function AdminSemesterPage() {
  await requireAdmin();

  const semesters = await prisma.semester.findMany({
    orderBy: { start_date: "desc" },
  });

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <AdminNav />

      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Semester</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Periode akademik. Hanya satu semester yang aktif pada satu waktu —
          rapor dan leaderboard mengikuti semester aktif.
        </p>
      </header>

      <SemesterManager semesters={semesters} />
    </main>
  );
}
