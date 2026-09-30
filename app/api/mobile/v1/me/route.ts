import { authenticateMobileRequest } from "@/lib/mobile/auth";
import { mobileError, mobileOk, withMobileApiErrors } from "@/lib/mobile/http";

export const runtime = "nodejs";

export const GET = withMobileApiErrors(async function GET(request: Request) {
  const actor = await authenticateMobileRequest(request);
  if (!actor) return mobileError(401, "UNAUTHENTICATED", "Sesi tidak valid.");

  return mobileOk({
    id: actor.id,
    name: actor.name,
    email: actor.email,
    image: actor.image,
    nim: actor.nim,
    kelas_id: actor.kelas_id,
    lib_profile: actor.lib_profile,
    capabilities: actor.capabilities,
  });
});
