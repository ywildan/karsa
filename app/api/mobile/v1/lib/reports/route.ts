import { authenticateMobileRequest } from "@/lib/mobile/auth";
import { mobileError, readJson, withMobileApiErrors } from "@/lib/mobile/http";
import { submitReport } from "@/lib/karsa-lib/service";
import { libResponse } from "@/lib/karsa-lib/http";

export const runtime = "nodejs";

export const POST = withMobileApiErrors(async function POST(request: Request) {
  const actor = await authenticateMobileRequest(request);
  if (!actor) return mobileError(401, "UNAUTHENTICATED", "Sesi tidak valid.");
  return libResponse(await submitReport(actor, await readJson(request)));
});
