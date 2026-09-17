/**
 * Karsa — app/(mobile)/catat-poin/[kelas_matkul_id]/page.tsx
 * ----------------------------------------------------------------------------
 * List mahasiswa satu penugasan matkul (Fase 3A, PRD §7.2): tap `+ Poin` →
 * bottom sheet input.
 *
 * Guard otorisasi di SERVER (PRD §0 aturan 6): `kelas_matkul_id` dari URL
 * TIDAK dipercaya — di-query ulang lalu dibandingkan dengan `session.user.id`.
 * Bukan PJ penugasan ini (atau id tidak ada) → `notFound()`. Sengaja 404,
 * bukan 403, supaya keberadaan id milik PJ lain tidak bisa ditebak.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";

import { getKategoriPoin, getMahasiswaInKelasMatkul } from "@/actions/poin";
import { requireUser } from "@/lib/auth-helpers";
import { MOBILE_HOME } from "@/lib/channel";
import type { MahasiswaItem } from "@/lib/poin";
import { prisma } from "@/lib/prisma";

import { MahasiswaList } from "./_components/mahasiswa-list";

export const metadata: Metadata = {
  title: "Catat poin",
};

export default async function CatatPoinDetailPage({
  params,
}: {
  params: Promise<{ kelas_matkul_id: string }>;
}) {
  const user = await requireUser();
  const { kelas_matkul_id } = await params;

  const kelasMatkul = await prisma.kelasMatkul.findUnique({
    where: { id: kelas_matkul_id },
    select: {
      id: true,
      pj_id: true,
      matkul: { select: { name: true, code: true } },
      kelas: {
        select: {
          name: true,
          prodi: { select: { name: true } },
          semester: { select: { name: true } },
        },
      },
    },
  });

  // Bukan penugasan milik PJ ini → 404.
  if (!kelasMatkul || kelasMatkul.pj_id !== user.id) notFound();

  const [mahasiswa, kategori] = await Promise.all([
    getMahasiswaInKelasMatkul(kelasMatkul.id),
    getKategoriPoin(),
  ]);

  const bisaDicatat: MahasiswaItem[] = mahasiswa.filter(
    (row) => !row.isDiriSendiri,
  );

  return (
    <main className="flex flex-col gap-4 px-4 py-5">
      <Link
        href={MOBILE_HOME}
        className="inline-flex min-h-11 w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft aria-hidden className="size-4" />
        Semua matkul
      </Link>

      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">
          {kelasMatkul.matkul.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          Kelas {kelasMatkul.kelas.name} · {kelasMatkul.kelas.prodi.name} ·{" "}
          {kelasMatkul.kelas.semester.name}
          {kelasMatkul.matkul.code ? ` · ${kelasMatkul.matkul.code}` : ""}
        </p>
        <Link
          href="/riwayat-poin"
          className="mt-1 inline-flex min-h-11 w-fit items-center text-sm font-medium text-primary hover:underline"
        >
          Lihat riwayat →
        </Link>
      </header>

      {bisaDicatat.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-5 text-sm text-muted-foreground">
          Belum ada mahasiswa yang bisa dicatat di kelas ini. Minta admin
          menambahkan mahasiswa lewat tab Mahasiswa di halaman detail kelas.
        </div>
      ) : (
        <MahasiswaList
          kelasMatkulId={kelasMatkul.id}
          mahasiswa={mahasiswa}
          kategori={kategori}
        />
      )}
    </main>
  );
}
