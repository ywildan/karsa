import { authenticateMobileRequest } from "@/lib/mobile/auth";
import { mobileError, readJson, withMobileApiErrors } from "@/lib/mobile/http";
import { deleteDraft, readArticle, updateArticle } from "@/lib/karsa-lib/service";
import { libResponse } from "@/lib/karsa-lib/http";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ articleId: string }> };

export const GET = withMobileApiErrors(async function GET(request: Request, context: RouteContext) {
  const actor = await authenticateMobileRequest(request);
  if (!actor) return mobileError(401, "UNAUTHENTICATED", "Sesi tidak valid.");
  const { articleId } = await context.params;
  return libResponse(await readArticle(actor, articleId));
});

export const PATCH = withMobileApiErrors(async function PATCH(request: Request, context: RouteContext) {
  const actor = await authenticateMobileRequest(request);
  if (!actor) return mobileError(401, "UNAUTHENTICATED", "Sesi tidak valid.");
  const { articleId } = await context.params;
  return libResponse(await updateArticle(actor, articleId, await readJson(request)));
});

export const DELETE = withMobileApiErrors(async function DELETE(request: Request, context: RouteContext) {
  const actor = await authenticateMobileRequest(request);
  if (!actor) return mobileError(401, "UNAUTHENTICATED", "Sesi tidak valid.");
  const { articleId } = await context.params;
  return libResponse(await deleteDraft(actor, articleId));
});
