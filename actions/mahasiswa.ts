"use server";

/**
 * Karsa — actions/mahasiswa.ts
 * ----------------------------------------------------------------------------
 * Kelola anggota kelas (Sub-Fase 2C, PRD §6 "Assign/hapus mahasiswa dari kelas"
 * = admin saja, §7.1 langkah 3).
 *
 * Pola sama dengan `actions/kelas.ts`: `requireAdmin()` → Zod → eksekusi →
 * tangkap error Prisma → `revalidatePath`.
 *
 * Aturan yang dijaga di sini (otorisasi selalu di server, PRD §0 aturan 6):
 *   · Hanya email `@students.untidar.ac.id` yang boleh jadi anggota kelas.
 *   · Menambah user yang belum ada → TIDAK boleh; admin harus pakai
 *     `createAndAddMahasiswa()` atau meminta user login Google dulu.
 *   · `removeMahasiswaFromKelas()` hanya melepas `kelas_id` (akun, NIM, dan
 *     PoinLog tetap utuh) dan menolak bila user masih PJ (`KelasMatkul.pj_id`
 *     memakai `onDelete: Restrict`; PJ wajib anggota kelasnya — keputusan 2C).
 *   · Akun admin (`is_admin = true`) tidak boleh dimasukkan sebagai mahasiswa.
 *
 * CATATAN: `kelasId`/`userId` divalidasi dengan `z.string().min(1)` — BUKAN
 * `z.string().cuid()` — karena data seed memakai id custom (`kelas_ti01`,
 * `usr_siti`, …). Lihat riwayat bug Sub-Fase 2B.
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionResult } from "@/lib/action-utils";
import { mapPrismaKnownError, zodFirstError } from "@/lib/action-utils";
import { requireAdmin } from "@/lib/auth-helpers";
import {
  isStudentEmail,
  NIM_MESSAGE,
  NIM_REGEX,
  normalizeEmail,
  STUDENT_EMAIL_DOMAIN,
  type UserPreview,
  type UserPreviewResult,
} from "@/lib/mahasiswa";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Skema validasi
// ---------------------------------------------------------------------------

/** Id apa pun dari DB (kelas/user) — cukup non-kosong, jangan `.cuid()`. */
const idSchema = z.string().min(1, "Data tidak valid.");

/** Email mahasiswa: format valid + WAJIB domain `@students.untidar.ac.id`. */
const emailSchema = z
  .string()
  .trim()
  .min(1, "Email wajib diisi.")
  .email("Format email tidak valid.")
  .transform(normalizeEmail)
  .refine(isStudentEmail, `Email harus berdomain @${STUDENT_EMAIL_DOMAIN}.`);

const addSchema = z.object({ email: emailSchema });

const createSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nama wajib diisi.")
    .max(100, "Nama maksimal 100 karakter."),
  nim: z.string().trim().regex(NIM_REGEX, NIM_MESSAGE),
  email: emailSchema,
});

type CreateInput = z.infer<typeof createSchema>;

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

/**
 * Revalidate path SPESIFIK (pola 2C). `/admin/kelas/{id}` ditulis dengan id
 * konkret — literal `"/admin/kelas/[id]"` tanpa `type: "page"` tidak
 * merevalidasi apa pun (temuan Sub-Fase 2B, akan dibersihkan terpisah).
 */
function revalidateKelas(kelasId: string): void {
  revalidatePath("/admin/kelas");
  revalidatePath("/admin/dashboard");
  revalidatePath(`/admin/kelas/${kelasId}`);
}

/** Nama tampil user: `name` → kalau kosong pakai email. */
function displayName(user: { name: string | null; email: string }): string {
  return user.name?.trim() || user.email;
}

const previewSelect = {
  id: true,
  name: true,
  nim: true,
  email: true,
  is_admin: true,
  kelas_id: true,
  kelas: { select: { name: true } },
};

