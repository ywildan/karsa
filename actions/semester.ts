"use server";

/**
 * Karsa — actions/semester.ts
 * ----------------------------------------------------------------------------
 * CRUD master Semester (Sub-Fase 2A, PRD §7.1 langkah 2).
 *
 * Semua action:
 *   1. `requireAdmin()` dulu — otorisasi di server (PRD §0 aturan 6);
 *      middleware hanyalah lapis pertama.
 *   2. Validasi Zod dengan pesan Indonesia.
 *   3. Error Prisma yang dikenali → pesan ramah (P2002 nama duplikat,
 *      P2025 tidak ditemukan).
 *   4. `revalidatePath` halaman semester + dashboard (dashboard menampilkan
 *      statistik master).
 *
 * Aturan "hanya 1 semester aktif" (PRD §9) dijaga transaksi di
 * `setActiveSemester` dan partial unique index di DB (prisma/init.sql).
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionResult } from "@/lib/action-utils";
import { mapPrismaKnownError, zodFirstError } from "@/lib/action-utils";
import { logAudit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

/** Payload form semester — tanggal dari `<input type="date">` (yyyy-mm-dd). */
const semesterInputSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Nama semester wajib diisi.")
      .max(100, "Nama semester maksimal 100 karakter."),
    start_date: z.coerce.date({
      errorMap: () => ({ message: "Tanggal mulai tidak valid." }),
    }),
    end_date: z.coerce.date({
      errorMap: () => ({ message: "Tanggal akhir tidak valid." }),
    }),
  })
  .refine((data) => data.end_date > data.start_date, {
    // CHECK constraint `end_date > start_date` di DB (prisma/init.sql)
    // divalidasi duluan di sini supaya pesannya ramah.
    message: "Tanggal akhir harus setelah tanggal mulai.",
    path: ["end_date"],
  });

/**
 * Tipe wire dari client: tanggal datang sebagai string `yyyy-mm-dd` dari
 * `<input type="date">` lalu dipaksa `Date` oleh `z.coerce.date()` saat
 * `safeParse`. (Jangan pakai `z.infer` di sini — tipe infer-nya sudah
 * `Date`, padahal yang dikirim client adalah string.)
 */
type SemesterInput = {
  name: string;
  start_date: string;
  end_date: string;
};

const REVALIDATE = ["/admin/semester", "/admin/dashboard"] as const;

function revalidateAll() {
  for (const path of REVALIDATE) revalidatePath(path);
}

