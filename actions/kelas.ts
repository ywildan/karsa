"use server";

/**
 * Karsa — actions/kelas.ts
 * ----------------------------------------------------------------------------
 * CRUD master Kelas (Sub-Fase 2B, PRD §7.1 langkah 2).
 * Pola sama dengan `actions/prodi.ts`: `requireAdmin()` → Zod → eksekusi →
 * tangkap error Prisma → `revalidatePath`.
 *
 * Skema `Kelas` pakai `onDelete: SetNull` (User.kelas_id) + `Cascade`
 * (KelasMatkul.kelas_id). Maka `deleteKelas` CEK EKSPLISIT jumlah mahasiswa &
 * matkul sebelum hapus supaya pesan ramah & prediktif.
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionResult } from "@/lib/action-utils";
import { mapPrismaKnownError, zodFirstError } from "@/lib/action-utils";
import { logAudit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

const kelasInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nama kelas wajib diisi.")
    .max(50, "Nama kelas maksimal 50 karakter."),
    prodi_id: z.string().min(1, "Prodi wajib dipilih."),
  semester_id: z.string().min(1, "Semester wajib dipilih."),
});

type KelasInput = z.infer<typeof kelasInputSchema>;

/** Validasi update: prodi/semester boleh dipertahankan (UI selalu kirim ketiga). */
const kelasUpdateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nama kelas wajib diisi.")
    .max(50, "Nama kelas maksimal 50 karakter."),
    prodi_id: z.string().min(1, "Prodi wajib dipilih."),
  semester_id: z.string().min(1, "Semester wajib dipilih."),
});

const REVALIDATE = ["/admin/kelas", "/admin/dashboard"] as const;
const REVALIDATE_WITH_DETAIL = [
  "/admin/kelas",
  "/admin/dashboard",
  "/admin/kelas/[id]",
] as const;

function revalidateAll(paths: readonly string[]) {
  for (const path of paths) revalidatePath(path);
}

/** Tambah kelas baru. Unique (name, prodi_id, semester_id). */
export async function createKelas(input: KelasInput): Promise<ActionResult> {
  const admin = await requireAdmin();

  const parsed = kelasInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: zodFirstError(parsed.error) };

  const { name, prodi_id, semester_id } = parsed.data;
  try {
    await prisma.$transaction(async (tx) => {
      const created = await tx.kelas.create({
        data: { name, prodi_id, semester_id },
      });

      await logAudit(
        {
          actor: {
            id: admin.id,
            name: admin.name?.trim() || admin.email?.trim() || "Administrator",
            is_admin: admin.is_admin,
          },
          action: "KELAS_CREATE",
          entity: { type: "Kelas", id: created.id, label: name },
          context: { kelas_id: created.id, kelas_label: name },
          after: { name, prodi_id, semester_id },
        },
        tx,
      );
    });
  } catch (error) {
    return {
      ok: false,
      error: mapPrismaKnownError(
        error,
        {
          P2002: "Kelas dengan nama yang sama sudah ada di prodi + semester ini.",
          P2003: "Prodi atau semester tidak valid.",
        },
        "Gagal menyimpan kelas. Silakan coba lagi.",
      ),
    };
  }

  revalidateAll(REVALIDATE);
  return { ok: true, message: `Kelas "${name}" berhasil ditambahkan.` };
}

/**
 * Perbarui kelas. Unique constraint otomatis mengabaikan baris ini, jadi
 * mengubah nama saja (prodi + semester tetap) tidak memicu P2002.
 */
