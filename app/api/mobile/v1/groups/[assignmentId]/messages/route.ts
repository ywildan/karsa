import { z } from "zod";

import { authenticateMobileRequest } from "@/lib/mobile/auth";
import {
  mobileError,
  mobileOk,
  readJson,
  withMobileApiErrors,
} from "@/lib/mobile/http";
import {
  createGroupMessage,
  listGroupMessages,
} from "@/lib/services/group-service";

export const runtime = "nodejs";

const idempotencySchema = z.string().regex(/^[A-Za-z0-9._:-]{16,128}$/);

type RouteContext = { params: Promise<{ assignmentId: string }> };

export const GET = withMobileApiErrors(async function GET(
  request: Request,
  context: RouteContext,
) {
  const actor = await authenticateMobileRequest(request);
  if (!actor) return mobileError(401, "UNAUTHENTICATED", "Sesi tidak valid.");

  const { assignmentId } = await context.params;
  const url = new URL(request.url);
  const result = await listGroupMessages(
    actor,
    assignmentId,
    Object.fromEntries(url.searchParams),
  );
  if (!result.ok) {
    return mobileError(result.status, result.code, result.message);
  }
  return mobileOk(result.data);
});

export const POST = withMobileApiErrors(async function POST(
  request: Request,
  context: RouteContext,
) {
  const actor = await authenticateMobileRequest(request);
  if (!actor) return mobileError(401, "UNAUTHENTICATED", "Sesi tidak valid.");

  const idempotency = idempotencySchema.safeParse(request.headers.get("idempotency-key"));
  if (!idempotency.success) {
    return mobileError(400, "IDEMPOTENCY_REQUIRED", "Idempotency-Key tidak valid.");
  }

  const { assignmentId } = await context.params;
  const result = await createGroupMessage(
    actor,
    assignmentId,
    await readJson(request),
    idempotency.data,
  );
  if (!result.ok) {
    return mobileError(result.status, result.code, result.message);
  }
  return mobileOk(result.data, 201);
});
