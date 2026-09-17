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

import { AdminNav } from "@/components/admin-nav";
import { ProdiManager } from "./_components/prodi-manager";

export const metadata: Metadata = {
  title: "Kelola Prodi",
};

export default async function AdminProdiPage() {
  await requireAdmin();

  const prodis = await prisma.prodi.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <AdminNav />

      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          Program Studi
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Master program studi. Prodi yang masih memiliki kelas tidak bisa
          dihapus.
        </p>
      </header>

      <ProdiManager prodis={prodis} />
    </main>
  );
}
