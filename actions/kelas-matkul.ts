"use server";

/**
 * Karsa — actions/kelas-matkul.ts
 * ----------------------------------------------------------------------------
 * Assign matkul ke kelas + kelola PJ (Sub-Fase 2D, PRD §6 "Assign/edit PJ" =
 * admin saja; §7.1 langkah 3).
 *
 * Pola sama dengan `actions/mahasiswa.ts`: `requireAdmin()` → Zod → eksekusi →
 * tangkap error Prisma → `revalidatePath` path KONKRET.
 *
 * Invarian yang dijaga:
 *   · PJ WAJIB mahasiswa kelas tempat matkul itu di-assign (`User.kelas_id`).
 *     PJ = mahasiswa kelasnya adalah asumsi seluruh alur mobile Fase 3
 *     (PJ input poin untuk mahasiswa di kelasnya).
 *   · PJ bukan akun admin (keputusan Sub-Fase 2C, diterapkan juga di sini).
 *   · Satu matkul hanya boleh di-assign SEKALI per kelas — unique
 *     `(kelas_id, matkul_id)` di schema + cek eksplisit supaya pesannya ramah.
 *   · Penugasan dengan poin tercatat TIDAK BOLEH dihapus: `PoinLog.kelas_matkul_id`
 *     memakai `onDelete: Cascade`, jadi tanpa penjagaan ini semua poin
 *     mahasiswa hilang diam-diam.
 *
 * CATATAN: semua id divalidasi dengan `z.string().min(1)` — BUKAN
 * `z.string().cuid()` — karena data seed memakai id custom (`kelas_ti01`,
 * `usr_pj_budi`, `km_algo_ti01`, …). Lihat riwayat bug Sub-Fase 2B.
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionResult } from "@/lib/action-utils";
import { mapPrismaKnownError, zodFirstError } from "@/lib/action-utils";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Skema validasi
// ---------------------------------------------------------------------------

/** Id apa pun dari DB — cukup non-kosong, jangan `.cuid()`. */
const idSchema = z.string().min(1, "Data tidak valid.");

const assignSchema = z.object({
  matkul_id: idSchema,
  pj_id: idSchema,
});

const pjSchema = z.object({ pj_id: idSchema });

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

/**
 * Revalidate path SPESIFIK (pola 2C). `/admin/kelas/{id}` ditulis dengan id
 * konkret — literal `"/admin/kelas/[id]"` tanpa `type: "page"` tidak
 * merevalidasi apa pun (temuan Sub-Fase 2B, dibersihkan terpisah).
 */
function revalidateKelas(kelasId: string): void {
  revalidatePath("/admin/kelas");
  revalidatePath("/admin/dashboard");
  revalidatePath(`/admin/kelas/${kelasId}`);
}

/** Pesan tolak "hapus penugasan yang sudah punya poin" — dipakai dua jalur. */
function pesanPoinTercatat(namaMatkul: string, jumlah: number): string {
  return `Tidak bisa hapus: sudah ada ${jumlah} poin tercatat untuk matkul "${namaMatkul}". Hapus poinnya dulu (Riwayat PJ — Fase 3B) atau biarkan penugasan ini tetap ada.`;
}

/** Kelas tujuan, versi minimal yang dibutuhkan validasi PJ. */
interface KelasRef {
  id: string;
  name: string;
}

interface PjCandidateRow {
  id: string;
  name: string | null;
  email: string;
}

/**
 * Validasi calon PJ (dipakai `assignMatkulToKelas` & `updatePjKelasMatkul`):
 *   1. user ada;
 *   2. bukan admin;
 *   3. `kelas_id` = kelas tempat matkul di-assign (LULUS untuk PJ yang memang
 *      anggota kelas ini — mis. Budi di TI-01 — dan DITOLAK untuk user tanpa
 *      kelas maupun yang masih di kelas lain).
 */