interface PreviewRow {
  id: string;
  name: string | null;
  nim: string | null;
  email: string;
  is_admin: boolean;
  kelas_id: string | null;
  kelas: { name: string } | null;
}

function toPreview(row: PreviewRow, isPj: boolean): UserPreview {
  return {
    id: row.id,
    name: row.name,
    nim: row.nim,
    email: row.email,
    is_admin: row.is_admin,
    is_pj: isPj,
  };
}

// ---------------------------------------------------------------------------
// Action
// ---------------------------------------------------------------------------

/**
 * Cari user berdasarkan email (exact, case-insensitive) lalu kembalikan status
 * siap/tidak untuk ditambahkan — dipakai dialog "Tambah Mahasiswa" agar admin
 * melihat preview + alasan penolakan SEBELUM menekan "Tambahkan".
 *
 * Read-only & admin-only. SENGAJA pencarian exact (bukan pola "contains") supaya
 * halaman admin tidak menjadi endpoint enumerasi user.
 */
export async function findUserForKelas(
  kelasId: string,
  input: { email: string },
): Promise<UserPreviewResult> {
  await requireAdmin();

  const parsedId = idSchema.safeParse(kelasId);
  if (!parsedId.success) return { ok: false, error: zodFirstError(parsedId.error) };

  const parsed = addSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: zodFirstError(parsed.error) };

  const { email } = parsed.data;

  const kelas = await prisma.kelas.findUnique({
    where: { id: parsedId.data },
    select: { id: true, name: true },
  });
  if (!kelas) {
    return { ok: false, error: "Kelas tidak ditemukan. Mungkin sudah dihapus." };
  }

  const row: PreviewRow | null = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: previewSelect,
  });

  if (!row) {
    return {
      ok: true,
      status: "tidak_ditemukan",
      message:
        "User tidak ditemukan. Minta user login dulu dengan Google, atau buat user baru lewat mode \"Buat user baru\".",
    };
  }

  // Badge PJ (juga dipakai tombol Tambahkan): cek PJ di KELAS INI saja —
  // `where.kelas_id` WAJIB ada, kalau tidak user yang pindah kelas tapi masih
  // PJ di kelas lama akan salah ditandai (koreksi review 2C).
  const kelasMatkulAsPj = await prisma.kelasMatkul.findFirst({
    where: { pj_id: row.id, kelas_id: kelas.id },
    select: { id: true },
  });
  const user = toPreview(row, kelasMatkulAsPj !== null);

  if (row.kelas_id === kelas.id) {
    return {
      ok: true,
      status: "sudah_di_kelas_ini",
      user,
      message: `${displayName(row)} sudah terdaftar di kelas ${kelas.name}.`,
    };
  }

  if (row.is_admin) {
    return {
      ok: true,
      status: "admin",
      user,
      message: `${displayName(row)} adalah akun admin. Admin tidak bisa ditambahkan sebagai mahasiswa.`,
    };
  }

  if (row.kelas_id !== null) {
    const kelasLama = row.kelas?.name ?? null;
    return {
      ok: true,
      status: "kelas_lain",
      user,
      kelasName: kelasLama,
      message: `${displayName(row)} sudah terdaftar di kelas lain${
        kelasLama ? ` (${kelasLama})` : ""
      }. Pindahkan dulu sebelum menambah ke kelas ini.`,
    };
  }

  return {
    ok: true,
    status: "siap",
    user,
    message: `${displayName(row)} belum punya kelas dan siap ditambahkan ke ${kelas.name}.`,
  };
}

/**
 * Tambahkan user yang SUDAH ada (pernah login Google) ke kelas.
 * Urutan penolakan mengikuti spesifikasi Sub-Fase 2C: tidak ditemukan → sudah
 * di kelas ini → sudah di kelas lain → akun admin.
 */
