"use server";

/**
 * Karsa — actions/poin.ts
 * ----------------------------------------------------------------------------
 * Input poin PJ (Fase 3A, PRD §7.2 + §8 + §14 Fase 3A).
 *
 * Pola mengikuti `actions/mahasiswa.ts` / `actions/kelas-matkul.ts`:
 * guard di server → Zod → eksekusi → tangkap error Prisma → `revalidatePath`
 * dengan path KONKRET.
 *
 * PENTING — setiap ekspor di file `"use server"` adalah endpoint publik yang
 * bisa dipanggil dari devtools. Karena itu otorisasi TIDAK boleh hanya di UI:
 * tiap fungsi (termasuk yang read-only) memanggil `requireUser()` dan
 * memverifikasi ulang `KelasMatkul.pj_id === session.user.id` dari DATABASE —
 * `kelas_matkul_id` kiriman client tidak pernah dipercaya begitu saja (risiko
 * IDOR, PRD §14 "Risiko").
 *
 * Aturan yang dijaga (PRD §8):
 *   · PJ hanya mencatat untuk mahasiswa di kelas milik penugasan-nya.
 *   · PJ tidak bisa memberi poin untuk dirinya sendiri.
 *   · `poin` integer 1–4 (Zod + CHECK constraint di DB sebagai lapis terakhir).
 *   · `kategori_id` wajib ada di `KategoriPoin`.
 *   · `catatan` opsional, maksimal 500 karakter.
 *   · `pj_id` selalu = session user, tidak pernah dari input.
 *   · Anti double-submit: payload identik ≤3 detik → di-skip (bukan error).
 *
 * CATATAN: semua id divalidasi dengan `z.string().min(1)` — BUKAN
 * `z.string().cuid()` — karena data seed memakai id custom (`usr_siti`,
 * `km_algo_ti01`, …). Lihat riwayat bug Sub-Fase 2B.
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionResult } from "@/lib/action-utils";
import { mapPrismaKnownError, zodFirstError } from "@/lib/action-utils";
import { requireUser } from "@/lib/auth-helpers";
import {
  CATATAN_MAX,
  DOUBLE_SUBMIT_WINDOW_MS,
  mahasiswaLabel,
  type KategoriItem,
  type MahasiswaItem,
  type MatkulFilterOption,
  type MatkulPjCard,
  type PoinInput,
  type RiwayatPoinRow,
} from "@/lib/poin";
import { prisma } from "@/lib/prisma";
import { POIN_MAX, POIN_MIN } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Skema validasi
// ---------------------------------------------------------------------------

/** Id apa pun dari DB — cukup non-kosong, jangan `.cuid()`. */
const idSchema = z.string().min(1, "Data tidak valid.");

const createPoinSchema = z.object({
  kelas_matkul_id: idSchema,
  mahasiswa_id: idSchema,
  kategori_id: idSchema,
  poin: z.coerce
    .number({ invalid_type_error: "Poin tidak valid." })
    .int("Poin harus bilangan bulat.")
    .min(POIN_MIN, `Poin minimal ${POIN_MIN}.`)
    .max(POIN_MAX, `Poin maksimal ${POIN_MAX}.`),
  catatan: z
    .string()
    .trim()
    .max(CATATAN_MAX, `Catatan maksimal ${CATATAN_MAX} karakter.`)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
});

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

/**
 * Revalidate path SPESIFIK (pola 2C). `/catat-poin/{id}` ditulis dengan id
 * konkret — literal `"/catat-poin/[kelas_matkul_id]"` tanpa `type: "page"`
 * tidak merevalidasi apa pun (temuan Sub-Fase 2B).
 */
function revalidateCatatPoin(kelasMatkulId: string): void {
  revalidatePath("/catat-poin");
  revalidatePath(`/catat-poin/${kelasMatkulId}`);
}

/** Penugasan matkul + cek bahwa user ini PJ-nya. `null` = bukan haknya. */
async function resolveKelasMatkulAsPj(kelasMatkulId: string, pjId: string) {
  const kelasMatkul = await prisma.kelasMatkul.findUnique({
    where: { id: kelasMatkulId },
    select: {
      id: true,
      kelas_id: true,
      pj_id: true,
      matkul: { select: { id: true, name: true, code: true } },
    },
  });

  if (!kelasMatkul || kelasMatkul.pj_id !== pjId) return null;
  return kelasMatkul;
}

// ---------------------------------------------------------------------------
// Query (read-only, tetap ber-guard)
// ---------------------------------------------------------------------------

/**
 * Semua `KelasMatkul` yang dipegang user login sebagai PJ — termasuk bila ia
 * admin (PRD §6: admin boleh merangkap PJ).
 *
 * Jumlah mahasiswa dihitung dengan SATU `groupBy` untuk semua kelas (bukan
 * satu query per kartu) supaya tidak N+1.
 */
