import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { prisma } from "@/lib/prisma";
import { loadUserSnapshot } from "@/lib/user-snapshot";

export const MOBILE_REDIRECT_URI = "karsa://auth/callback";
export const MOBILE_ACCESS_TTL_MS = 15 * 60 * 1000;
export const MOBILE_REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const MOBILE_AUTH_REQUEST_TTL_MS = 10 * 60 * 1000;

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function hashToken(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function pkceChallenge(verifier: string): string {
  return createHash("sha256").update(verifier, "ascii").digest("base64url");
}

export function normalizeDeviceName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized ? normalized.slice(0, 100) : null;
}

export function issueMobileTokens(now = new Date()) {
  const accessToken = randomToken();
  const refreshToken = randomToken();
  return {
    accessToken,
    refreshToken,
    accessTokenHash: hashToken(accessToken),
    refreshTokenHash: hashToken(refreshToken),
    accessExpiresAt: new Date(now.getTime() + MOBILE_ACCESS_TTL_MS),
    refreshExpiresAt: new Date(now.getTime() + MOBILE_REFRESH_TTL_MS),
  };
}

export async function mobileUserPayload(userId: string) {
  const snapshot = await loadUserSnapshot(userId);
  if (!snapshot) return null;

  return {
    id: snapshot.id,
    name: snapshot.name,
    email: snapshot.email,
    image: snapshot.image,
    nim: snapshot.nim,
    kelas_id: snapshot.kelas_id,
    capabilities: {
      record_points: !snapshot.is_admin && snapshot.is_pj,
      view_report: !snapshot.is_admin && snapshot.kelas_id !== null,
      view_leaderboard: !snapshot.is_admin && snapshot.kelas_id !== null,
    },
  };
}

export type MobileActor = NonNullable<Awaited<ReturnType<typeof mobileUserPayload>>> & {
  session_id: string;
};

export async function authenticateMobileRequest(
  request: Request,
): Promise<MobileActor | null> {
  const authorization = request.headers.get("authorization");
  const match = authorization?.match(/^Bearer\s+([A-Za-z0-9_-]{32,})$/i);
  if (!match) return null;

  const session = await prisma.mobileSession.findUnique({
    where: { access_token_hash: hashToken(match[1]) },
    select: {
      id: true,
      user_id: true,
      access_expires_at: true,
      refresh_expires_at: true,
      revoked_at: true,
    },
  });

  const now = new Date();
  if (
    !session ||
    session.revoked_at ||
    session.access_expires_at <= now ||
    session.refresh_expires_at <= now
  ) {
    return null;
  }

  const user = await mobileUserPayload(session.user_id);
  if (!user) return null;

  await prisma.mobileSession.update({
    where: { id: session.id },
    data: { last_used_at: now },
  });

  return { ...user, session_id: session.id };
}
