import { authenticateMobileRequest } from "@/lib/mobile/auth";
import { mobileError, mobileOk, withMobileApiErrors } from "@/lib/mobile/http";
import { listGroups } from "@/lib/services/group-service";

export const runtime = "nodejs";

export const GET = withMobileApiErrors(async function GET(request: Request) {
  const actor = await authenticateMobileRequest(request);
  if (!actor) return mobileError(401, "UNAUTHENTICATED", "Sesi tidak valid.");

  const result = await listGroups(actor);
  if (!result.ok) {
    return mobileError(result.status, result.code, result.message);
  }
  return mobileOk(result.data);
});
