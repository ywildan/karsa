import "server-only";

import { z } from "zod";

import type { ActionResult } from "@/lib/action-utils";
import { mapPrismaKnownError, zodFirstError } from "@/lib/action-utils";
import { logAudit } from "@/lib/audit";
import { CATATAN_MAX, DOUBLE_SUBMIT_WINDOW_MS, mahasiswaLabel } from "@/lib/poin";
import { prisma } from "@/lib/prisma";
import { POIN_MAX, POIN_MIN } from "@/lib/utils";

export interface PointActor {
  id: string;
  name: string | null;
  email: string;
  is_admin?: boolean;
}

const idSchema = z.string().min(1);
export const pointInputSchema = z.object({
  kelas_matkul_id: idSchema,
  mahasiswa_id: idSchema,
  kategori_id: idSchema,
  poin: z.coerce.number().int().min(POIN_MIN).max(POIN_MAX),
  catatan: z.string().trim().max(CATATAN_MAX).optional().transform((value) => value || null),
});

async function resolveAssignment(assignmentId: string, pjId: string) {
  const assignment = await prisma.kelasMatkul.findUnique({
    where: { id: assignmentId },
    select: {
      id: true,
      kelas_id: true,
      pj_id: true,
      matkul: { select: { id: true, name: true, code: true } },
      kelas: {
        select: {
          name: true,
          prodi: { select: { name: true } },
          semester: { select: { name: true } },
        },
      },
    },
  });
  return assignment?.pj_id === pjId ? assignment : null;
}

export async function listPjAssignments(pjId: string) {
  const rows = await prisma.kelasMatkul.findMany({
    where: { pj_id: pjId },
    select: {
      id: true,
      kelas_id: true,
      matkul: { select: { name: true, code: true } },
      kelas: {
        select: {
          name: true,
          prodi: { select: { name: true } },
          semester: { select: { name: true } },
        },
      },
    },
    orderBy: { matkul: { name: "asc" } },
  });
  const classIds = [...new Set(rows.map((row) => row.kelas_id))];
  const counts = classIds.length
    ? await prisma.user.groupBy({
        by: ["kelas_id"],
        where: { kelas_id: { in: classIds } },
        _count: { _all: true },
      })
    : [];
  const countByClass = new Map(counts.map((item) => [item.kelas_id, item._count._all]));

  return rows.map((row) => ({
    id: row.id,
    matkul: row.matkul,
    kelas: row.kelas,
    student_count: countByClass.get(row.kelas_id) ?? 0,
  }));
}

export async function listAssignmentStudents(pjId: string, assignmentId: string) {
  const assignment = await resolveAssignment(assignmentId, pjId);
  if (!assignment) return null;
  const students = await prisma.user.findMany({
    where: { kelas_id: assignment.kelas_id },
    select: { id: true, name: true, nim: true },
    orderBy: { name: "asc" },
  });
  return {
    assignment: {
      id: assignment.id,
      matkul: assignment.matkul,
      kelas: assignment.kelas,
    },
    students: students.map((student) => ({
      ...student,
      is_self: student.id === pjId,
    })),
  };
}

export async function listPointCategories() {
  return prisma.kategoriPoin.findMany({
    select: { id: true, name: true },
    orderBy: { created_at: "asc" },
  });
}

export async function listPjPointHistory(pjId: string, limit = 100) {
  const rows = await prisma.poinLog.findMany({
    where: { pj_id: pjId },
    select: {
      id: true,
      kelas_matkul_id: true,
      poin: true,
      catatan: true,
      created_at: true,
      mahasiswa: { select: { name: true, nim: true } },
      kategori: { select: { name: true } },
      kelasMatkul: {
        select: {
          matkul: { select: { name: true, code: true } },
          kelas: { select: { name: true } },
        },
      },
    },
    orderBy: { created_at: "desc" },
    take: Math.min(Math.max(limit, 1), 100),
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
    kelas: row.kelasMatkul.kelas,
  }));
}

