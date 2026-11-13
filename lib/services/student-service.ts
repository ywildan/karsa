import "server-only";

import {
  denseRank,
  maskName,
  maskNim,
  type UnrankedLeaderboardRow,
} from "@/lib/leaderboard";
import { prisma } from "@/lib/prisma";
import {
  activeSemesterForKelas,
  type ActiveSemester,
} from "@/lib/services/semester-service";

export interface StudentActor {
  id: string;
  kelas_id: string | null;
}

interface StudentKelas {
  id: string;
  name: string;
  prodi_id: string;
  angkatan: number | null;
  semester_id: string;
  prodi: { name: string };
}

async function loadStudentKelas(actor: StudentActor): Promise<StudentKelas | null> {
  if (!actor.kelas_id) return null;
  return prisma.kelas.findUnique({
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
}

/** Semester aktif cohort mahasiswa; null bila kelasnya bukan periode aktif. */
async function activeSemesterForStudent(
  kelas: StudentKelas,
): Promise<ActiveSemester | null> {
  return activeSemesterForKelas(kelas);
}

export async function getStudentReport(actor: StudentActor) {
  const kelas = await loadStudentKelas(actor);
  if (!kelas) return { empty: true as const };

  const semester = await activeSemesterForStudent(kelas);
  if (!semester) return { empty: true as const };

  const [assignments, logs] = await Promise.all([
    prisma.kelasMatkul.findMany({
      where: { kelas_id: kelas.id },
      select: {
        id: true,
        matkul: { select: { name: true, code: true } },
        pj: { select: { name: true } },
      },
      orderBy: { matkul: { name: "asc" } },
    }),
    prisma.poinLog.findMany({
      where: {
        mahasiswa_id: actor.id,
        kelasMatkul: { kelas_id: kelas.id },
      },
      select: {
        id: true,
        kelas_matkul_id: true,
        poin: true,
        catatan: true,
        created_at: true,
        kategori: { select: { name: true } },
        pj: { select: { name: true } },
      },
      orderBy: { created_at: "desc" },
    }),
  ]);
  const perAssignment = new Map<string, typeof logs>();
  for (const log of logs) {
    const current = perAssignment.get(log.kelas_matkul_id) ?? [];
    current.push(log);
    perAssignment.set(log.kelas_matkul_id, current);
  }

  const courses = assignments.map((assignment) => {
    const history = perAssignment.get(assignment.id) ?? [];
    return {
      id: assignment.id,
      matkul: assignment.matkul,
      pj: assignment.pj,
      total_poin: history.reduce((sum, item) => sum + item.poin, 0),
      history: history.map(({ kelas_matkul_id: _assignmentId, ...item }) => item),
    };
  });

  return {
    empty: false as const,
    semester,
    kelas: { id: kelas.id, name: kelas.name },
    prodi: kelas.prodi,
    total_poin: courses.reduce((sum, course) => sum + course.total_poin, 0),
    courses,
  };
}

export async function getLeaderboardOptions(actor: StudentActor) {
  const kelas = await loadStudentKelas(actor);
  if (!kelas) return [];
  const semester = await activeSemesterForStudent(kelas);
  if (!semester) return [];

  const rows = await prisma.kelasMatkul.findMany({
    where: { kelas_id: kelas.id },
    select: { id: true, matkul: { select: { name: true, code: true } } },
    orderBy: { matkul: { name: "asc" } },
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.matkul.name,
    code: row.matkul.code,
  }));
}

export async function getStudentLeaderboard(actor: StudentActor, assignmentId: string) {
  const kelas = await loadStudentKelas(actor);
  if (!kelas) return null;
  const semester = await activeSemesterForStudent(kelas);
  if (!semester) return null;

  const assignment = await prisma.kelasMatkul.findFirst({
    where: { id: assignmentId, kelas_id: kelas.id },
    select: { id: true, matkul: { select: { name: true, code: true } } },
  });
  if (!assignment) return null;

  const [students, totals] = await Promise.all([
    prisma.user.findMany({
      where: { kelas_id: kelas.id },
      select: { id: true, name: true, nim: true },
    }),
    prisma.poinLog.groupBy({
      by: ["mahasiswa_id"],
      where: { kelas_matkul_id: assignment.id, mahasiswa: { kelas_id: kelas.id } },
      _sum: { poin: true },
    }),
  ]);

  const totalsByUser = new Map(totals.map((row) => [row.mahasiswa_id, row._sum.poin ?? 0]));
  const rows: UnrankedLeaderboardRow[] = students.map((student) => {
    const isCurrentUser = student.id === actor.id;
    return {
      userId: student.id,
      nama: isCurrentUser ? student.name?.trim() || "Tanpa Nama" : maskName(student.name),
      nim: isCurrentUser ? student.nim : maskNim(student.nim),
      totalPoin: totalsByUser.get(student.id) ?? 0,
      isCurrentUser,
    };
  });
  rows.sort((a, b) => b.totalPoin - a.totalPoin || a.nama.localeCompare(b.nama, "id"));

  return { assignment, rows: denseRank(rows) };
}
