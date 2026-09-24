import { authenticateMobileRequest } from "@/lib/mobile/auth";
import { mobileError, mobileOk, withMobileApiErrors } from "@/lib/mobile/http";
import { setGroupBlock } from "@/lib/services/group-service";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ userId: string }> };

async function updateBlock(request: Request, context: RouteContext, blocked: boolean) {
  const actor = await authenticateMobileRequest(request);
  if (!actor) return mobileError(401, "UNAUTHENTICATED", "Sesi tidak valid.");

  const { userId } = await context.params;
  const result = await setGroupBlock(actor, userId, blocked);
  if (!result.ok) return mobileError(result.status, result.code, result.message);
  return mobileOk(result.data);
}

export const PUT = withMobileApiErrors(async function PUT(
  request: Request,
  context: RouteContext,
) {
  return updateBlock(request, context, true);
});

export const DELETE = withMobileApiErrors(async function DELETE(
  request: Request,
  context: RouteContext,
) {
  return updateBlock(request, context, false);
});
