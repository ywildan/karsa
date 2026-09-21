"use server";

/**
 * Karsa — actions/prodi.ts
 * ----------------------------------------------------------------------------
 * CRUD master Prodi (Sub-Fase 2A, PRD §7.1 langkah 2).
 * Pola sama dengan `actions/semester.ts`: `requireAdmin()` → Zod → eksekusi
 * → tangkap error Prisma → `revalidatePath`.
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionResult } from "@/lib/action-utils";
import { mapPrismaKnownError, zodFirstError } from "@/lib/action-utils";
import { logAudit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

const prodiInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nama prodi wajib diisi.")
    .max(100, "Nama prodi maksimal 100 karakter."),
});

type ProdiInput = z.infer<typeof prodiInputSchema>;

const REVALIDATE = ["/admin/prodi", "/admin/dashboard"] as const;

function revalidateAll() {
  for (const path of REVALIDATE) revalidatePath(path);
}

/** Tambah prodi baru. */
export async function createProdi(input: ProdiInput): Promise<ActionResult> {
  const admin = await requireAdmin();

  const parsed = prodiInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: zodFirstError(parsed.error) };

  const { name } = parsed.data;
  try {
    await prisma.$transaction(async (tx) => {
      const created = await tx.prodi.create({ data: { name } });

      await logAudit(
        {
          actor: {
            id: admin.id,
            name: admin.name?.trim() || admin.email?.trim() || "Administrator",
            is_admin: admin.is_admin,
          },
          action: "PRODI_CREATE",
          entity: { type: "Prodi", id: created.id, label: name },
          after: { name },
        },
        tx,
      );
    });
  } catch (error) {
    return {
      ok: false,
      error: mapPrismaKnownError(
        error,
        { P2002: `Prodi "${name}" sudah ada.` },
        "Gagal menyimpan prodi. Silakan coba lagi.",
      ),
    };
  }

  revalidateAll();
  return { ok: true, message: `Prodi "${name}" berhasil ditambahkan.` };
}

/** Perbarui nama prodi. */
export async function updateProdi(
  id: string,
  input: ProdiInput,
): Promise<ActionResult> {
  const admin = await requireAdmin();

  const parsed = prodiInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: zodFirstError(parsed.error) };

  const { name } = parsed.data;

  const before = await prisma.prodi.findUnique({
    where: { id },
    select: { name: true },
  });
  if (!before) {
    return { ok: false, error: "Prodi tidak ditemukan. Mungkin sudah dihapus." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.prodi.update({ where: { id }, data: { name } });

      await logAudit(
        {
          actor: {
            id: admin.id,
            name: admin.name?.trim() || admin.email?.trim() || "Administrator",
            is_admin: admin.is_admin,
          },
          action: "PRODI_UPDATE",
          entity: { type: "Prodi", id, label: name },
          before,
          after: { name },
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
          P2002: `Prodi "${name}" sudah ada.`,
          P2025: "Prodi tidak ditemukan. Mungkin sudah dihapus.",
        },
        "Gagal menyimpan perubahan prodi.",
      ),
    };
  }

  revalidateAll();
  return { ok: true, message: `Prodi "${name}" berhasil diperbarui.` };
}

/**
 * Hapus prodi. Ditolak bila masih ada kelas pada prodi tersebut
 * (relasi `Prodi → Kelas` memakai `onDelete: Restrict`).
 */
export async function deleteProdi(id: string): Promise<ActionResult> {
  const admin = await requireAdmin();

  const prodi = await prisma.prodi.findUnique({ where: { id } });
  if (!prodi) {
    return { ok: false, error: "Prodi tidak ditemukan. Mungkin sudah dihapus." };
  }

  const kelasCount = await prisma.kelas.count({ where: { prodi_id: id } });
  if (kelasCount > 0) {
    return {
      ok: false,
      error: `Prodi "${prodi.name}" masih dipakai ${kelasCount} kelas. Pindahkan atau hapus kelasnya dulu.`,
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.prodi.delete({ where: { id } });

      await logAudit(
        {
          actor: {
            id: admin.id,
            name: admin.name?.trim() || admin.email?.trim() || "Administrator",
            is_admin: admin.is_admin,
          },
          action: "PRODI_DELETE",
          entity: { type: "Prodi", id, label: prodi.name },
          before: { name: prodi.name },
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
          P2025: "Prodi tidak ditemukan. Mungkin sudah dihapus.",
          // Balasan `Restrict` bila ada kelas terselip antara cek & hapus.
          P2003: `Prodi "${prodi.name}" masih dipakai kelas lain.`,
        },
        "Gagal menghapus prodi. Silakan coba lagi.",
      ),
    };
  }

  revalidateAll();
  return { ok: true, message: `Prodi "${prodi.name}" berhasil dihapus.` };
}
