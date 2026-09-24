import { authenticateMobileRequest } from "@/lib/mobile/auth";
import {
  mobileError,
  mobileOk,
  readJson,
  withMobileApiErrors,
} from "@/lib/mobile/http";
import {
  deleteGroupMessage,
  editGroupMessage,
} from "@/lib/services/group-service";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ assignmentId: string; messageId: string }>;
};

export const PATCH = withMobileApiErrors(async function PATCH(
  request: Request,
  context: RouteContext,
) {
  const actor = await authenticateMobileRequest(request);
  if (!actor) return mobileError(401, "UNAUTHENTICATED", "Sesi tidak valid.");

  const { assignmentId, messageId } = await context.params;
  const result = await editGroupMessage(
    actor,
    assignmentId,
    messageId,
    await readJson(request),
  );
  if (!result.ok) return mobileError(result.status, result.code, result.message);
  return mobileOk(result.data);
});

export const DELETE = withMobileApiErrors(async function DELETE(
  request: Request,
  context: RouteContext,
) {
  const actor = await authenticateMobileRequest(request);
  if (!actor) return mobileError(401, "UNAUTHENTICATED", "Sesi tidak valid.");

  const { assignmentId, messageId } = await context.params;
  const result = await deleteGroupMessage(actor, assignmentId, messageId);
  if (!result.ok) return mobileError(result.status, result.code, result.message);
  return mobileOk(result.data);
});
