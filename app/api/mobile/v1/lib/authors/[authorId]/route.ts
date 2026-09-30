import { authenticateMobileRequest } from "@/lib/mobile/auth";
import { mobileError, withMobileApiErrors } from "@/lib/mobile/http";
import { getAuthorProfile } from "@/lib/karsa-lib/service";
import { libResponse } from "@/lib/karsa-lib/http";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ authorId: string }> };

export const GET = withMobileApiErrors(async function GET(request: Request, context: RouteContext) {
  const actor = await authenticateMobileRequest(request);
  if (!actor) return mobileError(401, "UNAUTHENTICATED", "Sesi tidak valid.");
  const { authorId } = await context.params;
  return libResponse(await getAuthorProfile(actor, authorId));
});
