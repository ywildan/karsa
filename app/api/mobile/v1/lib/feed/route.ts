import { authenticateMobileRequest } from "@/lib/mobile/auth";
import { mobileError, withMobileApiErrors } from "@/lib/mobile/http";
import { listFeed } from "@/lib/karsa-lib/service";
import { libResponse } from "@/lib/karsa-lib/http";

export const runtime = "nodejs";

export const GET = withMobileApiErrors(async function GET(request: Request) {
  const actor = await authenticateMobileRequest(request);
  if (!actor) return mobileError(401, "UNAUTHENTICATED", "Sesi tidak valid.");
  return libResponse(await listFeed(actor));
});
