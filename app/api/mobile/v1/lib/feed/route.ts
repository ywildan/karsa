import { authenticateMobileRequest } from "@/lib/mobile/auth";
import { mobileError, withMobileApiErrors } from "@/lib/mobile/http";
import { listFeed } from "@/lib/karsa-lib/service";
import { libResponse } from "@/lib/karsa-lib/http";

export const runtime = "nodejs";

export const GET = withMobileApiErrors(async function GET(request: Request) {
  const actor = await authenticateMobileRequest(request);
  if (!actor) return mobileError(401, "UNAUTHENTICATED", "Sesi tidak valid.");
  const params = new URL(request.url).searchParams;
  const sort = params.get("sort") ?? "latest";
  if (sort !== "latest" && sort !== "trending_7d" && sort !== "trending_30d") {
    return mobileError(400, "INVALID_FEED_SORT", "Urutan artikel tidak dikenal.");
  }
  const query = (params.get("q") ?? "").trim();
  if (query.length > 100) {
    return mobileError(400, "INVALID_FEED_QUERY", "Pencarian maksimal 100 karakter.");
  }
  return libResponse(await listFeed(actor, { sort, query }));
});
