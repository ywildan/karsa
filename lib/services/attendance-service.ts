import "server-only";

import { z } from "zod";

import { zodFirstError } from "@/lib/action-utils";
import {
  ABSENSI_ALPHA_LIMIT,
  ABSENSI_CATATAN_MAX,
  ABSENSI_STATUSES,
  ABSENSI_STATUS_LABEL,
  absensiQuota,
  countAbsensiStatuses,
  formatAbsensiDate,
  parseAbsensiDate,
  type AbsensiStatus,
} from "@/lib/absensi";
import { auditActor, logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { KELAS_NONAKTIF_MESSAGE, cohortKey } from "@/lib/semester";
import {
  activeSemesterForCohort,
  activeSemesterForKelas,
  activeSemestersForCohorts,
} from "@/lib/services/semester-service";

export interface AttendanceActor {
  id: string;
  name: string | null;
  email: string;
  is_admin: boolean;
}

export interface AttendanceStudentActor {
  id: string;
  kelas_id: string | null;
}

export interface AttendanceQuotaWarning {
  student_id: string;
  name: string;
  nim: string | null;
  alpha: number;
  limit: number;
}

export type AttendanceMutationResult =
  | { ok: true; message: string; warnings?: AttendanceQuotaWarning[] }
  | { ok: false; error: string };

const idSchema = z.string().min(1);

const createAttendanceSchema = z.object({
  kelas_matkul_id: idSchema,
  tanggal: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid.")
    .refine((value) => parseAbsensiDate(value) !== null, "Tanggal tidak valid."),
  status: z.enum(ABSENSI_STATUSES),
  student_ids: z
    .array(idSchema)
    .min(1, "Pilih minimal satu mahasiswa.")
    .max(100, "Terlalu banyak mahasiswa dalam satu catatan."),
  catatan: z
    .string()
    .trim()
    .max(
      ABSENSI_CATATAN_MAX,
      `Catatan maksimal ${ABSENSI_CATATAN_MAX} karakter.`,
    )
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
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
          id: true,
          name: true,
          prodi_id: true,
          angkatan: true,
          semester_id: true,
          prodi: { select: { name: true } },
          semester: { select: { name: true } },
        },
      },
    },
  });
  return assignment?.pj_id === pjId ? assignment : null;
}

type AttendanceAssignment = NonNullable<
  Awaited<ReturnType<typeof resolveAssignment>>
>;

async function assignmentIsActive(
  assignment: AttendanceAssignment,
): Promise<boolean> {
  const { prodi_id, angkatan, semester_id } = assignment.kelas;
  if (angkatan === null) return false;
  const semester = await activeSemesterForCohort(prodi_id, angkatan);
  return semester?.id === semester_id;
}

function assignmentContext(assignment: AttendanceAssignment) {
  return {
    kelas_id: assignment.kelas.id,
    kelas_label: assignment.kelas.name,
    matkul_id: assignment.matkul.id,
    matkul_label: assignment.matkul.name,
  };
}

function studentLabel(student: { name: string | null; nim: string | null }) {
  return student.name?.trim() || student.nim || "Mahasiswa";
}

function isUniqueViolation(error: unknown): boolean {
  return (
    !!error &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}

function countByKey<T extends { _count: { _all: number } }>(
  rows: readonly T[],
  key: (row: T) => string | null,
): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows) {
    const value = key(row);
    if (value) map.set(value, row._count._all);
  }
  return map;
}

/* -------------------------------------------------------------------------- */
/* Query                                                                      */
/* -------------------------------------------------------------------------- */