export async function createPoint(
  actor: PointActor,
  input: unknown,
  idempotencyKey?: string,
): Promise<ActionResult> {
  const parsed = pointInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: zodFirstError(parsed.error) };
  const { kelas_matkul_id, mahasiswa_id, kategori_id, poin, catatan } = parsed.data;
  const storedKey = idempotencyKey ? `${actor.id}:${idempotencyKey}` : null;

  if (storedKey) {
    const existing = await prisma.poinLog.findUnique({
      where: { idempotency_key: storedKey },
      select: { id: true },
    });
    if (existing) return { ok: true, message: "Poin sudah tercatat." };
  }

  const assignment = await resolveAssignment(kelas_matkul_id, actor.id);
  if (!assignment) return { ok: false, error: "Kamu bukan PJ untuk matkul ini." };
  if (mahasiswa_id === actor.id) {
    return { ok: false, error: "PJ tidak bisa memberi poin untuk dirinya sendiri." };
  }

  const [student, category] = await Promise.all([
    prisma.user.findFirst({
      where: { id: mahasiswa_id, kelas_id: assignment.kelas_id },
      select: { id: true, name: true, nim: true },
    }),
    prisma.kategoriPoin.findUnique({
      where: { id: kategori_id },
      select: { id: true, name: true },
    }),
  ]);
  if (!student) return { ok: false, error: "Mahasiswa tidak terdaftar di kelas ini." };
  if (!category) return { ok: false, error: "Kategori poin tidak dikenali." };

  const duplicate = await prisma.poinLog.findFirst({
    where: {
      kelas_matkul_id,
      mahasiswa_id,
      pj_id: actor.id,
      kategori_id,
      poin,
      created_at: { gte: new Date(Date.now() - DOUBLE_SUBMIT_WINDOW_MS) },
    },
    select: { id: true },
  });
  if (duplicate) return { ok: true, message: "Poin yang sama baru saja tercatat." };

  try {
    await prisma.$transaction(async (tx) => {
      const created = await tx.poinLog.create({
        data: {
          kelas_matkul_id,
          mahasiswa_id,
          pj_id: actor.id,
          kategori_id,
          poin,
          catatan,
          idempotency_key: storedKey,
        },
      });
      await logAudit(
        {
          actor: {
            id: actor.id,
            name: actor.name?.trim() || actor.email,
            is_admin: actor.is_admin ?? false,
          },
          action: "POIN_INPUT",
          entity: { type: "PoinLog", id: created.id, label: mahasiswaLabel(student) },
          context: {
            kelas_id: assignment.kelas_id,
            kelas_label: assignment.kelas.name,
            matkul_id: assignment.matkul.id,
            matkul_label: assignment.matkul.name,
          },
          after: { poin, kategori: category.name, catatan },
          metadata: { mahasiswa_nim: student.nim, source: "native_mobile" },
        },
        tx,
      );
    });
  } catch (error) {
    if (storedKey) {
      const existing = await prisma.poinLog.findUnique({
        where: { idempotency_key: storedKey },
        select: { id: true },
      });
      if (existing) return { ok: true, message: "Poin sudah tercatat." };
    }
    return {
      ok: false,
      error: mapPrismaKnownError(error, {}, "Gagal menyimpan poin. Silakan coba lagi."),
    };
  }

  return {
    ok: true,
    message: `${poin} poin ${category.name.toLowerCase()} untuk ${mahasiswaLabel(student)} tercatat.`,
  };
}

export async function deletePoint(actor: PointActor, id: string): Promise<ActionResult> {
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Data tidak valid." };
  try {
    return await prisma.$transaction(async (tx): Promise<ActionResult> => {
      const log = await tx.poinLog.findUnique({
        where: { id },
        select: {
          id: true,
          pj_id: true,
          poin: true,
          catatan: true,
          mahasiswa: { select: { name: true, nim: true } },
          kategori: { select: { name: true } },
          kelasMatkul: {
            select: {
              kelas: { select: { id: true, name: true } },
              matkul: { select: { id: true, name: true } },
            },
          },
        },
      });
      if (!log) return { ok: false, error: "Poin tidak ditemukan." };
      if (log.pj_id !== actor.id) return { ok: false, error: "Kamu tidak berhak hapus poin ini." };

      const deleted = await tx.poinLog.deleteMany({ where: { id, pj_id: actor.id } });
      if (deleted.count !== 1) return { ok: false, error: "Poin tidak ditemukan." };
      await logAudit(
        {
          actor: {
            id: actor.id,
            name: actor.name?.trim() || actor.email,
            is_admin: actor.is_admin ?? false,
          },
          action: "POIN_DELETE",
          entity: { type: "PoinLog", id: log.id, label: mahasiswaLabel(log.mahasiswa) },
          context: {
            kelas_id: log.kelasMatkul.kelas.id,
            kelas_label: log.kelasMatkul.kelas.name,
            matkul_id: log.kelasMatkul.matkul.id,
            matkul_label: log.kelasMatkul.matkul.name,
          },
          before: { poin: log.poin, kategori: log.kategori.name, catatan: log.catatan },
          metadata: { mahasiswa_nim: log.mahasiswa.nim, source: "native_mobile" },
        },
        tx,
      );
      return { ok: true, message: "Poin berhasil dihapus; riwayat tercatat." };
    });
  } catch (error) {
    return {
      ok: false,
      error: mapPrismaKnownError(error, {}, "Gagal menghapus poin. Silakan coba lagi."),
    };
  }
}
