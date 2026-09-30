/**
 * Karsa — app/(desktop)/admin/prodi/page.tsx
 * ----------------------------------------------------------------------------
 * Halaman master Prodi (Sub-Fase 2A, PRD §7.1 langkah 2).
 * Server component: `requireAdmin()` + query di server; interaksi tabel &
 * dialog dirender `ProdiManager` (client).
 */
import type { Metadata } from "next";

import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

import { ProdiManager } from "./_components/prodi-manager";

export const metadata: Metadata = {
  title: "Kelola Prodi",
};

export default async function AdminProdiPage() {
  await requireAdmin();

  const [prodis, faculties] = await Promise.all([prisma.prodi.findMany({
    orderBy: { name: "asc" },
    include: { faculty: { select: { id: true, name: true } } },
  }), prisma.faculty.findMany({ orderBy: { name: "asc" } })]);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">

      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          Program Studi
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Setiap prodi harus terhubung ke fakultas. Lengkapi relasi prodi lama sebelum prodi digunakan pada setup Karsa Lib.
        </p>
      </header>

      <ProdiManager prodis={prodis} faculties={faculties} />
    </main>
  );
}
