import { authenticateMobileRequest } from "@/lib/mobile/auth";
import { mobileError, mobileOk, withMobileApiErrors } from "@/lib/mobile/http";
import { getPjAttendanceAssignment } from "@/lib/services/attendance-service";

export const runtime = "nodejs";

/** Detail satu matkul: mahasiswa, kuota tanpa keterangan, dan riwayat. */
export const GET = withMobileApiErrors(async function GET(
  request: Request,
  context: { params: Promise<{ assignmentId: string }> },
) {
  const actor = await authenticateMobileRequest(request);
  if (!actor) return mobileError(401, "UNAUTHENTICATED", "Sesi tidak valid.");
  if (!actor.capabilities.record_points) {
    return mobileError(403, "PJ_REQUIRED", "Fitur ini hanya tersedia untuk PJ.");
  }

  const { assignmentId } = await context.params;
  const data = await getPjAttendanceAssignment(actor.id, assignmentId);
  if (!data) {
    return mobileError(
      404,
      "ASSIGNMENT_NOT_FOUND",
      "Penugasan tidak ditemukan atau bukan semester aktif.",
    );
  }
  return mobileOk(data);
});
