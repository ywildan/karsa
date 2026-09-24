import { authenticateMobileRequest } from "@/lib/mobile/auth";
import {
  mobileError,
  mobileOk,
  readJson,
  withMobileApiErrors,
} from "@/lib/mobile/http";
import { resolveGroupReport } from "@/lib/services/group-service";

export const runtime = "nodejs";

export const POST = withMobileApiErrors(async function POST(
  request: Request,
  context: { params: Promise<{ assignmentId: string; reportId: string }> },
) {
  const actor = await authenticateMobileRequest(request);
  if (!actor) return mobileError(401, "UNAUTHENTICATED", "Sesi tidak valid.");

  const { assignmentId, reportId } = await context.params;
  const result = await resolveGroupReport(
    actor,
    assignmentId,
    reportId,
    await readJson(request),
  );
  if (!result.ok) return mobileError(result.status, result.code, result.message);
  return mobileOk(result.data);
});
