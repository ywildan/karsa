import type { Metadata } from "next";

import { AiUsageView } from "@/components/admin/ai-usage-view";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Penggunaan AI",
};

export default async function AiUsagePage() {
  await requireAdmin();

  const prodiOptions = await prisma.prodi
    .findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } })
    .catch(() => []);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold">Penggunaan AI</h1>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
          Analitik pemakaian Teman Baca Karsa Lib per mahasiswa: chat artikel,
          search mode, dan pembuatan ringkasan baru. Biaya adalah estimasi dari
          token dan snapshot harga model saat request terjadi, bukan tagihan
          final dari provider. Hanya admin yang dapat melihat halaman ini.
        </p>
      </header>

      <AiUsageView prodiOptions={prodiOptions} />
    </main>
  );
}
