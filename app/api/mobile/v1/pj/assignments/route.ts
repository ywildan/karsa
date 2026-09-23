import { authenticateMobileRequest } from "@/lib/mobile/auth";
import { mobileError, mobileOk } from "@/lib/mobile/http";
import { listPjAssignments } from "@/lib/services/point-service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const actor = await authenticateMobileRequest(request);
  if (!actor) return mobileError(401, "UNAUTHENTICATED", "Sesi tidak valid.");
  if (!actor.capabilities.record_points) {
    return mobileError(403, "PJ_REQUIRED", "Fitur ini hanya tersedia untuk PJ.");
  }
  return mobileOk(await listPjAssignments(actor.id));
}
