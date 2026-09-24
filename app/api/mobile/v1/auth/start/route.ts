import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  MOBILE_AUTH_REQUEST_TTL_MS,
  MOBILE_REDIRECT_URI,
} from "@/lib/mobile/auth";
import { mobileError, withMobileApiErrors } from "@/lib/mobile/http";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const querySchema = z.object({
  state: z.string().regex(/^[A-Za-z0-9_-]{32,128}$/),
  code_challenge: z.string().regex(/^[A-Za-z0-9_-]{43,128}$/),
  redirect_uri: z.literal(MOBILE_REDIRECT_URI),
});

export const GET = withMobileApiErrors(async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return mobileError(400, "INVALID_AUTH_REQUEST", "Permintaan login tidak valid.");
  }

  const now = new Date();
  await prisma.mobileAuthRequest.deleteMany({
    where: { expires_at: { lt: now } },
  });

  const authRequest = await prisma.mobileAuthRequest.create({
    data: {
      state: parsed.data.state,
      code_challenge: parsed.data.code_challenge,
      redirect_uri: parsed.data.redirect_uri,
      expires_at: new Date(now.getTime() + MOBILE_AUTH_REQUEST_TTL_MS),
    },
    select: { id: true },
  });

  const cookieStore = await cookies();
  cookieStore.set("karsa_mobile_auth", authRequest.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MOBILE_AUTH_REQUEST_TTL_MS / 1000,
  });

  return NextResponse.redirect(new URL("/mobile-auth/login", url.origin));
});
