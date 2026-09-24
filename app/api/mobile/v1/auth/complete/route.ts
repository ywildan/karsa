import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { hashToken, randomToken } from "@/lib/mobile/auth";
import { withMobileApiErrors } from "@/lib/mobile/http";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function appRedirect(redirectUri: string, values: Record<string, string>) {
  const target = new URL(redirectUri);
  for (const [key, value] of Object.entries(values)) target.searchParams.set(key, value);
  return NextResponse.redirect(target);
}

export const GET = withMobileApiErrors(async function GET(request: Request) {
  const cookieStore = await cookies();
  const requestId = cookieStore.get("karsa_mobile_auth")?.value;
  const authRequest = requestId
    ? await prisma.mobileAuthRequest.findUnique({ where: { id: requestId } })
    : null;

  if (!authRequest || authRequest.expires_at <= new Date() || authRequest.consumed_at) {
    return new Response("Permintaan login aplikasi sudah tidak berlaku.", { status: 400 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    const retry = new URL("/mobile-auth/login", new URL(request.url).origin);
    return NextResponse.redirect(retry);
  }

  if (!session.user.authorization_verified) {
    cookieStore.delete("karsa_mobile_auth");
    return appRedirect(authRequest.redirect_uri, {
      state: authRequest.state,
      error: "temporarily_unavailable",
    });
  }

  if (session.user.is_admin || (!session.user.is_pj && !session.user.kelas_id)) {
    cookieStore.delete("karsa_mobile_auth");
    return appRedirect(authRequest.redirect_uri, {
      state: authRequest.state,
      error: "not_eligible",
    });
  }

  const authorizationCode = randomToken();
  await prisma.mobileAuthRequest.update({
    where: { id: authRequest.id },
    data: {
      user_id: session.user.id,
      code_hash: hashToken(authorizationCode),
    },
  });

  cookieStore.delete("karsa_mobile_auth");
  return appRedirect(authRequest.redirect_uri, {
    state: authRequest.state,
    code: authorizationCode,
  });
});