async function resolvePj(
  kelas: KelasRef,
  pjId: string,
): Promise<{ ok: true; user: PjCandidateRow } | { ok: false; error: string }> {
  const user = await prisma.user.findUnique({
    where: { id: pjId },
    select: {
      id: true,
      name: true,
      email: true,
      is_admin: true,
      kelas_id: true,
      kelas: { select: { name: true } },
    },
  });

  if (!user) {
    return { ok: false, error: "User PJ tidak ditemukan. Mungkin sudah dihapus." };
  }

  if (user.is_admin) {
    return { ok: false, error: "User ini admin. Admin tidak bisa menjadi PJ." };
  }

  if (user.kelas_id !== kelas.id) {
    const pesan =
      user.kelas_id === null
        ? `PJ harus mahasiswa kelas ini. User saat ini tidak terdaftar di kelas ${kelas.name}. Tambahkan dulu ke kelas ini di tab Mahasiswa.`
        : `PJ harus mahasiswa kelas ini. User saat ini terdaftar di kelas ${
            user.kelas?.name ?? "lain"
          }. Pindahkan dulu ke kelas ${kelas.name} lewat tab Mahasiswa.`;
    return { ok: false, error: pesan };
  }

  return { ok: true, user: { id: user.id, name: user.name, email: user.email } };
}

// ---------------------------------------------------------------------------
// Action
// ---------------------------------------------------------------------------

/**
 * Assign satu matkul ke kelas beserta PJ-nya.
 * Unique `(kelas_id, matkul_id)` dicek eksplisit (pesan ramah) DAN ditangkap
 * dari `P2002` untuk kasus balapan dua admin.
 */
export async function assignMatkulToKelas(
  kelasId: string,
  input: { matkul_id: string; pj_id: string },
): Promise<ActionResult> {
  await requireAdmin();

  const parsedId = idSchema.safeParse(kelasId);
  if (!parsedId.success) return { ok: false, error: zodFirstError(parsedId.error) };

  const parsed = assignSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: zodFirstError(parsed.error) };

  const { matkul_id, pj_id } = parsed.data;

  const [kelas, matkul] = await Promise.all([
    prisma.kelas.findUnique({
      where: { id: parsedId.data },
      select: { id: true, name: true },
    }),
    prisma.matkul.findUnique({
      where: { id: matkul_id },
      select: { id: true, name: true },
    }),
  ]);

  if (!kelas) {
    return { ok: false, error: "Kelas tidak ditemukan. Mungkin sudah dihapus." };
  }
  if (!matkul) {
    return { ok: false, error: "Matkul tidak ditemukan. Mungkin sudah dihapus." };
  }

  const pj = await resolvePj(kelas, pj_id);
  if (!pj.ok) return { ok: false, error: pj.error };

  const sudahAda = await prisma.kelasMatkul.findFirst({
    where: { kelas_id: kelas.id, matkul_id: matkul.id },
    select: { id: true },
  });
  if (sudahAda) {
    return { ok: false, error: "Matkul ini sudah di-assign ke kelas ini." };
  }

  try {
    await prisma.kelasMatkul.create({
      data: { kelas_id: kelas.id, matkul_id: matkul.id, pj_id: pj.user.id },
    });
  } catch (error) {
    return {
      ok: false,
      error: mapPrismaKnownError(
        error,
        {
          P2002: "Matkul ini sudah di-assign ke kelas ini.",
          P2003: "Matkul atau PJ tidak valid.",
          P2025: "Kelas atau matkul sudah tidak ada.",
        },
        "Gagal meng-assign matkul. Silakan coba lagi.",
      ),
    };
  }

  revalidateKelas(kelas.id);
  return {
    ok: true,
    message: `${matkul.name} berhasil di-assign ke kelas ${kelas.name} dengan PJ ${
      pj.user.name?.trim() || pj.user.email
    }.`,
  };
}

/**
 * Ganti PJ sebuah penugasan matkul.
 * `PoinLog.pj_id` yang sudah tercatat TIDAK ditulis ulang — riwayat tetap
 * mencatat siapa PJ yang benar-benar mencatat poin saat itu (PRD §3/§8).
 */
