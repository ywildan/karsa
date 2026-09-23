import { authenticateMobileRequest } from "@/lib/mobile/auth";
import { mobileError, mobileOk } from "@/lib/mobile/http";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const actor = await authenticateMobileRequest(request);
  if (!actor) return mobileError(401, "UNAUTHENTICATED", "Sesi tidak valid.");

  await prisma.mobileSession.update({
    where: { id: actor.session_id },
    data: { revoked_at: new Date() },
  });
  return mobileOk({ logged_out: true });
}
