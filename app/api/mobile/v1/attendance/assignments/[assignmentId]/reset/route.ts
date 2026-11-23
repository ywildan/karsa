import { authenticateMobileRequest } from "@/lib/mobile/auth";
import { mobileError, mobileOk, withMobileApiErrors } from "@/lib/mobile/http";
import { resetAttendance } from "@/lib/services/attendance-service";

export const runtime = "nodejs";

/** Reset seluruh catatan absensi satu matkul milik PJ. */
export const POST = withMobileApiErrors(async function POST(
  request: Request,
  context: { params: Promise<{ assignmentId: string }> },
) {
  const actor = await authenticateMobileRequest(request);
  if (!actor) return mobileError(401, "UNAUTHENTICATED", "Sesi tidak valid.");
  if (!actor.capabilities.record_points) {
    return mobileError(403, "PJ_REQUIRED", "Fitur ini hanya tersedia untuk PJ.");
  }

  const { assignmentId } = await context.params;
  const result = await resetAttendance(actor, assignmentId);
  if (!result.ok) {
    return mobileError(422, "RESET_REJECTED", result.error);
  }
  return mobileOk({ message: result.message });
});
