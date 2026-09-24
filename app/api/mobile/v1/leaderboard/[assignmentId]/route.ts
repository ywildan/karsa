import { authenticateMobileRequest } from "@/lib/mobile/auth";
import { mobileError, mobileOk, withMobileApiErrors } from "@/lib/mobile/http";
import { getStudentLeaderboard } from "@/lib/services/student-service";

export const runtime = "nodejs";

export const GET = withMobileApiErrors(async function GET(
  request: Request,
  context: { params: Promise<{ assignmentId: string }> },
) {
  const actor = await authenticateMobileRequest(request);
  if (!actor) return mobileError(401, "UNAUTHENTICATED", "Sesi tidak valid.");
  if (!actor.capabilities.view_leaderboard) {
    return mobileError(403, "NO_CLASS", "Kamu belum terdaftar di kelas.");
  }
  const { assignmentId } = await context.params;
  const result = await getStudentLeaderboard(actor, assignmentId);
  if (!result) {
    return mobileError(404, "ASSIGNMENT_NOT_FOUND", "Mata kuliah tidak tersedia untuk kelasmu.");
  }
  return mobileOk(result);
});
