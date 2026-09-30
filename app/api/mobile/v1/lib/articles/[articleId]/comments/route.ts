import { authenticateMobileRequest } from "@/lib/mobile/auth";
import { mobileError, readJson, withMobileApiErrors } from "@/lib/mobile/http";
import { createComment, listComments } from "@/lib/karsa-lib/service";
import { libResponse } from "@/lib/karsa-lib/http";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ articleId: string }> };

export const GET = withMobileApiErrors(async function GET(request: Request, context: RouteContext) {
  const actor = await authenticateMobileRequest(request);
  if (!actor) return mobileError(401, "UNAUTHENTICATED", "Sesi tidak valid.");
  const { articleId } = await context.params;
  return libResponse(await listComments(actor, articleId));
});

export const POST = withMobileApiErrors(async function POST(request: Request, context: RouteContext) {
  const actor = await authenticateMobileRequest(request);
  if (!actor) return mobileError(401, "UNAUTHENTICATED", "Sesi tidak valid.");
  const { articleId } = await context.params;
  return libResponse(await createComment(actor, articleId, await readJson(request)));
});