export async function updatePjKelasMatkul(
  kelasMatkulId: string,
  input: { pj_id: string },
): Promise<ActionResult> {
  await requireAdmin();

  const parsedId = idSchema.safeParse(kelasMatkulId);
  if (!parsedId.success) return { ok: false, error: zodFirstError(parsedId.error) };

  const parsed = pjSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: zodFirstError(parsed.error) };

  const { pj_id } = parsed.data;

  const row = await prisma.kelasMatkul.findUnique({
    where: { id: parsedId.data },
    select: {
      id: true,
      pj_id: true,
      matkul: { select: { name: true } },
      kelas: { select: { id: true, name: true } },
    },
  });

  if (!row) {
    return { ok: false, error: "Penugasan tidak ditemukan. Mungkin sudah dihapus." };
  }

  // Tidak ada perubahan → jangan kirim UPDATE yang sia-sia.
  if (row.pj_id === pj_id) {
    return { ok: true, message: "PJ tidak berubah." };
  }

  const pj = await resolvePj(row.kelas, pj_id);
  if (!pj.ok) return { ok: false, error: pj.error };

  try {
    await prisma.kelasMatkul.update({
      where: { id: row.id },
      data: { pj_id: pj.user.id },
    });
  } catch (error) {
    return {
      ok: false,
      error: mapPrismaKnownError(
        error,
        {
          P2025: "Penugasan tidak ditemukan. Mungkin sudah dihapus.",
          P2003: "PJ tidak valid.",
        },
        "Gagal mengganti PJ. Silakan coba lagi.",
      ),
    };
  }

  revalidateKelas(row.kelas.id);
  return {
    ok: true,
    message: `PJ ${row.matkul.name} di kelas ${row.kelas.name} diganti ke ${
      pj.user.name?.trim() || pj.user.email
    }.`,
  };
}

/**
 * Hapus penugasan matkul dari kelas.
 *
 * DITOLAK bila sudah ada `PoinLog` untuk penugasan ini: FK `PoinLog.kelas_matkul_id`
 * memakai `onDelete: Cascade`, jadi `delete` biasa akan menghapus poin mahasiswa
 * diam-diam — data yang tidak bisa dikembalikan.
 *
 * Penjagaan dua lapis:
 *   1. `count` dulu → pesan yang menyebut jumlah poinnya.
 *   2. `deleteMany` dengan syarat `poinLogs: { none: {} }` → satu statement SQL
 *      (`DELETE … WHERE NOT EXISTS (SELECT … FROM "PoinLog" …)`), sehingga PJ
 *      yang menyimpan poin tepat setelah langkah 1 tetap tidak bisa membuat poin
 *      terhapus. Kalau `count` = 0 di sini berarti poin muncul di sela-sela.
 */
export async function removeKelasMatkul(
  kelasMatkulId: string,
): Promise<ActionResult> {
  await requireAdmin();

  const parsedId = idSchema.safeParse(kelasMatkulId);
  if (!parsedId.success) return { ok: false, error: zodFirstError(parsedId.error) };

  const row = await prisma.kelasMatkul.findUnique({
    where: { id: parsedId.data },
    select: {
      id: true,
      matkul: { select: { name: true } },
      kelas: { select: { id: true, name: true } },
    },
  });

  if (!row) {
    return { ok: false, error: "Penugasan tidak ditemukan. Mungkin sudah dihapus." };
  }

  const poinCount = await prisma.poinLog.count({
    where: { kelas_matkul_id: row.id },
  });
  if (poinCount > 0) {
    return { ok: false, error: pesanPoinTercatat(row.matkul.name, poinCount) };
  }

  try {
    const hasil = await prisma.kelasMatkul.deleteMany({
      where: { id: row.id, poinLogs: { none: {} } },
    });

    if (hasil.count === 0) {
      // Kalah balapan: poin baru tersimpan setelah cek di atas (atau barisnya
      // sudah hilang). Bedakan supaya pesannya tepat.
      const sisa = await prisma.poinLog.count({
        where: { kelas_matkul_id: row.id },
      });
      return {
        ok: false,
        error:
          sisa > 0
            ? pesanPoinTercatat(row.matkul.name, sisa)
            : "Penugasan tidak ditemukan. Mungkin sudah dihapus.",
      };
    }
  } catch (error) {
    return {
      ok: false,
      error: mapPrismaKnownError(
        error,
        {
          P2025: "Penugasan tidak ditemukan. Mungkin sudah dihapus.",
          P2003: "Penugasan masih dirujuk data lain.",
        },
        "Gagal menghapus penugasan matkul. Silakan coba lagi.",
      ),
    };
  }

  revalidateKelas(row.kelas.id);
  return {
    ok: true,
    message: `Penugasan ${row.matkul.name} di kelas ${row.kelas.name} dihapus.`,
  };
}
