/**
 * Karsa — app/(desktop)/admin/materi/permohonan/page.tsx
 * ----------------------------------------------------------------------------
 * Antrean permohonan materi dari publik (/materi/kirim). Server component:
 * `requireAdmin()` + query; tabel, filter, dan dialog tinjauan ada di
 * `PermohonanManager` (client).
 *
 * Bila tabel `MateriPermohonan` belum ada (prisma/permohonan.sql belum
 * dijalankan), halaman tetap terbuka dengan instruksi — bukan 500.
 */
import type { Metadata } from "next";
import Link from "next/link";

import { requireAdmin } from "@/lib/auth-helpers";
import type { PermohonanAdmin, StatusPermohonan } from "@/lib/permohonan";
import { prisma } from "@/lib/prisma";

import { PermohonanManager } from "./_components/permohonan-manager";

export const metadata: Metadata = {
  title: "Permohonan materi",
};

export default async function AdminPermohonanPage() {
  await requireAdmin();

  let daftar: PermohonanAdmin[] = [];
  let galat: string | null = null;

  try {
    const rows = await prisma.materiPermohonan.findMany({
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        nama: true,
        email: true,
        fakultas: true,
        prodi: true,
        matkul: true,
        jenis: true,
        pertemuan: true,
        ringkasan: true,
        tautan: true,
        izin: true,
        status: true,
        catatan: true,
        created_at: true,
        reviewed_at: true,
        reviewed_by: true,
      },
    });

    daftar = rows.map((row) => ({
      id: row.id,
      nama: row.nama,
      email: row.email,
      fakultas: row.fakultas,
      prodi: row.prodi,
      matkul: row.matkul,
      jenis: row.jenis,
      pertemuan: row.pertemuan,
      ringkasan: row.ringkasan,
      tautan: row.tautan,
      izin: row.izin,
      status: row.status as StatusPermohonan,
      catatan: row.catatan,
      createdAt: row.created_at.toISOString(),
      reviewedAt: row.reviewed_at?.toISOString() ?? null,
      reviewedBy: row.reviewed_by,
    }));
  } catch (error) {
    console.error("[admin/permohonan] gagal memuat", error);
    galat =
      "Tabel MateriPermohonan belum siap di database. Jalankan prisma/permohonan.sql di Supabase SQL Editor, lalu muat ulang halaman ini.";
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <header>
        <Link
          href="/admin/materi"
          className="text-sm font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          ← Kelola materi
        </Link>
        <p className="mt-4 text-xs font-bold uppercase tracking-[0.18em] text-primary">
          Konten publik
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Permohonan materi</h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
          Kiriman dari halaman{" "}
          <Link href="/materi/kirim" className="font-semibold text-primary underline-offset-4 hover:underline">
            /materi/kirim
          </Link>
          . Permohonan tidak pernah otomatis tayang: tinjau isinya, lalu susun
          deck-nya lewat menu Kelola materi.
        </p>
      </header>

      {galat ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm leading-6 text-destructive"
        >
          {galat}
        </div>
      ) : (
        <PermohonanManager daftar={daftar} />
      )}
    </main>
  );
}
