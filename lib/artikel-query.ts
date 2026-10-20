/**
 * SiKarsa — lib/artikel-query.ts
 * ----------------------------------------------------------------------------
 * Membaca artikel Karsa Lib yang sudah terbit untuk tab "Artikel" di /materi.
 *
 * Sengaja hanya mengambil judul + lingkup (fakultas, prodi), bukan isi artikel:
 *   - isi artikel hanya dibaca di Karsa mobile, bukan di web publik;
 *   - daftar 300 judul tetap ringan di payload halaman.
 *
 * Artikel Karsa Lib selalu milik satu prodi (`LibArticle.prodi_id`), tidak
 * punya tingkat fakultas maupun "umum" seperti materi.
 */
import { prisma } from "@/lib/prisma";

export type ArtikelJudul = {
  id: string;
  judul: string;
  fakultas: string;
  prodi: string;
};

/** Batas aman: judul saja, jadi 300 baris masih kecil di HTML. */
const BATAS = 300;

export async function getJudulArtikelTerbit(): Promise<ArtikelJudul[]> {
  try {
    const baris = await prisma.libArticle.findMany({
      where: { status: "PUBLISHED", archived_at: null },
      orderBy: [{ published_at: "desc" }, { created_at: "desc" }],
      take: BATAS,
      select: {
        id: true,
        title: true,
        prodi: {
          select: {
            name: true,
            faculty: { select: { name: true } },
          },
        },
      },
    });

    return baris.map((artikel) => ({
      id: artikel.id,
      judul: artikel.title,
      fakultas: artikel.prodi.faculty?.name ?? "Tanpa fakultas",
      prodi: artikel.prodi.name,
    }));
  } catch {
    /* Tabel/kolom Lib belum ada di lingkungan ini (mis. DB lokal baru) —
       halaman /materi tetap tampil dengan tab Artikel kosong, bukan 500. */
    return [];
  }
}

export type KelompokArtikel = {
  nama: string;
  prodi: { nama: string; artikel: ArtikelJudul[] }[];
  jumlah: number;
};

/** Fakultas → prodi → artikel, sudah terurut menurut nama. */
export function kelompokkanArtikel(daftar: ArtikelJudul[]): KelompokArtikel[] {
  const peta = new Map<string, Map<string, ArtikelJudul[]>>();

  for (const artikel of daftar) {
    if (!peta.has(artikel.fakultas)) peta.set(artikel.fakultas, new Map());
    const perProdi = peta.get(artikel.fakultas)!;
    if (!perProdi.has(artikel.prodi)) perProdi.set(artikel.prodi, []);
    perProdi.get(artikel.prodi)!.push(artikel);
  }

  return [...peta.entries()]
    .map(([nama, prodiMap]) => {
      const prodi = [...prodiMap.entries()]
        .map(([namaProdi, artikel]) => ({
          nama: namaProdi,
          artikel: [...artikel].sort((a, b) => a.judul.localeCompare(b.judul, "id")),
        }))
        .sort((a, b) => a.nama.localeCompare(b.nama, "id"));
      return {
        nama,
        prodi,
        jumlah: prodi.reduce((total, item) => total + item.artikel.length, 0),
      };
    })
    .sort((a, b) => a.nama.localeCompare(b.nama, "id"));
}
