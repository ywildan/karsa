"use server";

/**
 * Karsa — actions/absensi.ts
 * ----------------------------------------------------------------------------
 * Server Action absensi web (channel mobile PJ). Otorisasi sebenarnya tetap di
 * `attendance-service` — di sini hanya sesi + bentuk payload dari FormData.
 */
import { revalidatePath } from "next/cache";

import { isAbsensiStatus } from "@/lib/absensi";
import type {
  AbsensiActionResult,
  AbsensiFormState,
} from "@/lib/absensi-view";
import { requireUser } from "@/lib/auth-helpers";
import type { AttendanceActor } from "@/lib/services/attendance-service";
import {
  createAttendance,
  deleteAttendance,
  resetAttendance,
} from "@/lib/services/attendance-service";

function actorFrom(user: Awaited<ReturnType<typeof requireUser>>): AttendanceActor {
  return {
    id: user.id,
    name: user.name ?? null,
    email: user.email ?? "",
    is_admin: user.is_admin === true,
  };
}

export async function catatAbsensiAction(
  _previous: AbsensiFormState,
  formData: FormData,
): Promise<AbsensiFormState> {
  const user = await requireUser();
  if (!user.authorization_verified || !user.is_pj) {
    return { ok: false, error: "Fitur ini hanya tersedia untuk PJ." };
  }

  const kelasMatkulId = String(formData.get("kelas_matkul_id") ?? "").trim();
  const tanggal = String(formData.get("tanggal") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const catatan = String(formData.get("catatan") ?? "").trim();
  const studentIds = formData
    .getAll("student_ids")
    .map((value) => String(value))
    .filter((value) => value.length > 0);

  if (!isAbsensiStatus(status)) {
    return { ok: false, error: "Pilih status kehadiran yang valid." };
  }

  const result = await createAttendance(actorFrom(user), {
    kelas_matkul_id: kelasMatkulId,
    tanggal,
    status,
    student_ids: studentIds,
    catatan,
  });

  if (!result.ok) return result;

  revalidatePath(`/absensi/${kelasMatkulId}`);
  revalidatePath("/absensi");

  return {
    ok: true,
    message: result.message,
    warnings: result.warnings?.map((warning) => ({
      name: warning.name,
      nim: warning.nim,
      alpha: warning.alpha,
      limit: warning.limit,
    })),
  };
}

export async function hapusAbsensiAction(
  attendanceId: string,
): Promise<AbsensiActionResult> {
  const user = await requireUser();
  if (!user.authorization_verified || !user.is_pj) {
    return { ok: false, error: "Fitur ini hanya tersedia untuk PJ." };
  }

  const result = await deleteAttendance(actorFrom(user), attendanceId);
  if (result.ok) revalidatePath("/absensi");
  return result;
}

export async function resetAbsensiAction(
  assignmentId: string,
): Promise<AbsensiActionResult> {
  const user = await requireUser();
  if (!user.authorization_verified || !user.is_pj) {
    return { ok: false, error: "Fitur ini hanya tersedia untuk PJ." };
  }

  const result = await resetAttendance(actorFrom(user), assignmentId);
  if (result.ok) {
    revalidatePath(`/absensi/${assignmentId}`);
    revalidatePath("/absensi");
  }
  return result;
}