export async function updateKelas(
  id: string,
  input: KelasInput,
): Promise<ActionResult> {
  const admin = await requireAdmin();

  const parsed = kelasUpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: zodFirstError(parsed.error) };

  const { name, prodi_id, semester_id } = parsed.data;

  const before = await prisma.kelas.findUnique({
    where: { id },
    select: { name: true, prodi_id: true, semester_id: true },
  });
  if (!before) {
    return { ok: false, error: "Kelas tidak ditemukan. Mungkin sudah dihapus." };
  }

  const changedFields = (
    ["name", "prodi_id", "semester_id"] as const
  ).filter((field) => before[field] !== parsed.data[field]);

  try {
    await prisma.$transaction(async (tx) => {
      await tx.kelas.update({
        where: { id },
        data: { name, prodi_id, semester_id },
      });

      await logAudit(
        {
          actor: {
            id: admin.id,
            name: admin.name?.trim() || admin.email?.trim() || "Administrator",
            is_admin: admin.is_admin,
          },
          action: "KELAS_UPDATE",
          entity: { type: "Kelas", id, label: name },
          context: { kelas_id: id, kelas_label: name },
          before,
          after: { name, prodi_id, semester_id },
          metadata: { changed_fields: changedFields },
        },
        tx,
      );
    });
  } catch (error) {
    return {
      ok: false,
      error: mapPrismaKnownError(
        error,
        {
          P2002: "Kelas dengan nama yang sama sudah ada di prodi + semester ini.",
          P2025: "Kelas tidak ditemukan. Mungkin sudah dihapus.",
          P2003: "Prodi atau semester tidak valid.",
        },
        "Gagal menyimpan perubahan kelas.",
      ),
    };
  }

  revalidateAll(REVALIDATE_WITH_DETAIL);
  return { ok: true, message: `Kelas "${name}" berhasil diperbarui.` };
}

/**
 * Hapus kelas. Cek eksplisit (skema SetNull + Cascade) sebelum delete agar
 * pesan dinamis & prediktif.
 */
export async function deleteKelas(id: string): Promise<ActionResult> {
  const admin = await requireAdmin();

  const kelas = await prisma.kelas.findUnique({
    where: { id },
    select: { name: true, prodi_id: true, semester_id: true },
  });
  if (!kelas) {
    return { ok: false, error: "Kelas tidak ditemukan. Mungkin sudah dihapus." };
  }

  const [userCount, kelasMatkulCount] = await Promise.all([
    prisma.user.count({ where: { kelas_id: id } }),
    prisma.kelasMatkul.count({ where: { kelas_id: id } }),
  ]);

  if (userCount > 0 && kelasMatkulCount > 0) {
    return {
      ok: false,
      error: `Masih ada ${userCount} mahasiswa dan ${kelasMatkulCount} matkul di kelas ini. Bersihkan dulu sebelum hapus.`,
    };
  }
  if (userCount > 0) {
    return {
      ok: false,
      error: `Masih ada ${userCount} mahasiswa di kelas ini. Pindahkan mereka ke kelas lain dulu.`,
    };
  }
  if (kelasMatkulCount > 0) {
    return {
      ok: false,
      error: `Masih ada ${kelasMatkulCount} matkul ter-assign ke kelas ini. Hapus penugasan matkul dulu.`,
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.kelas.delete({ where: { id } });

      await logAudit(
        {
          actor: {
            id: admin.id,
            name: admin.name?.trim() || admin.email?.trim() || "Administrator",
            is_admin: admin.is_admin,
          },
          action: "KELAS_DELETE",
          entity: { type: "Kelas", id, label: kelas.name },
          context: { kelas_id: id, kelas_label: kelas.name },
          before: {
            name: kelas.name,
            prodi_id: kelas.prodi_id,
            semester_id: kelas.semester_id,
          },
        },
        tx,
      );
    });
  } catch (error) {
    return {
      ok: false,
      error: mapPrismaKnownError(
        error,
        {
          P2025: "Kelas tidak ditemukan. Mungkin sudah dihapus.",
          P2003: "Kelas masih dirujuk data lain.",
        },
        "Gagal menghapus kelas. Silakan coba lagi.",
      ),
    };
  }

  revalidateAll(REVALIDATE);
  return { ok: true, message: `Kelas "${kelas.name}" berhasil dihapus.` };
}