/** Ringkasan absensi milik mahasiswa untuk semua matkul di kelas aktifnya. */
export async function getStudentAttendance(actor: AttendanceStudentActor) {
  if (!actor.kelas_id) return { empty: true as const };

  const kelas = await prisma.kelas.findUnique({
    where: { id: actor.kelas_id },
    select: {
      id: true,
      name: true,
      prodi_id: true,
      angkatan: true,
      semester_id: true,
      prodi: { select: { name: true } },
    },
  });
  if (!kelas) return { empty: true as const };

  const semester = await activeSemesterForKelas(kelas);
  if (!semester) return { empty: true as const };

  const [assignments, records] = await Promise.all([
    prisma.kelasMatkul.findMany({
      where: { kelas_id: kelas.id },
      select: {
        id: true,
        matkul: { select: { name: true, code: true } },
        pj: { select: { name: true } },
      },
      orderBy: { matkul: { name: "asc" } },
    }),
    prisma.absensiLog.findMany({
      where: {
        mahasiswa_id: actor.id,
        kelasMatkul: { kelas_id: kelas.id },
      },
      select: {
        id: true,
        kelas_matkul_id: true,
        status: true,
        tanggal: true,
        catatan: true,
      },
      orderBy: [{ tanggal: "desc" }],
    }),
  ]);

  const recordsByAssignment = new Map<string, typeof records>();
  for (const record of records) {
    const current = recordsByAssignment.get(record.kelas_matkul_id) ?? [];
    current.push(record);
    recordsByAssignment.set(record.kelas_matkul_id, current);
  }

  const courses = assignments.map((assignment) => {
    const history = recordsByAssignment.get(assignment.id) ?? [];
    const counts = countAbsensiStatuses(history);
    const quota = absensiQuota(counts);
    return {
      id: assignment.id,
      matkul: assignment.matkul,
      pj: assignment.pj,
      counts,
      alpha_limit: quota.limit,
      alpha_remaining: quota.remaining,
      alpha_over: quota.over,
      history: history.map((record) => ({
        id: record.id,
        status: record.status,
        tanggal: formatAbsensiDate(record.tanggal),
        catatan: record.catatan,
      })),
    };
  });

  return {
    empty: false as const,
    semester,
    kelas: { id: kelas.id, name: kelas.name },
    prodi: kelas.prodi,
    limit: ABSENSI_ALPHA_LIMIT,
    totals: countAbsensiStatuses(records),
    courses,
  };
}

/** Semua matkul yang dipegang PJ dan masih berada di semester aktif kelasnya. */
export async function listPjAttendanceAssignments(pjId: string) {
  const rows = await prisma.kelasMatkul.findMany({
    where: { pj_id: pjId },
    select: {
      id: true,
      kelas_id: true,
      matkul: { select: { name: true, code: true } },
      kelas: {
        select: {
          name: true,
          prodi_id: true,
          angkatan: true,
          semester_id: true,
          prodi: { select: { name: true } },
          semester: { select: { name: true } },
        },
      },
    },
    orderBy: { matkul: { name: "asc" } },
  });

  const activeByCohort = await activeSemestersForCohorts(
    rows
      .filter((row) => row.kelas.angkatan !== null)
      .map((row) => ({
        prodi_id: row.kelas.prodi_id,
        angkatan: row.kelas.angkatan as number,
      })),
  );

  const visible = rows.filter(
    (row) =>
      row.kelas.angkatan !== null &&
      activeByCohort.get(
        cohortKey(row.kelas.prodi_id, row.kelas.angkatan as number),
      )?.id === row.kelas.semester_id,
  );
  if (visible.length === 0) return [];

  const classIds = [...new Set(visible.map((row) => row.kelas_id))];
  const assignmentIds = visible.map((row) => row.id);

  const [studentsPerClass, totalsPerAssignment, alphaPerAssignment] =
    await Promise.all([
      prisma.user.groupBy({
        by: ["kelas_id"],
        where: { kelas_id: { in: classIds } },
        _count: { _all: true },
      }),
      prisma.absensiLog.groupBy({
        by: ["kelas_matkul_id"],
        where: { kelas_matkul_id: { in: assignmentIds } },
        _count: { _all: true },
      }),
      prisma.absensiLog.groupBy({
        by: ["kelas_matkul_id"],
        where: {
          kelas_matkul_id: { in: assignmentIds },
          status: "TANPA_KETERANGAN",
        },
        _count: { _all: true },
      }),
    ]);

  const studentCounts = countByKey(studentsPerClass, (row) => row.kelas_id);
  const totalCounts = countByKey(
    totalsPerAssignment,
    (row) => row.kelas_matkul_id,
  );
  const alphaCounts = countByKey(
    alphaPerAssignment,
    (row) => row.kelas_matkul_id,
  );

  return visible.map((row) => ({
    id: row.id,
    matkul: row.matkul,
    kelas: {
      name: row.kelas.name,
      prodi: row.kelas.prodi,
      semester: row.kelas.semester,
    },
    student_count: studentCounts.get(row.kelas_id) ?? 0,
    total_records: totalCounts.get(row.id) ?? 0,
    alpha_records: alphaCounts.get(row.id) ?? 0,
  }));
}