/** Tambah semester baru (default tidak aktif). */
export async function createSemester(input: SemesterInput): Promise<ActionResult> {
  const admin = await requireAdmin();

  const parsed = semesterInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: zodFirstError(parsed.error) };

  const { name, start_date, end_date } = parsed.data;
  try {
    await prisma.$transaction(async (tx) => {
      const created = await tx.semester.create({
        data: { name, start_date, end_date },
      });

      await logAudit(
        {
          actor: {
            id: admin.id,
            name: admin.name?.trim() || admin.email?.trim() || "Administrator",
            is_admin: admin.is_admin,
          },
          action: "SEMESTER_CREATE",
          entity: { type: "Semester", id: created.id, label: name },
          after: {
            name,
            is_active: created.is_active,
            start_date: start_date.toISOString(),
            end_date: end_date.toISOString(),
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
        { P2002: `Semester "${name}" sudah ada.` },
        "Gagal menyimpan semester. Silakan coba lagi.",
      ),
    };
  }

  revalidateAll();
  return { ok: true, message: `Semester "${name}" berhasil ditambahkan.` };
}

/** Perbarui nama / rentang tanggal semester. */
export async function updateSemester(
  id: string,
  input: SemesterInput,
): Promise<ActionResult> {
  const admin = await requireAdmin();

  const parsed = semesterInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: zodFirstError(parsed.error) };

  const { name, start_date, end_date } = parsed.data;

  const before = await prisma.semester.findUnique({ where: { id } });
  if (!before) {
    return {
      ok: false,
      error: "Semester tidak ditemukan. Mungkin sudah dihapus.",
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.semester.update({
        where: { id },
        data: { name, start_date, end_date },
      });

      await logAudit(
        {
          actor: {
            id: admin.id,
            name: admin.name?.trim() || admin.email?.trim() || "Administrator",
            is_admin: admin.is_admin,
          },
          action: "SEMESTER_UPDATE",
          entity: { type: "Semester", id, label: name },
          before: {
            name: before.name,
            is_active: before.is_active,
            start_date: before.start_date.toISOString(),
            end_date: before.end_date.toISOString(),
          },
          after: {
            name,
            is_active: before.is_active,
            start_date: start_date.toISOString(),
            end_date: end_date.toISOString(),
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
          P2002: `Semester "${name}" sudah ada.`,
          P2025: "Semester tidak ditemukan. Mungkin sudah dihapus.",
        },
        "Gagal menyimpan perubahan semester.",
      ),
    };
  }

  revalidateAll();
  return { ok: true, message: `Semester "${name}" berhasil diperbarui.` };
}

/**
 * Hapus semester. Ditolak bila:
 *   · semester sedang aktif (PRD §9 — jangan sampai tak ada semester aktif);
 *   · masih ada kelas terikat (relasi `onDelete: Restrict`).
 */
export async function deleteSemester(id: string): Promise<ActionResult> {
  const admin = await requireAdmin();

  const semester = await prisma.semester.findUnique({ where: { id } });
  if (!semester) {
    return { ok: false, error: "Semester tidak ditemukan. Mungkin sudah dihapus." };
  }
  if (semester.is_active) {
    return {
      ok: false,
      error:
        "Semester aktif tidak bisa dihapus. Aktifkan semester lain terlebih dahulu.",
    };
  }

  const kelasCount = await prisma.kelas.count({ where: { semester_id: id } });
  if (kelasCount > 0) {
    return {
      ok: false,
      error: `Semester "${semester.name}" masih dipakai ${kelasCount} kelas. Pindahkan atau hapus kelasnya dulu.`,
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.semester.delete({ where: { id } });

      await logAudit(
        {
          actor: {
            id: admin.id,
            name: admin.name?.trim() || admin.email?.trim() || "Administrator",
            is_admin: admin.is_admin,
          },
          action: "SEMESTER_DELETE",
          entity: { type: "Semester", id, label: semester.name },
          before: {
            name: semester.name,
            is_active: semester.is_active,
            start_date: semester.start_date.toISOString(),
            end_date: semester.end_date.toISOString(),
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
          P2025: "Semester tidak ditemukan. Mungkin sudah dihapus.",
          // Balasan `Restrict` bila ada kelas terselip antara cek & hapus.
          P2003: `Semester "${semester.name}" masih dipakai kelas lain.`,
        },
        "Gagal menghapus semester. Silakan coba lagi.",
      ),
    };
  }

  revalidateAll();
  return { ok: true, message: `Semester "${semester.name}" berhasil dihapus.` };
}

/**
 * Jadikan semester target satu-satunya yang aktif (PRD §9).
 * Transaksi: matikan semua yang aktif, lalu aktifkan target — tidak ada
 * jendela "0 aktif" atau "2 aktif" (dijaga juga oleh partial unique index
 * `Semester_satu_aktif_key` di DB).
 */
export async function setActiveSemester(id: string): Promise<ActionResult> {
  const admin = await requireAdmin();

  const target = await prisma.semester.findUnique({ where: { id } });
  if (!target) {
    return { ok: false, error: "Semester tidak ditemukan. Mungkin sudah dihapus." };
  }
  if (target.is_active) {
    return { ok: false, error: `Semester "${target.name}" sudah aktif.` };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const previousActive = await tx.semester.findFirst({
        where: { is_active: true },
        select: { id: true },
      });

      await tx.semester.updateMany({
        where: { is_active: true },
        data: { is_active: false },
      });
      await tx.semester.update({ where: { id }, data: { is_active: true } });

      await logAudit(
        {
          actor: {
            id: admin.id,
            name: admin.name?.trim() || admin.email?.trim() || "Administrator",
            is_admin: admin.is_admin,
          },
          action: "SEMESTER_SET_ACTIVE",
          entity: { type: "Semester", id, label: target.name },
          before: {
            name: target.name,
            is_active: target.is_active,
            start_date: target.start_date.toISOString(),
            end_date: target.end_date.toISOString(),
          },
          after: {
            name: target.name,
            is_active: true,
            start_date: target.start_date.toISOString(),
            end_date: target.end_date.toISOString(),
          },
          metadata: {
            previous_active_id: previousActive?.id ?? null,
            new_active_id: id,
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
        { P2025: "Semester tidak ditemukan. Mungkin sudah dihapus." },
        "Gagal mengganti semester aktif. Silakan coba lagi.",
      ),
    };
  }

  revalidateAll();
  return { ok: true, message: `Semester "${target.name}" sekarang aktif.` };
}
