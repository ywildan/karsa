import { z } from "zod";

import {
  hashToken,
  issueMobileTokens,
  mobileUserPayload,
  normalizeDeviceName,
  pkceChallenge,
} from "@/lib/mobile/auth";
import {
  mobileError,
  mobileOk,
  readJson,
  withMobileApiErrors,
} from "@/lib/mobile/http";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const bodySchema = z.object({
  code: z.string().regex(/^[A-Za-z0-9_-]{32,}$/),
  code_verifier: z.string().regex(/^[A-Za-z0-9._~-]{43,128}$/),
  device_name: z.string().max(100).optional(),
  accepted_terms_version: z.literal("1.0").optional(),
});

export const POST = withMobileApiErrors(async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return mobileError(400, "INVALID_EXCHANGE", "Kode login tidak valid.");
  }

  const now = new Date();
  const authRequest = await prisma.mobileAuthRequest.findUnique({
    where: { code_hash: hashToken(parsed.data.code) },
  });

  if (
    !authRequest?.user_id ||
    authRequest.expires_at <= now ||
    authRequest.consumed_at ||
    pkceChallenge(parsed.data.code_verifier) !== authRequest.code_challenge
  ) {
    return mobileError(401, "EXCHANGE_REJECTED", "Kode login salah atau kedaluwarsa.");
  }

  const user = await mobileUserPayload(authRequest.user_id);
  if (
    !user ||
    (!user.capabilities.record_points &&
      !user.capabilities.view_report &&
      !user.capabilities.view_karsa_lib)
  ) {
    return mobileError(403, "NOT_ELIGIBLE", "Akun ini tidak memiliki akses aplikasi Karsa.");
  }

  const tokens = issueMobileTokens(now);
  const consumed = await prisma.$transaction(async (tx) => {
    const updated = await tx.mobileAuthRequest.updateMany({
      where: { id: authRequest.id, consumed_at: null },
      data: { consumed_at: now },
    });
    if (updated.count !== 1) return false;

    await tx.mobileSession.create({
      data: {
        user_id: authRequest.user_id!,
        access_token_hash: tokens.accessTokenHash,
        refresh_token_hash: tokens.refreshTokenHash,
        access_expires_at: tokens.accessExpiresAt,
        refresh_expires_at: tokens.refreshExpiresAt,
        device_name: normalizeDeviceName(parsed.data.device_name),
      },
    });
    if (parsed.data.accepted_terms_version) {
      await tx.auditLog.create({
        data: {
          actor_id: user.id,
          actor_name: user.name?.trim() || user.email,
          actor_role: user.is_admin ? "ADMIN" : user.capabilities.record_points ? "PJ" : "MAHASISWA",
          action: "LEGAL_CONSENT_ACCEPTED",
          entity_type: "User",
          entity_id: user.id,
          after: {
            terms_version: parsed.data.accepted_terms_version,
            privacy_version: parsed.data.accepted_terms_version,
          },
          metadata: { source: "KARSA_MOBILE" },
        },
      });
    }
    return true;
  });

  if (!consumed) {
    return mobileError(409, "CODE_ALREADY_USED", "Kode login sudah pernah digunakan.");
  }

  return mobileOk({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    access_expires_at: tokens.accessExpiresAt.toISOString(),
    refresh_expires_at: tokens.refreshExpiresAt.toISOString(),
    user,
  });
});
