import { authenticateMobileRequest } from "@/lib/mobile/auth";
import {
  mobileError,
  mobileOk,
  readJson,
  withMobileApiErrors,
} from "@/lib/mobile/http";
import { reportGroupMessage } from "@/lib/services/group-service";

export const runtime = "nodejs";

export const POST = withMobileApiErrors(async function POST(
  request: Request,
  context: { params: Promise<{ assignmentId: string; messageId: string }> },
) {
  const actor = await authenticateMobileRequest(request);
  if (!actor) return mobileError(401, "UNAUTHENTICATED", "Sesi tidak valid.");

  const { assignmentId, messageId } = await context.params;
  const result = await reportGroupMessage(
    actor,
    assignmentId,
    messageId,
    await readJson(request),
  );
  if (!result.ok) return mobileError(result.status, result.code, result.message);
  return mobileOk(result.data, 201);
});
