/**
 * Karsa — app/(desktop)/admin/rekap/page.tsx
 * ----------------------------------------------------------------------------
 * Halaman rekap poin per kelas. Otorisasi dan opsi kelas aktif dimuat di
 * server; tabel serta export ditangani RekapView di client.
 */
import type { Metadata } from "next";

import { getKelasOptionsForRekap } from "@/actions/rekap";
import { AdminNav } from "@/components/admin-nav";
import { RekapView } from "@/components/admin/rekap-view";
import { requireAdmin } from "@/lib/auth-helpers";

export const metadata: Metadata = {
  title: "Rekap",
};

export default async function AdminRekapPage() {
  await requireAdmin();

  const kelasOptions = await getKelasOptionsForRekap();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <AdminNav />

      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          Rekap poin kelas
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Lihat total poin keaktifan mahasiswa per mata kuliah dan unduh
          rekapnya dalam Excel.
        </p>
      </header>

      <RekapView kelasOptions={kelasOptions} />
    </main>
  );
}
