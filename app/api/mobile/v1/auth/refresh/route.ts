import { z } from "zod";

import { hashToken, issueMobileTokens } from "@/lib/mobile/auth";
import {
  mobileError,
  mobileOk,
  readJson,
  withMobileApiErrors,
} from "@/lib/mobile/http";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const bodySchema = z.object({
  refresh_token: z.string().regex(/^[A-Za-z0-9_-]{32,}$/),
});

export const POST = withMobileApiErrors(async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return mobileError(400, "INVALID_REFRESH", "Refresh token tidak valid.");
  }

  const now = new Date();
  const session = await prisma.mobileSession.findUnique({
    where: { refresh_token_hash: hashToken(parsed.data.refresh_token) },
  });
  if (!session || session.revoked_at || session.refresh_expires_at <= now) {
    return mobileError(401, "SESSION_EXPIRED", "Sesi telah berakhir. Silakan masuk lagi.");
  }

  const tokens = issueMobileTokens(now);
  const rotated = await prisma.mobileSession.updateMany({
    where: {
      id: session.id,
      refresh_token_hash: session.refresh_token_hash,
      revoked_at: null,
    },
    data: {
      access_token_hash: tokens.accessTokenHash,
      refresh_token_hash: tokens.refreshTokenHash,
      access_expires_at: tokens.accessExpiresAt,
      refresh_expires_at: tokens.refreshExpiresAt,
      last_used_at: now,
    },
  });

  if (rotated.count !== 1) {
    return mobileError(401, "SESSION_EXPIRED", "Sesi telah berubah. Silakan masuk lagi.");
  }

  return mobileOk({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    access_expires_at: tokens.accessExpiresAt.toISOString(),
    refresh_expires_at: tokens.refreshExpiresAt.toISOString(),
  });
});
