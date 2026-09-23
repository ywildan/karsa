import { authenticateMobileRequest } from "@/lib/mobile/auth";
import { mobileError, mobileOk } from "@/lib/mobile/http";
import { listAssignmentStudents } from "@/lib/services/point-service";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ assignmentId: string }> },
) {
  const actor = await authenticateMobileRequest(request);
  if (!actor) return mobileError(401, "UNAUTHENTICATED", "Sesi tidak valid.");
  if (!actor.capabilities.record_points) {
    return mobileError(403, "PJ_REQUIRED", "Fitur ini hanya tersedia untuk PJ.");
  }
  const { assignmentId } = await context.params;
  const data = await listAssignmentStudents(actor.id, assignmentId);
  if (!data) {
    return mobileError(404, "ASSIGNMENT_NOT_FOUND", "Penugasan tidak ditemukan.");
  }
  return mobileOk(data);
}