export async function getMatkulsAsPj(): Promise<MatkulPjCard[]> {
  const user = await requireUser();

  const rows = await prisma.kelasMatkul.findMany({
    where: { pj_id: user.id },
    include: {
      matkul: { select: { id: true, name: true, code: true } },
      kelas: {
        select: {
          id: true,
          name: true,
          prodi: { select: { name: true } },
          semester: { select: { name: true } },
        },
      },
    },
    orderBy: { matkul: { name: "asc" } },
  });

  if (rows.length === 0) return [];

  const kelasIds = [...new Set(rows.map((row) => row.kelas_id))];
  const hitungan = await prisma.user.groupBy({
    by: ["kelas_id"],
    where: { kelas_id: { in: kelasIds } },
    _count: { _all: true },
  });
  const perKelas = new Map<string, number>(
    hitungan.map((item): [string, number] => [
      item.kelas_id ?? "",
      item._count._all,
    ]),
  );

  return rows.map((row) => ({
    id: row.id,
    matkulName: row.matkul.name,
    matkulCode: row.matkul.code,
    kelasName: row.kelas.name,
    prodiName: row.kelas.prodi.name,
    semesterName: row.kelas.semester.name,
    jumlahMahasiswa: perKelas.get(row.kelas_id) ?? 0,
  }));
}

/**
 * Mahasiswa di kelas milik satu penugasan matkul.
 *
 * Guard: hanya PJ dari `kelas_matkul` itu yang boleh melihat daftarnya.
 * Bukan haknya / id tidak ada → array kosong (bukan bocor data, bukan 500).
 * Semua user yang menjadi anggota kelas penugasan dapat muncul, termasuk admin
 * yang merangkap mahasiswa.
 */
export async function getMahasiswaInKelasMatkul(
  kelasMatkulId: string,
): Promise<MahasiswaItem[]> {
  const user = await requireUser();

  const parsed = idSchema.safeParse(kelasMatkulId);
  if (!parsed.success) return [];

  const kelasMatkul = await resolveKelasMatkulAsPj(parsed.data, user.id);
  if (!kelasMatkul) return [];

  const rows = await prisma.user.findMany({
    where: { kelas_id: kelasMatkul.kelas_id },
    orderBy: { name: "asc" },
    select: { id: true, name: true, nim: true },
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    nim: row.nim,
    isDiriSendiri: row.id === user.id,
  }));
}

/** Kategori poin dari master (Bertanya · Menjawab · Presentasi · Lainnya). */
export async function getKategoriPoin(): Promise<KategoriItem[]> {
  await requireUser();

  return prisma.kategoriPoin.findMany({
    orderBy: { created_at: "asc" },
    select: { id: true, name: true },
  });
}

/**
 * Maksimal 100 input poin milik PJ yang sedang login, terbaru lebih dahulu.
 * Riwayat selalu diikat ke `pj_id` dari session, bukan parameter client.
 */
export async function getPoinLogsByPj(): Promise<RiwayatPoinRow[]> {
  const user = await requireUser();

  const rows = await prisma.poinLog.findMany({
    where: { pj_id: user.id },
    include: {
      mahasiswa: { select: { name: true, nim: true } },
      kategori: { select: { name: true } },
      kelasMatkul: {
        include: {
          matkul: { select: { name: true, code: true } },
          kelas: {
            include: {
              prodi: { select: { name: true } },
              semester: { select: { name: true } },
            },
          },
        },
      },
    },
    orderBy: { created_at: "desc" },
    take: 100,
  });

  return rows.map((row) => ({
    id: row.id,
    kelas_matkul_id: row.kelas_matkul_id,
    poin: row.poin,
    catatan: row.catatan,
    created_at: row.created_at,
    mahasiswa: row.mahasiswa,
    kategori: row.kategori,
    matkul: row.kelasMatkul.matkul,
    kelas: { name: row.kelasMatkul.kelas.name },
    prodi: row.kelasMatkul.kelas.prodi,
    semester: row.kelasMatkul.kelas.semester,
  }));
}

/**
 * Opsi filter hanya untuk penugasan yang sedang/ pernah dikelola PJ dan sudah
 * memiliki poin. Id sengaja memakai `KelasMatkul.id`: satu matkul bisa muncul
 * pada lebih dari satu kelas.
 */
export async function getMatkulsWithPoinAsPj(): Promise<MatkulFilterOption[]> {
  const user = await requireUser();

  const rows = await prisma.kelasMatkul.findMany({
    where: { pj_id: user.id, poinLogs: { some: {} } },
    select: {
      id: true,
      matkul: { select: { name: true } },
      kelas: { select: { name: true } },
    },
    orderBy: [{ matkul: { name: "asc" } }, { kelas: { name: "asc" } }],
  });

  return rows.map((row) => ({
    id: row.id,
    label: `${row.matkul.name} · ${row.kelas.name}`,
  }));
}

// ---------------------------------------------------------------------------
// Mutasi
// ---------------------------------------------------------------------------

