import { z } from "zod";

import { authenticateMobileRequest } from "@/lib/mobile/auth";
import { mobileError, mobileOk, readJson } from "@/lib/mobile/http";
import {
  createPoint,
  listPjPointHistory,
} from "@/lib/services/point-service";

export const runtime = "nodejs";

const idempotencySchema = z.string().regex(/^[A-Za-z0-9._:-]{16,128}$/);

export async function GET(request: Request) {
  const actor = await authenticateMobileRequest(request);
  if (!actor) return mobileError(401, "UNAUTHENTICATED", "Sesi tidak valid.");
  if (!actor.capabilities.record_points) {
    return mobileError(403, "PJ_REQUIRED", "Fitur ini hanya tersedia untuk PJ.");
  }
  return mobileOk(await listPjPointHistory(actor.id));
}

export async function POST(request: Request) {
  const actor = await authenticateMobileRequest(request);
  if (!actor) return mobileError(401, "UNAUTHENTICATED", "Sesi tidak valid.");
  if (!actor.capabilities.record_points) {
    return mobileError(403, "PJ_REQUIRED", "Fitur ini hanya tersedia untuk PJ.");
  }

  const idempotency = idempotencySchema.safeParse(request.headers.get("idempotency-key"));
  if (!idempotency.success) {
    return mobileError(400, "IDEMPOTENCY_REQUIRED", "Idempotency-Key tidak valid.");
  }

  const result = await createPoint(actor, await readJson(request), idempotency.data);
  if (!result.ok) return mobileError(422, "POINT_REJECTED", result.error);
  return mobileOk({ message: result.message ?? "Poin tercatat." }, 201);
}
