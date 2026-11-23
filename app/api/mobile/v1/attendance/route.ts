import { authenticateMobileRequest } from "@/lib/mobile/auth";
import {
  mobileError,
  mobileOk,
  readJson,
  withMobileApiErrors,
} from "@/lib/mobile/http";
import {
  createAttendance,
  getStudentAttendance,
} from "@/lib/services/attendance-service";

export const runtime = "nodejs";

/** Ringkasan absensi milik mahasiswa yang sedang login. */
export const GET = withMobileApiErrors(async function GET(request: Request) {
  const actor = await authenticateMobileRequest(request);
  if (!actor) return mobileError(401, "UNAUTHENTICATED", "Sesi tidak valid.");
  if (!actor.capabilities.view_report) {
    return mobileError(403, "NO_CLASS", "Kamu belum terdaftar di kelas.");
  }
  return mobileOk(await getStudentAttendance(actor));
});

/** Catat beberapa mahasiswa tidak hadir pada satu tanggal. */
export const POST = withMobileApiErrors(async function POST(request: Request) {
  const actor = await authenticateMobileRequest(request);
  if (!actor) return mobileError(401, "UNAUTHENTICATED", "Sesi tidak valid.");
  if (!actor.capabilities.record_points) {
    return mobileError(403, "PJ_REQUIRED", "Fitur ini hanya tersedia untuk PJ.");
  }

  const body = await readJson(request);
  if (body === null) {
    return mobileError(400, "INVALID_BODY", "Data absensi tidak valid.");
  }

  const result = await createAttendance(actor, body);
  if (!result.ok) {
    return mobileError(422, "ATTENDANCE_REJECTED", result.error);
  }
  return mobileOk(
    {
      message: result.message,
      warnings: result.warnings ?? [],
    },
    201,
  );
});
