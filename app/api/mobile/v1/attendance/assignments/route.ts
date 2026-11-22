import { authenticateMobileRequest } from "@/lib/mobile/auth";
import { mobileError, mobileOk, withMobileApiErrors } from "@/lib/mobile/http";
import { listPjAttendanceAssignments } from "@/lib/services/attendance-service";

export const runtime = "nodejs";

/** Daftar matkul yang dipegang PJ untuk pencatatan absensi. */
export const GET = withMobileApiErrors(async function GET(request: Request) {
  const actor = await authenticateMobileRequest(request);
  if (!actor) return mobileError(401, "UNAUTHENTICATED", "Sesi tidak valid.");
  if (!actor.capabilities.record_points) {
    return mobileError(403, "PJ_REQUIRED", "Fitur ini hanya tersedia untuk PJ.");
  }
  return mobileOk(await listPjAttendanceAssignments(actor.id));
});
