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
 * Aturan "semester aktif" sekarang per (prodi, angkatan): satu baris
 * `CohortSemester` per cohort. Tidak ada lagi satu periode global.
 */
import { z } from "zod";

import type { ActionResult } from "@/lib/action-utils";
import { mapPrismaKnownError, revalidatePaths, zodFirstError } from "@/lib/action-utils";
import { auditActor, logAudit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import {
  ANGKATAN_MAX,
  ANGKATAN_MESSAGE,
  ANGKATAN_MIN,
} from "@/lib/semester";

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

/** Payload penetapan semester aktif per (prodi, angkatan). */
const cohortSemesterInputSchema = z.object({
  prodi_id: z.string().min(1, "Prodi wajib dipilih."),
  angkatan: z.coerce
    .number()
    .int(ANGKATAN_MESSAGE)
    .min(ANGKATAN_MIN, ANGKATAN_MESSAGE)
    .max(ANGKATAN_MAX, ANGKATAN_MESSAGE),
  semester_id: z.string().min(1, "Semester wajib dipilih."),
});

type CohortSemesterInput = {
  prodi_id: string;
  angkatan: number;
  semester_id: string;
};

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
          actor: auditActor(admin),
          action: "SEMESTER_CREATE",
          entity: { type: "Semester", id: created.id, label: name },
          after: {
            name,
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

  revalidatePaths(REVALIDATE);
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
          actor: auditActor(admin),
          action: "SEMESTER_UPDATE",
          entity: { type: "Semester", id, label: name },
          before: {
            name: before.name,
            start_date: before.start_date.toISOString(),
            end_date: before.end_date.toISOString(),
          },
          after: {
            name,
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

  revalidatePaths(REVALIDATE);
  return { ok: true, message: `Semester "${name}" berhasil diperbarui.` };
}

/**
 * Hapus semester. Ditolak bila:
 *   · masih ada kelas terikat (relasi `onDelete: Restrict`);
 *   · masih menjadi semester aktif salah satu angkatan.
 */
export async function deleteSemester(id: string): Promise<ActionResult> {
  const admin = await requireAdmin();

  const semester = await prisma.semester.findUnique({ where: { id } });
  if (!semester) {
    return { ok: false, error: "Semester tidak ditemukan. Mungkin sudah dihapus." };
  }

  const kelasCount = await prisma.kelas.count({ where: { semester_id: id } });
  if (kelasCount > 0) {
    return {
      ok: false,
      error: `Semester "${semester.name}" masih dipakai ${kelasCount} kelas. Pindahkan atau hapus kelasnya dulu.`,
    };
  }

  const cohortCount = await prisma.cohortSemester.count({
    where: { semester_id: id },
  });
  if (cohortCount > 0) {
    return {
      ok: false,
      error: `Semester "${semester.name}" masih menjadi semester aktif ${cohortCount} angkatan. Ganti semester aktifnya dulu.`,
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.semester.delete({ where: { id } });

      await logAudit(
        {
          actor: auditActor(admin),
          action: "SEMESTER_DELETE",
          entity: { type: "Semester", id, label: semester.name },
          before: {
            name: semester.name,
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

  revalidatePaths(REVALIDATE);
  return { ok: true, message: `Semester "${semester.name}" berhasil dihapus.` };
}

/**
 * Tetapkan semester aktif untuk satu cohort (prodi + angkatan).
 *
 * Menggantikan `setActiveSemester` global: tiap angkatan bisa berbeda periode,
 * dan dua kelas dalam angkatan yang sama otomatis mengikuti pointer ini.
 * Hanya admin penuh (keputusan produk).
 */
export async function setCohortActiveSemester(
  input: CohortSemesterInput,
): Promise<ActionResult> {
  const admin = await requireAdmin();

  const parsed = cohortSemesterInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: zodFirstError(parsed.error) };

  const { prodi_id, angkatan, semester_id } = parsed.data;

  const [prodi, semester, before] = await Promise.all([
    prisma.prodi.findUnique({ where: { id: prodi_id }, select: { name: true } }),
    prisma.semester.findUnique({
      where: { id: semester_id },
      select: { id: true, name: true },
    }),
    prisma.cohortSemester.findUnique({
      where: { prodi_id_angkatan: { prodi_id, angkatan } },
      select: { id: true, semester: { select: { id: true, name: true } } },
    }),
  ]);

  if (!prodi) return { ok: false, error: "Prodi tidak ditemukan." };
  if (!semester) return { ok: false, error: "Semester tidak ditemukan." };
  if (before?.semester.id === semester_id) {
    return {
      ok: false,
      error: `Semester "${semester.name}" sudah aktif untuk angkatan ini.`,
    };
  }

  const label = `${prodi.name} ${angkatan}`;

  try {
    await prisma.$transaction(async (tx) => {
      const row = await tx.cohortSemester.upsert({
        where: { prodi_id_angkatan: { prodi_id, angkatan } },
        update: { semester_id },
        create: { prodi_id, angkatan, semester_id },
      });

      await logAudit(
        {
          actor: auditActor(admin),
          action: "SEMESTER_SET_ACTIVE",
          entity: { type: "CohortSemester", id: row.id, label },
          before: before
            ? {
                semester_id: before.semester.id,
                semester_name: before.semester.name,
              }
            : undefined,
          after: {
            prodi_id,
            prodi_name: prodi.name,
            angkatan,
            semester_id: semester.id,
            semester_name: semester.name,
          },
          metadata: {
            prodi_id,
            angkatan,
            previous_semester_id: before?.semester.id ?? null,
            new_semester_id: semester.id,
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
          P2025: "Prodi atau semester tidak ditemukan.",
          P2003: "Prodi atau semester yang dipilih tidak valid.",
        },
        "Gagal menetapkan semester aktif. Silakan coba lagi.",
      ),
    };
  }

  revalidatePaths([...REVALIDATE, "/admin/kelas"]);
  return {
    ok: true,
    message: `Semester aktif ${label} sekarang ${semester.name}.`,
  };
}