/** Detail satu matkul milik PJ: mahasiswa, kuota, dan riwayat per mahasiswa. */
export async function getPjAttendanceAssignment(
  pjId: string,
  assignmentId: string,
) {
  if (!idSchema.safeParse(assignmentId).success) return null;

  const assignment = await resolveAssignment(assignmentId, pjId);
  if (!assignment || !(await assignmentIsActive(assignment))) return null;

  const [students, records] = await Promise.all([
    prisma.user.findMany({
      where: { kelas_id: assignment.kelas_id },
      select: { id: true, name: true, nim: true },
      orderBy: { name: "asc" },
    }),
    prisma.absensiLog.findMany({
      where: { kelas_matkul_id: assignment.id },
      select: {
        id: true,
        mahasiswa_id: true,
        status: true,
        tanggal: true,
        catatan: true,
      },
      orderBy: [{ tanggal: "desc" }],
    }),
  ]);

  const recordsByStudent = new Map<string, typeof records>();
  for (const record of records) {
    const current = recordsByStudent.get(record.mahasiswa_id) ?? [];
    current.push(record);
    recordsByStudent.set(record.mahasiswa_id, current);
  }

  return {
    assignment: {
      id: assignment.id,
      matkul: assignment.matkul,
      kelas: {
        name: assignment.kelas.name,
        prodi: assignment.kelas.prodi,
        semester: assignment.kelas.semester,
      },
      student_count: students.length,
    },
    limit: ABSENSI_ALPHA_LIMIT,
    students: students.map((student) => {
      const history = recordsByStudent.get(student.id) ?? [];
      const counts = countAbsensiStatuses(history);
      const quota = absensiQuota(counts);
      return {
        id: student.id,
        name: student.name,
        nim: student.nim,
        is_self: student.id === pjId,
        counts,
        alpha_limit: quota.limit,
        alpha_remaining: quota.remaining,
        alpha_over: quota.over,
        history: history.map((record) => ({
          id: record.id,
          status: record.status,
          tanggal: formatAbsensiDate(record.tanggal),
          catatan: record.catatan,
        })),
      };
    }),
  };
}

/* -------------------------------------------------------------------------- */
/* Mutasi                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Catat beberapa mahasiswa sekaligus pada satu tanggal.
 *
 * Semua mahasiswa harus anggota kelas penugasan. Kuota 2 TANPA_KETERANGAN
 * tidak memblokir pencatatan; respons membawa `warnings` agar klien dapat
 * menampilkan peringatan setelah data tersimpan.
 */
