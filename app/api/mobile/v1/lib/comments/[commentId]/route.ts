import { authenticateMobileRequest } from "@/lib/mobile/auth";
import { mobileError, withMobileApiErrors } from "@/lib/mobile/http";
import { deleteComment } from "@/lib/karsa-lib/service";
import { libResponse } from "@/lib/karsa-lib/http";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ commentId: string }> };

export const DELETE = withMobileApiErrors(async function DELETE(request: Request, context: RouteContext) {
  const actor = await authenticateMobileRequest(request);
  if (!actor) return mobileError(401, "UNAUTHENTICATED", "Sesi tidak valid.");
  const { commentId } = await context.params;
  return libResponse(await deleteComment(actor, commentId));
});
