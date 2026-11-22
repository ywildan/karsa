import { authenticateMobileRequest } from "@/lib/mobile/auth";
import { mobileError, mobileOk, withMobileApiErrors } from "@/lib/mobile/http";
import { deleteAttendance } from "@/lib/services/attendance-service";

export const runtime = "nodejs";

/** Hapus satu catatan absensi; kuota mahasiswa ikut dihitung ulang. */
export const DELETE = withMobileApiErrors(async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const actor = await authenticateMobileRequest(request);
  if (!actor) return mobileError(401, "UNAUTHENTICATED", "Sesi tidak valid.");
  if (!actor.capabilities.record_points) {
    return mobileError(403, "PJ_REQUIRED", "Fitur ini hanya tersedia untuk PJ.");
  }

  const { id } = await context.params;
  const result = await deleteAttendance(actor, id);
  if (!result.ok) {
    return mobileError(422, "DELETE_REJECTED", result.error);
  }
  return mobileOk({ message: result.message });
});
