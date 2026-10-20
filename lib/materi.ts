/**
 * Karsa — lib/materi.ts
 * ----------------------------------------------------------------------------
 * Tipe + helper materi publik (kisi-kisi/ringkasan ujian). Tanpa dependensi
 * Prisma/Next, jadi aman diimpor komponen server maupun client.
 *
 * Sumber data ada dua, dan itu disengaja:
 *  · DATABASE — tabel `Materi` (dikelola dari /admin/materi). Jalur utama.
 *  · STATIS   — `MATERI_STATIS` di bawah, jaring pengaman sebelum patch
 *               `prisma/materi.sql` dijalankan. Tanpa ini, deploy yang
 *               mendahului migrasi akan mengosongkan halaman depan & /materi.
 * `lib/materi-query.ts` yang memilih jalurnya.
 *
 * Hierarki tampilan: umum (semua fakultas) → fakultas → prodi.
 */

export type JenisUjian = "UTS" | "UAS" | "KUIS";
export type StatusMateri = "DRAFT" | "TERBIT";

export const JENIS_UJIAN: JenisUjian[] = ["UTS", "UAS", "KUIS"];

export const LABEL_JENIS: Record<JenisUjian, string> = {
  UTS: "UTS",
  UAS: "UAS",
  KUIS: "Kuis",
};

/** Satu materi siap tampil di halaman publik. */
export type MateriPublik = {
  slug: string;
  judul: string;
  matkul: string;
  jenis: JenisUjian;
  pertemuan: string | null;
  subCpmk: string | null;
  bobot: number | null;
  sumber: string | null;
  ringkasan: string;
  bagian: number | null;
  /** ISO `yyyy-mm-dd` — dipakai untuk urutan & tampilan. */
  diperbarui: string;
  /** Nama fakultas, null bila umum. */
  fakultas: string | null;
  /** Nama prodi, null bila umum atau lintas prodi fakultas. */
  prodi: string | null;
  /** URL deck. */
  href: string;
};

export type KelompokProdi = { nama: string; materi: MateriPublik[] };
export type KelompokFakultas = {
  nama: string;
  /** Materi tingkat fakultas (tanpa prodi). */
  lintasProdi: MateriPublik[];
  prodi: KelompokProdi[];
};
export type KelompokMateri = {
  umum: MateriPublik[];
  fakultas: KelompokFakultas[];
};

/**
 * Jaring pengaman pra-migrasi. Entri di sini menyajikan berkas HTML yang ada
 * di `public/materi/` (href berakhiran `.html`), bukan route `/materi/[slug]`.
 * Setelah materinya diimpor lewat /admin/materi, hapus entri ini beserta
 * berkas HTML-nya supaya tidak ada dua sumber untuk satu materi.
 */
export const MATERI_STATIS: MateriPublik[] = [
  {
    slug: "budaya-karakter-tidar-uts",
    judul: "Budaya & Karakter TIDAR",
    matkul: "Budaya & Karakter TIDAR",
    jenis: "UTS",
    pertemuan: "Pertemuan 8",
    subCpmk: "Sub-CPMK 1–2",
    bobot: 20,
    sumber: "Modul Budaya & Karakter TIDAR, hal. 8–80",
    ringkasan:
      "Rangkuman Bab I (pengantar kebudayaan) dan Bab II (unsur-unsur kebudayaan): sembilan karakteristik, tiga wujud, delapan teori, tabel tokoh, plus pola jawaban studi kasus dan kartu hafalan.",
    bagian: 17,
    diperbarui: "2026-10-20",
    fakultas: null,
    prodi: null,
    href: "/materi/budaya-karakter-tidar-uts.html",
  },
];

/** URL deck hasil database. */
export function materiHref(slug: string): string {
  return `/materi/${slug}`;
}

/** Label lingkup untuk kartu. */
export function labelLingkup(materi: MateriPublik): string {
  if (materi.prodi) return materi.prodi;
  if (materi.fakultas) return `${materi.fakultas} · lintas prodi`;
  return "Umum · semua fakultas";
}

/**
 * Kelompokkan materi: umum dulu, lalu fakultas (urut abjad), lalu prodi di
 * dalamnya (urut abjad). Di tiap kelompok, terbaru lebih dulu.
 */
export function kelompokkanMateri(daftar: MateriPublik[]): KelompokMateri {
  const umum: MateriPublik[] = [];
  const petaFakultas = new Map<string, KelompokFakultas>();

  for (const materi of daftar) {
    if (!materi.fakultas) {
      umum.push(materi);
      continue;
    }

    let fakultas = petaFakultas.get(materi.fakultas);
    if (!fakultas) {
      fakultas = { nama: materi.fakultas, lintasProdi: [], prodi: [] };
      petaFakultas.set(materi.fakultas, fakultas);
    }

    if (!materi.prodi) {
      fakultas.lintasProdi.push(materi);
      continue;
    }

    let prodi = fakultas.prodi.find((item) => item.nama === materi.prodi);
    if (!prodi) {
      prodi = { nama: materi.prodi, materi: [] };
      fakultas.prodi.push(prodi);
    }
    prodi.materi.push(materi);
  }

  const urutTerbaru = (a: MateriPublik, b: MateriPublik) =>
    b.diperbarui.localeCompare(a.diperbarui);

  umum.sort(urutTerbaru);

  const fakultas = [...petaFakultas.values()].sort((a, b) =>
    a.nama.localeCompare(b.nama, "id"),
  );
  for (const item of fakultas) {
    item.lintasProdi.sort(urutTerbaru);
    item.prodi.sort((a, b) => a.nama.localeCompare(b.nama, "id"));
    for (const prodi of item.prodi) prodi.materi.sort(urutTerbaru);
  }

  return { umum, fakultas };
}

/** Jumlah total materi di dalam satu pohon kelompok. */
export function jumlahMateri(kelompok: KelompokMateri): number {
  return (
    kelompok.umum.length +
    kelompok.fakultas.reduce(
      (total, fakultas) =>
        total +
        fakultas.lintasProdi.length +
        fakultas.prodi.reduce((sub, prodi) => sub + prodi.materi.length, 0),
      0,
    )
  );
}

/** "2026-10-20" → "20 Okt 2026" (deterministik untuk server & client). */
export function formatTanggalMateri(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/** Slug dari judul: huruf kecil, tanpa diakritik, pemisah "-". */
export function buatSlug(judul: string): string {
  return judul
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