/**
 * Catat satu poin. Semua validasi PRD §8 dijalankan di server; `pj_id`
 * diambil dari session, bukan dari input.
 */
export async function createPoinLog(input: PoinInput): Promise<ActionResult> {
  const user = await requireUser();

  const parsed = createPoinSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: zodFirstError(parsed.error) };
  }

  const { kelas_matkul_id, mahasiswa_id, kategori_id, poin, catatan } =
    parsed.data;

  // 1. Re-query penugasan dari DB + pastikan user ini PJ-nya (anti-IDOR).
  const kelasMatkul = await resolveKelasMatkulAsPj(kelas_matkul_id, user.id);
  if (!kelasMatkul) {
    return {
      ok: false,
      error: "Kamu bukan PJ untuk matkul ini. Muat ulang halaman.",
    };
  }

  // 2. PJ tidak boleh menilai dirinya sendiri (PRD §13.2).
  if (mahasiswa_id === user.id) {
    return {
      ok: false,
      error: "PJ tidak bisa memberi poin untuk dirinya sendiri.",
    };
  }

  // 3. Mahasiswa harus anggota kelas milik penugasan ini (bukan kelas lain).
  const mahasiswa = await prisma.user.findFirst({
    where: { id: mahasiswa_id, kelas_id: kelasMatkul.kelas_id },
    select: { id: true, name: true },
  });
  if (!mahasiswa) {
    return {
      ok: false,
      error: "Mahasiswa ini tidak terdaftar di kelas matkul tersebut.",
    };
  }

  // 4. Kategori wajib ada di master.
  const kategori = await prisma.kategoriPoin.findUnique({
    where: { id: kategori_id },
    select: { id: true, name: true },
  });
  if (!kategori) {
    return { ok: false, error: "Kategori poin tidak dikenali." };
  }

  // 5. Anti double-submit (PRD §8): payload identik ≤3 detik → skip.
  const duplikat = await prisma.poinLog.findFirst({
    where: {
      kelas_matkul_id: kelasMatkul.id,
      mahasiswa_id,
      pj_id: user.id,
      kategori_id,
      poin,
      created_at: { gte: new Date(Date.now() - DOUBLE_SUBMIT_WINDOW_MS) },
    },
    select: { id: true },
  });
  if (duplikat) {
    return {
      ok: true,
      message: "Poin yang sama baru saja tercatat — tidak disimpan dua kali.",
    };
  }

  try {
    await prisma.poinLog.create({
      data: {
        kelas_matkul_id: kelasMatkul.id,
        mahasiswa_id,
        pj_id: user.id,
        kategori_id,
        poin,
        catatan,
      },
    });
  } catch (error) {
    return {
      ok: false,
      error: mapPrismaKnownError(
        error,
        {
          // CHECK constraint `poin` 1–4 di DB (prisma/init.sql) — lapis terakhir
          // kalau validasi Zod entah bagaimana terlewati.
          P2004: `Poin harus ${POIN_MIN}–${POIN_MAX}.`,
          P2003: "Data terkait sudah berubah. Muat ulang halaman lalu coba lagi.",
          P2025: "Data terkait tidak ditemukan. Muat ulang halaman.",
        },
        "Gagal menyimpan poin. Silakan coba lagi.",
      ),
    };
  }

  revalidateCatatPoin(kelasMatkul.id);

  return {
    ok: true,
    message: `${poin} poin ${kategori.name.toLowerCase()} untuk ${mahasiswaLabel(
      mahasiswa,
    )} tercatat.`,
  };
}

/** Hapus permanen satu input poin milik PJ pembuatnya (PRD §8). */
export async function deletePoinLog(id: string): Promise<ActionResult> {
  const user = await requireUser();

  const parsed = idSchema.safeParse(id);
  if (!parsed.success) {
    return { ok: false, error: zodFirstError(parsed.error) };
  }

  // Re-query dari DB: id dari client tidak membuktikan kepemilikan record.
  const poinLog = await prisma.poinLog.findUnique({
    where: { id: parsed.data },
    select: { id: true, pj_id: true },
  });

  if (!poinLog) {
    return { ok: false, error: "Poin tidak ditemukan. Mungkin sudah dihapus." };
  }
  if (poinLog.pj_id !== user.id) {
    return { ok: false, error: "Kamu tidak berhak hapus poin ini." };
  }

  try {
    await prisma.poinLog.delete({ where: { id: poinLog.id } });
  } catch (error) {
    return {
      ok: false,
      error: mapPrismaKnownError(
        error,
        { P2025: "Poin tidak ditemukan. Mungkin sudah dihapus." },
        "Gagal menghapus poin. Silakan coba lagi.",
      ),
    };
  }

  revalidatePath("/riwayat-poin");
  revalidatePath("/catat-poin");
  revalidatePath("/dashboard");

  return { ok: true, message: "Poin berhasil dihapus." };
}
