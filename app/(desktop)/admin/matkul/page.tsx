/**
 * Karsa — app/(desktop)/admin/matkul/page.tsx
 * ----------------------------------------------------------------------------
 * Halaman master Matkul (Sub-Fase 2A, PRD §7.1 langkah 2).
 * Server component: `requireAdmin()` + query di server; interaksi tabel &
 * dialog dirender `MatkulManager` (client).
 */
import type { Metadata } from "next";

import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

import { AdminNav } from "@/components/admin-nav";
import { MatkulManager } from "./_components/matkul-manager";

export const metadata: Metadata = {
  title: "Kelola Matkul",
};

export default async function AdminMatkulPage() {
  await requireAdmin();

  const matkuls = await prisma.matkul.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <AdminNav />

      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Mata Kuliah</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Master mata kuliah lintas kelas. Nama boleh sama, kode harus unik
          (kode opsional).
        </p>
      </header>

      <MatkulManager matkuls={matkuls} />
    </main>
  );
}