export async function createAttendance(
  actor: AttendanceActor,
  input: unknown,
): Promise<AttendanceMutationResult> {
  const parsed = createAttendanceSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: zodFirstError(parsed.error) };

  const tanggal = parseAbsensiDate(parsed.data.tanggal);
  if (!tanggal) return { ok: false, error: "Tanggal tidak valid." };

  const assignment = await resolveAssignment(
    parsed.data.kelas_matkul_id,
    actor.id,
  );
  if (!assignment) {
    return { ok: false, error: "Kamu bukan PJ untuk matkul ini." };
  }
  if (!(await assignmentIsActive(assignment))) {
    return { ok: false, error: KELAS_NONAKTIF_MESSAGE };
  }

  const studentIds = [...new Set(parsed.data.student_ids)];
  const students = await prisma.user.findMany({
    where: { id: { in: studentIds }, kelas_id: assignment.kelas_id },
    select: { id: true, name: true, nim: true },
  });
  if (students.length !== studentIds.length) {
    return {
      ok: false,
      error: "Ada mahasiswa yang bukan anggota kelas ini. Muat ulang daftar.",
    };
  }

  const duplicate = await prisma.absensiLog.findMany({
    where: {
      kelas_matkul_id: assignment.id,
      mahasiswa_id: { in: studentIds },
      tanggal,
    },
    select: { mahasiswa: { select: { name: true, nim: true } } },
  });
  if (duplicate.length > 0) {
    const labels = duplicate
      .slice(0, 3)
      .map((row) => studentLabel(row.mahasiswa));
    const rest =
      duplicate.length > 3 ? ` dan ${duplicate.length - 3} lainnya` : "";
    return {
      ok: false,
      error:
        `Sudah tercatat pada tanggal ini: ${labels.join(", ")}${rest}. ` +
        "Hapus catatan lama dulu.",
    };
  }

  let warnings: AttendanceQuotaWarning[] = [];
  if (parsed.data.status === "TANPA_KETERANGAN") {
    const alphaRows = await prisma.absensiLog.groupBy({
      by: ["mahasiswa_id"],
      where: {
        kelas_matkul_id: assignment.id,
        mahasiswa_id: { in: studentIds },
        status: "TANPA_KETERANGAN",
      },
      _count: { _all: true },
    });
    const alphaByStudent = new Map(
      alphaRows.map((row) => [row.mahasiswa_id, row._count._all]),
    );
    warnings = students.flatMap((student) => {
      const alpha = (alphaByStudent.get(student.id) ?? 0) + 1;
      return alpha > ABSENSI_ALPHA_LIMIT
        ? [
            {
              student_id: student.id,
              name: studentLabel(student),
              nim: student.nim,
              alpha,
              limit: ABSENSI_ALPHA_LIMIT,
            },
          ]
        : [];
    });
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.absensiLog.createMany({
        data: students.map((student) => ({
          kelas_matkul_id: assignment.id,
          mahasiswa_id: student.id,
          pj_id: actor.id,
          status: parsed.data.status,
          tanggal,
          catatan: parsed.data.catatan,
        })),
      });

      await logAudit(
        {
          actor: auditActor(actor, { fallbackName: "PJ", role: "PJ" }),
          action: "ABSENSI_INPUT",
          entity: {
            type: "KelasMatkul",
            id: assignment.id,
            label: `${assignment.matkul.name} · ${parsed.data.tanggal}`,
          },
          context: assignmentContext(assignment),
          after: {
            status: parsed.data.status,
            tanggal: parsed.data.tanggal,
            jumlah: students.length,
            mahasiswa: students.map((student) => ({
              id: student.id,
              nama: student.name,
              nim: student.nim,
            })),
          },
          metadata: {
            source: "native_mobile",
            melewati_kuota: warnings.length,
          },
        },
        tx,
      );
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return {
        ok: false,
        error:
          "Sebagian mahasiswa sudah tercatat pada tanggal ini. Muat ulang daftar.",
      };
    }
    return {
      ok: false,
      error: "Gagal menyimpan absensi. Silakan coba lagi.",
    };
  }

  return {
    ok: true,
    message:
      `${students.length} catatan ${ABSENSI_STATUS_LABEL[parsed.data.status].toLowerCase()} ` +
      `untuk ${assignment.matkul.name} tersimpan.`,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/** Hapus satu catatan absensi milik PJ matkul tersebut. */
export async function deleteAttendance(
  actor: AttendanceActor,
  attendanceId: string,
): Promise<AttendanceMutationResult> {
  if (!idSchema.safeParse(attendanceId).success) {
    return { ok: false, error: "Data tidak valid." };
  }

  const record = await prisma.absensiLog.findUnique({
    where: { id: attendanceId },
    select: {
      id: true,
      status: true,
      tanggal: true,
      catatan: true,
      mahasiswa: { select: { name: true, nim: true } },
      kelasMatkul: {
        select: {
          id: true,
          pj_id: true,
          matkul: { select: { id: true, name: true } },
          kelas: {
            select: {
              id: true,
              name: true,
              prodi_id: true,
              angkatan: true,
              semester_id: true,
            },
          },
        },
      },
    },
  });
  if (!record) return { ok: false, error: "Catatan absensi tidak ditemukan." };
  if (record.kelasMatkul.pj_id !== actor.id) {
    return { ok: false, error: "Kamu tidak berhak menghapus catatan ini." };
  }

  const { angkatan, prodi_id, semester_id } = record.kelasMatkul.kelas;
  if (angkatan === null) {
    return { ok: false, error: KELAS_NONAKTIF_MESSAGE };
  }
  const semester = await activeSemesterForCohort(prodi_id, angkatan);
  if (semester?.id !== semester_id) {
    return { ok: false, error: KELAS_NONAKTIF_MESSAGE };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const deleted = await tx.absensiLog.deleteMany({
        where: { id: record.id },
      });
      if (deleted.count !== 1) {
        throw new Error("ABSENSI_ALREADY_DELETED");
      }

      await logAudit(
        {
          actor: auditActor(actor, { fallbackName: "PJ", role: "PJ" }),
          action: "ABSENSI_DELETE",
          entity: {
            type: "AbsensiLog",
            id: record.id,
            label: studentLabel(record.mahasiswa),
          },
          context: {
            kelas_id: record.kelasMatkul.kelas.id,
            kelas_label: record.kelasMatkul.kelas.name,
            matkul_id: record.kelasMatkul.matkul.id,
            matkul_label: record.kelasMatkul.matkul.name,
          },
          before: {
            status: record.status,
            tanggal: formatAbsensiDate(record.tanggal),
            catatan: record.catatan,
          },
          metadata: {
            source: "native_mobile",
            mahasiswa_nim: record.mahasiswa.nim,
            alasan: "manual_delete_from_pj_ui",
          },
        },
        tx,
      );
    });
  } catch (error) {
    if (error instanceof Error && error.message === "ABSENSI_ALREADY_DELETED") {
      return {
        ok: false,
        error: "Catatan absensi tidak ditemukan. Mungkin sudah dihapus.",
      };
    }
    return {
      ok: false,
      error: "Gagal menghapus catatan absensi. Silakan coba lagi.",
    };
  }

  return { ok: true, message: "Catatan absensi dihapus." };
}

