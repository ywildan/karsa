import { authenticateMobileRequest } from "@/lib/mobile/auth";
import { mobileError, mobileOk } from "@/lib/mobile/http";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const actor = await authenticateMobileRequest(request);
  if (!actor) return mobileError(401, "UNAUTHENTICATED", "Sesi tidak valid.");

  const { session_id: _sessionId, ...user } = actor;
  return mobileOk(user);
}