export async function addMahasiswaToKelas(
  kelasId: string,
  input: { email: string },
): Promise<ActionResult> {
  await requireAdmin();

  const parsedId = idSchema.safeParse(kelasId);
  if (!parsedId.success) return { ok: false, error: zodFirstError(parsedId.error) };

  const parsed = addSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: zodFirstError(parsed.error) };

  const { email } = parsed.data;

  const kelas = await prisma.kelas.findUnique({
    where: { id: parsedId.data },
    select: { id: true, name: true },
  });
  if (!kelas) {
    return { ok: false, error: "Kelas tidak ditemukan. Mungkin sudah dihapus." };
  }

  const user: PreviewRow | null = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: previewSelect,
  });

  if (!user) {
    return {
      ok: false,
      error: "User tidak ditemukan. Minta user login dulu dengan Google.",
    };
  }

  if (user.kelas_id === kelas.id) {
    return { ok: false, error: "User sudah di kelas ini." };
  }

  if (user.kelas_id !== null) {
    const kelasLama = user.kelas?.name ?? null;
    return {
      ok: false,
      error: `User sudah terdaftar di kelas lain${
        kelasLama ? ` (${kelasLama})` : ""
      }. Pindahkan dulu.`,
    };
  }

  if (user.is_admin) {
    return {
      ok: false,
      error: "User ini admin. Admin tidak bisa ditambahkan sebagai mahasiswa.",
    };
  }

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { kelas_id: kelas.id },
    });
  } catch (error) {
    return {
      ok: false,
      error: mapPrismaKnownError(
        error,
        {
          P2025: "User tidak ditemukan. Mungkin sudah dihapus.",
          P2003: "Kelas tidak valid.",
        },
        "Gagal menambahkan mahasiswa ke kelas. Silakan coba lagi.",
      ),
    };
  }

  revalidateKelas(kelas.id);
  return {
    ok: true,
    message: `${displayName(user)} berhasil ditambahkan ke kelas ${kelas.name}.`,
  };
}

/**
 * Buat user baru SEKALIGUS masukkan ke kelas — untuk mahasiswa yang belum
 * pernah login Google (belum ada baris `User`).
 *
 * `id` sengaja TIDAK dikirim: diserahkan ke default `cuid()` milik Prisma.
 * Email disimpan lowercase (hasil normalisasi Zod) supaya pencarian
 * case-insensitive & tautan akun Google nanti cocok.
 *
 * Catatan: user baru belum punya baris `Account`. Saat ia login Google dengan
 * email yang sama, `PrismaAdapter` + `allowDangerousEmailAccountLinking: true`
 * (`auth.config.ts`) menautkan account itu ke baris user ini — jadi akun yang
 * dibuat admin langsung bisa dipakai dan `kelas_id`-nya tidak hilang.
 */
export async function createAndAddMahasiswa(
  kelasId: string,
  input: { name: string; nim: string; email: string },
): Promise<ActionResult> {
  await requireAdmin();

  const parsedId = idSchema.safeParse(kelasId);
  if (!parsedId.success) return { ok: false, error: zodFirstError(parsedId.error) };

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: zodFirstError(parsed.error) };

  const { name, nim, email }: CreateInput = parsed.data;

  const kelas = await prisma.kelas.findUnique({
    where: { id: parsedId.data },
    select: { id: true, name: true },
  });
  if (!kelas) {
    return { ok: false, error: "Kelas tidak ditemukan. Mungkin sudah dihapus." };
  }

  // Cek duplikat eksplisit supaya pesannya menyebut field yang bentrok
  // (unique constraint di DB tetap jadi jaring terakhir → P2002 di bawah).
  const [emailTerpakai, nimTerpakai] = await Promise.all([
    prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true, name: true },
    }),
    prisma.user.findUnique({
      where: { nim },
      select: { id: true, name: true, email: true },
    }),
  ]);

  if (emailTerpakai) {
    return {
      ok: false,
      error: `Email ${email} sudah dipakai user lain${
        emailTerpakai.name ? ` (${emailTerpakai.name})` : ""
      }.`,
    };
  }

  if (nimTerpakai) {
    return {
      ok: false,
      error: `NIM ${nim} sudah dipakai user lain${
        nimTerpakai.name ? ` (${nimTerpakai.name})` : ""
      }.`,
    };
  }

  try {
    await prisma.user.create({
      data: {
        name,
        nim,
        email,
        kelas_id: kelas.id,
        is_admin: false,
      },
    });
  } catch (error) {
    return {
      ok: false,
      error: mapPrismaKnownError(
        error,
        {
          P2002: "Email atau NIM sudah dipakai user lain.",
          P2003: "Kelas tidak valid.",
        },
        "Gagal menyimpan mahasiswa baru. Silakan coba lagi.",
      ),
    };
  }

  revalidateKelas(kelas.id);
  return {
    ok: true,
    message: `${name} berhasil dibuat dan ditambahkan ke kelas ${kelas.name}.`,
  };
}

