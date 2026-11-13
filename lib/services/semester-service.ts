import "server-only";

import { prisma } from "@/lib/prisma";
import { cohortKey, type CohortKey } from "@/lib/semester";

export interface ActiveSemester {
  id: string;
  name: string;
}

/** Data minimum kelas untuk memeriksa apakah periodenya masih aktif. */
export interface KelasCohortRef {
  prodi_id: string;
  angkatan: number | null;
  semester_id: string;
}

/**
 * Semester aktif kelas, atau null bila:
 * - kelas belum punya angkatan (data lama), atau
 * - cohort belum punya pointer, atau
 * - kelas berada di periode yang bukan periode aktif cohort-nya.
 */
export async function activeSemesterForKelas(
  kelas: KelasCohortRef,
): Promise<ActiveSemester | null> {
  if (kelas.angkatan === null) return null;
  const semester = await activeSemesterForCohort(kelas.prodi_id, kelas.angkatan);
  if (!semester || semester.id !== kelas.semester_id) return null;
  return semester;
}

/**
 * Semester aktif untuk satu cohort (prodi + angkatan).
 * Null berarti admin belum menetapkan pointer untuk cohort tersebut.
 */
export async function activeSemesterForCohort(
  prodiId: string,
  angkatan: number,
): Promise<ActiveSemester | null> {
  const row = await prisma.cohortSemester.findUnique({
    where: { prodi_id_angkatan: { prodi_id: prodiId, angkatan } },
    select: { semester: { select: { id: true, name: true } } },
  });
  return row?.semester ?? null;
}

/** Versi batch untuk daftar kelas/PJ: kunci `prodi_id:angkatan`. */
export async function activeSemestersForCohorts(
  keys: readonly CohortKey[],
): Promise<Map<string, ActiveSemester>> {
  const unique = new Map<string, CohortKey>();
  for (const key of keys) {
    unique.set(cohortKey(key.prodi_id, key.angkatan), key);
  }
  if (unique.size === 0) return new Map();

  const rows = await prisma.cohortSemester.findMany({
    where: {
      OR: [...unique.values()].map((key) => ({
        prodi_id: key.prodi_id,
        angkatan: key.angkatan,
      })),
    },
    select: {
      prodi_id: true,
      angkatan: true,
      semester: { select: { id: true, name: true } },
    },
  });

  return new Map(
    rows.map((row) => [
      cohortKey(row.prodi_id, row.angkatan),
      row.semester,
    ]),
  );
}

/**
 * Peta `kelas_id` → id semester aktif cohort kelas.
 * Kelas tanpa angkatan / cohort tanpa pointer → null.
 */
export async function activeSemesterIdsForKelas(
  kelasList: readonly { id: string; prodi_id: string; angkatan: number | null }[],
): Promise<Record<string, string | null>> {
  const keys = new Map<string, CohortKey>();
  for (const kelas of kelasList) {
    if (kelas.angkatan === null) continue;
    keys.set(cohortKey(kelas.prodi_id, kelas.angkatan), {
      prodi_id: kelas.prodi_id,
      angkatan: kelas.angkatan,
    });
  }

  const pointers = keys.size
    ? await prisma.cohortSemester.findMany({
        where: {
          OR: [...keys.values()].map((key) => ({
            prodi_id: key.prodi_id,
            angkatan: key.angkatan,
          })),
        },
        select: { prodi_id: true, angkatan: true, semester_id: true },
      })
    : [];
  const pointerByCohort = new Map(
    pointers.map((pointer) => [
      cohortKey(pointer.prodi_id, pointer.angkatan),
      pointer.semester_id,
    ]),
  );

  const result: Record<string, string | null> = {};
  for (const kelas of kelasList) {
    result[kelas.id] =
      kelas.angkatan === null
        ? null
        : pointerByCohort.get(cohortKey(kelas.prodi_id, kelas.angkatan)) ??
          null;
  }
  return result;
}
