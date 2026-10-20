/**
 * Karsa — lib/materi-query.ts
 * ----------------------------------------------------------------------------
 * Baca materi dari database untuk halaman publik. Server-only.
 *
 * Kenapa ada fallback: tabel `Materi` baru ada setelah `prisma/materi.sql`
 * dijalankan. Bila deploy mendahuluinya, query akan gagal; alih-alih
 * mengosongkan halaman depan, kita pakai `MATERI_STATIS` dan catat error.
 * Hapus fallback ini (dan `MATERI_STATIS`) setelah migrasi dijalankan di
 * semua environment.
 */
import "server-only";

import { prisma } from "@/lib/prisma";
import {
  MATERI_STATIS,
  materiHref,
  type JenisUjian,
  type MateriPublik,
} from "@/lib/materi";

const SELECT_PUBLIK = {
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
  updated_at: true,
  faculty: { select: { name: true } },
  prodi: { select: { name: true } },
} as const;

type BarisMateri = {
  slug: string;
  judul: string;
  matkul: string;
  jenis: string;
  pertemuan: string | null;
  sub_cpmk: string | null;
  bobot: number | null;
  sumber: string | null;
  ringkasan: string;
  bagian: number | null;
  updated_at: Date;
  faculty: { name: string } | null;
  prodi: { name: string } | null;
};

function kePublik(baris: BarisMateri): MateriPublik {
  return {
    slug: baris.slug,
    judul: baris.judul,
    matkul: baris.matkul,
    jenis: baris.jenis as JenisUjian,
    pertemuan: baris.pertemuan,
    subCpmk: baris.sub_cpmk,
    bobot: baris.bobot,
    sumber: baris.sumber,
    ringkasan: baris.ringkasan,
    bagian: baris.bagian,
    diperbarui: baris.updated_at.toISOString().slice(0, 10),
    fakultas: baris.faculty?.name ?? null,
    prodi: baris.prodi?.name ?? null,
    href: materiHref(baris.slug),
  };
}

export type HasilMateri = {
  daftar: MateriPublik[];
  /** "database" bila tabel sudah ada; "statis" saat fallback dipakai. */
  sumber: "database" | "statis";
};

/** Semua materi berstatus TERBIT, terbaru lebih dulu. */
export async function getMateriTerbit(): Promise<HasilMateri> {
  try {
    const rows = await prisma.materi.findMany({
      where: { status: "TERBIT" },
      orderBy: { updated_at: "desc" },
      select: SELECT_PUBLIK,
    });

    return { daftar: rows.map(kePublik), sumber: "database" };
  } catch (error) {
    console.error(
      "[materi] tabel Materi belum siap — memakai daftar statis. Jalankan prisma/materi.sql.",
      error,
    );
    return { daftar: MATERI_STATIS, sumber: "statis" };
  }
}

/** Materi terbaru untuk hero halaman depan; null bila belum ada. */
export async function getMateriUnggulan(): Promise<MateriPublik | null> {
  const { daftar } = await getMateriTerbit();
  return daftar[0] ?? null;
}

/** Deck mentah untuk `/materi/[slug]`. Hanya yang sudah TERBIT. */
export async function getDeckMateri(
  slug: string,
): Promise<{ judul: string; matkul: string; html: string } | null> {
  try {
    const row = await prisma.materi.findFirst({
      where: { slug, status: "TERBIT" },
      select: { judul: true, matkul: true, html: true },
    });
    if (row) return row;
  } catch (error) {
    console.error("[materi] gagal membaca deck dari database", error);
  }

  // Jaring pengaman sebelum `prisma/materi.sql` dijalankan: `/materi` sudah
  // menampilkan entri dari MATERI_STATIS, jadi detailnya tidak boleh 404.
  // Sengaja DIBATASI pada slug yang ada di MATERI_STATIS — deck yang dihapus
  // admin lewat /admin/materi tetap hilang, bukan hidup lagi dari berkas.
  const statis = MATERI_STATIS.find((materi) => materi.slug === slug);
  if (!statis || !/^[a-z0-9-]{3,80}$/.test(slug)) return null;

  try {
    const { readFile } = await import("node:fs/promises");
    const path = await import("node:path");
    const html = await readFile(
      path.join(process.cwd(), "public", "materi", `${slug}.html`),
      "utf8",
    );
    return { judul: statis.judul, matkul: statis.matkul, html };
  } catch {
    return null;
  }
}

/** Daftar untuk sitemap: slug + tanggal per materi terbit. */
export async function getMateriUntukSitemap(): Promise<
  { slug: string; diperbarui: string; statis: boolean }[]
> {
  const { daftar, sumber } = await getMateriTerbit();

  return daftar.map((materi) => ({
    slug: materi.slug,
    diperbarui: materi.diperbarui,
    // Entri statis disajikan sebagai berkas .html, bukan route dinamis.
    statis: sumber === "statis" && materi.href.endsWith(".html"),
  }));
}
