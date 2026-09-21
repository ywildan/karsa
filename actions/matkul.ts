"use server";

/**
 * Karsa — actions/matkul.ts
 * ----------------------------------------------------------------------------
 * CRUD master Matkul (Sub-Fase 2A, PRD §7.1 langkah 2).
 *
 * Catatan skema: `Matkul.name` TIDAK unique — dua matkul boleh bernama sama.
 * Yang unique hanya `code` (opsional). Karena itu pesan duplikat (P2002)
 * merujuk ke kode, bukan nama.
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionResult } from "@/lib/action-utils";
import { mapPrismaKnownError, zodFirstError } from "@/lib/action-utils";
import { logAudit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

const matkulInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nama matkul wajib diisi.")
    .max(100, "Nama matkul maksimal 100 karakter."),
  // Kode opsional (mis. "TIF1101"). String kosong dianggap "tanpa kode".
  code: z
    .string()
    .trim()
    .max(20, "Kode matkul maksimal 20 karakter.")
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
});

type MatkulInput = z.infer<typeof matkulInputSchema>;

const REVALIDATE = ["/admin/matkul", "/admin/dashboard"] as const;

function revalidateAll() {
  for (const path of REVALIDATE) revalidatePath(path);
}

/** Tambah matkul baru ke master. */
export async function createMatkul(input: MatkulInput): Promise<ActionResult> {
  const admin = await requireAdmin();

  const parsed = matkulInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: zodFirstError(parsed.error) };

  const { name, code } = parsed.data;
  try {
    await prisma.$transaction(async (tx) => {
      const created = await tx.matkul.create({ data: { name, code } });

      await logAudit(
        {
          actor: {
            id: admin.id,
            name: admin.name?.trim() || admin.email?.trim() || "Administrator",
            is_admin: admin.is_admin,
          },
          action: "MATKUL_CREATE",
          entity: { type: "Matkul", id: created.id, label: name },
          after: { name, code },
        },
        tx,
      );
    });
  } catch (error) {
    return {
      ok: false,
      error: mapPrismaKnownError(
        error,
        { P2002: `Kode matkul "${code}" sudah dipakai matkul lain.` },
        "Gagal menyimpan matkul. Silakan coba lagi.",
      ),
    };
  }

  revalidateAll();
  return { ok: true, message: `Matkul "${name}" berhasil ditambahkan.` };
}

/** Perbarui nama / kode matkul. */
export async function updateMatkul(
  id: string,
  input: MatkulInput,
): Promise<ActionResult> {
  const admin = await requireAdmin();

  const parsed = matkulInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: zodFirstError(parsed.error) };

  const { name, code } = parsed.data;

  const before = await prisma.matkul.findUnique({
    where: { id },
    select: { name: true, code: true },
  });
  if (!before) {
    return { ok: false, error: "Matkul tidak ditemukan. Mungkin sudah dihapus." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.matkul.update({ where: { id }, data: { name, code } });

      await logAudit(
        {
          actor: {
            id: admin.id,
            name: admin.name?.trim() || admin.email?.trim() || "Administrator",
            is_admin: admin.is_admin,
          },
          action: "MATKUL_UPDATE",
          entity: { type: "Matkul", id, label: name },
          before,
          after: { name, code },
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
          P2002: `Kode matkul "${code}" sudah dipakai matkul lain.`,
          P2025: "Matkul tidak ditemukan. Mungkin sudah dihapus.",
        },
        "Gagal menyimpan perubahan matkul.",
      ),
    };
  }

  revalidateAll();
  return { ok: true, message: `Matkul "${name}" berhasil diperbarui.` };
}

/**
 * Hapus matkul dari master. Ditolak bila sudah dipakai di kelas
 * (relasi `Matkul → KelasMatkul` memakai `onDelete: Restrict`).
 */
export async function deleteMatkul(id: string): Promise<ActionResult> {
  const admin = await requireAdmin();

  const matkul = await prisma.matkul.findUnique({ where: { id } });
  if (!matkul) {
    return { ok: false, error: "Matkul tidak ditemukan. Mungkin sudah dihapus." };
  }

  const dipakaiCount = await prisma.kelasMatkul.count({ where: { matkul_id: id } });
  if (dipakaiCount > 0) {
    return {
      ok: false,
      error: `Matkul "${matkul.name}" masih dipakai di ${dipakaiCount} kelas. Hapus penugasan kelasnya dulu.`,
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.matkul.delete({ where: { id } });

      await logAudit(
        {
          actor: {
            id: admin.id,
            name: admin.name?.trim() || admin.email?.trim() || "Administrator",
            is_admin: admin.is_admin,
          },
          action: "MATKUL_DELETE",
          entity: { type: "Matkul", id, label: matkul.name },
          before: { name: matkul.name, code: matkul.code },
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
          P2025: "Matkul tidak ditemukan. Mungkin sudah dihapus.",
          // Balasan `Restrict` bila ada penugasan terselip antara cek & hapus.
          P2003: `Matkul "${matkul.name}" masih dipakai di kelas.`,
        },
        "Gagal menghapus matkul. Silakan coba lagi.",
      ),
    };
  }

  revalidateAll();
  return { ok: true, message: `Matkul "${matkul.name}" berhasil dihapus.` };
}
