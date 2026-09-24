import { authenticateMobileRequest } from "@/lib/mobile/auth";
import { mobileError, mobileOk, withMobileApiErrors } from "@/lib/mobile/http";
import { getStudentReport } from "@/lib/services/student-service";

export const runtime = "nodejs";

export const GET = withMobileApiErrors(async function GET(request: Request) {
  const actor = await authenticateMobileRequest(request);
  if (!actor) return mobileError(401, "UNAUTHENTICATED", "Sesi tidak valid.");
  if (!actor.capabilities.view_report) {
    return mobileError(403, "NO_CLASS", "Kamu belum terdaftar di kelas.");
  }
  return mobileOk(await getStudentReport(actor));
});
