/**
 * Karsa — app/(desktop)/admin/materi/page.tsx
 * ----------------------------------------------------------------------------
 * Halaman kelola materi publik (/materi). Server component: `requireAdmin()`
 * + query di server; tabel, dialog, dan unggahan berkas ada di
 * `MateriManager` (client).
 *
 * Bila tabel `Materi` belum ada (patch `prisma/materi.sql` belum dijalankan),
 * halaman tetap terbuka dan menampilkan instruksi — bukan melempar error 500,
 * karena admin tetap harus bisa masuk ke ruang admin.
 */
import type { Metadata } from "next";

import { requireAdmin } from "@/lib/auth-helpers";
import type { JenisUjian, StatusMateri } from "@/lib/materi";
import { prisma } from "@/lib/prisma";

import {
  MateriManager,
  type FakultasPilihan,
  type MateriAdmin,
} from "./_components/materi-manager";

export const metadata: Metadata = {
  title: "Kelola Materi",
};

export default async function AdminMateriPage() {
  await requireAdmin();

  let daftar: MateriAdmin[] = [];
  let fakultas: FakultasPilihan[] = [];
  let galat: string | null = null;

  try {
    const [rows, faculties] = await Promise.all([
      prisma.materi.findMany({
        orderBy: { updated_at: "desc" },
        select: {
          id: true,
          slug: true,
          judul: true,
          matkul: true,
          jenis: true,
          pertemuan: true,
          sub_cpmk: true,
          bobot: true,
          sumber: true,
          ringkasan: true,
          bagian: true,
          status: true,
          updated_at: true,
          faculty_id: true,
          prodi_id: true,
          faculty: { select: { name: true } },
          prodi: { select: { name: true } },
        },
      }),
      prisma.faculty.findMany({
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          prodis: { orderBy: { name: "asc" }, select: { id: true, name: true } },
        },
      }),
    ]);

    daftar = rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      judul: row.judul,
      matkul: row.matkul,
      jenis: row.jenis as JenisUjian,
      pertemuan: row.pertemuan,
      subCpmk: row.sub_cpmk,
      bobot: row.bobot,
      sumber: row.sumber,
      ringkasan: row.ringkasan,
      bagian: row.bagian,
      status: row.status as StatusMateri,
      diperbarui: row.updated_at.toISOString().slice(0, 10),
      facultyId: row.faculty_id,
      prodiId: row.prodi_id,
      fakultas: row.faculty?.name ?? null,
      prodi: row.prodi?.name ?? null,
    }));

    fakultas = faculties.map((faculty) => ({
      id: faculty.id,
      name: faculty.name,
      prodi: faculty.prodis,
    }));
  } catch (error) {
    console.error("[admin/materi] gagal memuat materi", error);
    galat =
      "Tabel Materi belum siap di database. Jalankan prisma/materi.sql di Supabase SQL Editor, lalu muat ulang halaman ini.";
  }

  // Badge antrean di tombol "Permohonan". Kalau tabel permohonan belum ada,
  // halaman materi tetap jalan — tombolnya tampil tanpa angka.
  let jumlahPermohonan = 0;
  try {
    jumlahPermohonan = await prisma.materiPermohonan.count({
      where: { status: "MENUNGGU" },
    });
  } catch {
    jumlahPermohonan = 0;
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
          Konten publik
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Materi</h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
          Kisi-kisi dan ringkasan ujian yang tampil di{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">/materi</code>,
          terbuka tanpa login. Atur lingkupnya per fakultas dan per program
          studi; yang berstatus draf tidak tampil di halaman publik.
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
        <MateriManager
          daftar={daftar}
          fakultas={fakultas}
          jumlahPermohonan={jumlahPermohonan}
        />
      )}
    </main>
  );
}