/** Reset seluruh catatan absensi satu matkul milik PJ. */
export async function resetAttendance(
  actor: AttendanceActor,
  assignmentId: string,
): Promise<AttendanceMutationResult> {
  if (!idSchema.safeParse(assignmentId).success) {
    return { ok: false, error: "Data tidak valid." };
  }

  const assignment = await resolveAssignment(assignmentId, actor.id);
  if (!assignment) {
    return { ok: false, error: "Kamu bukan PJ untuk matkul ini." };
  }
  if (!(await assignmentIsActive(assignment))) {
    return { ok: false, error: KELAS_NONAKTIF_MESSAGE };
  }

  const byStatus = await prisma.absensiLog.groupBy({
    by: ["status"],
    where: { kelas_matkul_id: assignment.id },
    _count: { _all: true },
  });
  const total = byStatus.reduce((sum, row) => sum + row._count._all, 0);
  if (total === 0) {
    return { ok: true, message: "Belum ada catatan absensi untuk direset." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.absensiLog.deleteMany({
        where: { kelas_matkul_id: assignment.id },
      });
      await logAudit(
        {
          actor: auditActor(actor, { fallbackName: "PJ", role: "PJ" }),
          action: "ABSENSI_RESET",
          entity: {
            type: "KelasMatkul",
            id: assignment.id,
            label: assignment.matkul.name,
          },
          context: assignmentContext(assignment),
          before: {
            jumlah: total,
            status: Object.fromEntries(
              byStatus.map((row) => [row.status, row._count._all]),
            ),
          },
          metadata: {
            source: "native_mobile",
            alasan: "reset_catatan_absensi_per_matkul",
          },
        },
        tx,
      );
    });
  } catch {
    return {
      ok: false,
      error: "Gagal mereset catatan absensi. Silakan coba lagi.",
    };
  }

  return {
    ok: true,
    message: `${total} catatan absensi ${assignment.matkul.name} direset.`,
  };
}

/** Status valid untuk pemakaian di route/test tanpa mengimpor ulang tipe. */
export type { AbsensiStatus };
