import { authenticateMobileRequest } from '@/lib/mobile/auth';
import { mobileError, withMobileApiErrors } from '@/lib/mobile/http';
import { readAiJson } from '@/lib/karsa-lib/ai-http';
import { summarizeArticle } from '@/lib/karsa-lib/ai-service';
import { libResponse } from '@/lib/karsa-lib/http';

export const runtime = 'nodejs';
export const maxDuration = 60;
type RouteContext = { params: Promise<{ articleId: string }> };

export const POST = withMobileApiErrors(async (request: Request, context: RouteContext) => {
  const actor = await authenticateMobileRequest(request);
  if (!actor) return mobileError(401, 'UNAUTHENTICATED', 'Sesi tidak valid.');
  const { articleId } = await context.params;
  return libResponse(await summarizeArticle(actor, articleId, await readAiJson(request)));
});