/**
 * Baris `KelasMatkul` untuk pesan penolakan hapus: nama matkul + kelas.
 * Ditulis manual (bukan tipe hasil generate Prisma) supaya file ini tetap
 * ter-typecheck walau `prisma generate` belum jalan — pola sama dengan
 * `lib/user-snapshot.ts`.
 */
interface PjMatkulRow {
  matkul: { name: string };
  kelas: { name: string };
}

/**
 * Keluarkan mahasiswa dari kelas: HANYA set `kelas_id = null`.
 * Akun, NIM, riwayat poin (`PoinLog`) tidak disentuh — user tetap bisa login
 * dan akan melihat empty state "belum terdaftar di kelas manapun" (PRD §7.4).
 *
 * Ditolak bila user masih PJ di matkul mana pun (keputusan Sub-Fase 2C):
 * `KelasMatkul.pj_id` memakai `onDelete: Restrict`, dan PJ harus tetap anggota
 * kelasnya. Penggantian PJ tersedia di tab Matkul & PJ — Sub-Fase 2D.
 */
export async function removeMahasiswaFromKelas(
  userId: string,
): Promise<ActionResult> {
  await requireAdmin();

  const parsedId = idSchema.safeParse(userId);
  if (!parsedId.success) return { ok: false, error: zodFirstError(parsedId.error) };

  const user = await prisma.user.findUnique({
    where: { id: parsedId.data },
    select: {
      id: true,
      name: true,
      email: true,
      kelas_id: true,
      kelas: { select: { id: true, name: true } },
    },
  });

  if (!user) {
    return { ok: false, error: "User tidak ditemukan. Mungkin sudah dihapus." };
  }
  if (!user.kelas_id || !user.kelas) {
    return { ok: false, error: "User ini belum terdaftar di kelas manapun." };
  }

  const kelasMatkulAsPj: PjMatkulRow[] = await prisma.kelasMatkul.findMany({
    where: { pj_id: user.id },
    select: {
      matkul: { select: { name: true } },
      kelas: { select: { name: true } },
    },
  });

  if (kelasMatkulAsPj.length > 0) {
    const daftar = kelasMatkulAsPj
      .slice(0, 3)
      .map((item) => item.matkul.name)
      .join(", ");
    const sisa = kelasMatkulAsPj.length - 3;
    return {
      ok: false,
      error: `${displayName(user)} masih PJ di ${kelasMatkulAsPj.length} matkul (${daftar}${
        sisa > 0 ? `, +${sisa} lain` : ""
      }). PJ-nya harus diganti dulu sebelum mahasiswa ini bisa dihapus dari kelas.`,
    };
  }

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { kelas_id: null },
    });
  } catch (error) {
    return {
      ok: false,
      error: mapPrismaKnownError(
        error,
        { P2025: "User tidak ditemukan. Mungkin sudah dihapus." },
        "Gagal menghapus mahasiswa dari kelas. Silakan coba lagi.",
      ),
    };
  }

  revalidateKelas(user.kelas_id);
  return {
    ok: true,
    message: `${displayName(user)} dikeluarkan dari kelas ${user.kelas.name}. Akunnya tetap aktif.`,
  };
}
