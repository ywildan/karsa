import "server-only";

import { NextResponse } from "next/server";

const JSON_HEADERS = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
};

export function mobileOk(data: unknown, status = 200) {
  return NextResponse.json({ ok: true, data }, { status, headers: JSON_HEADERS });
}

export function mobileError(
  status: number,
  code: string,
  message: string,
  details?: unknown,
) {
  return NextResponse.json(
    { ok: false, error: { code, message, ...(details === undefined ? {} : { details }) } },
    { status, headers: JSON_HEADERS },
  );
}

export async function readJson(request: Request): Promise<unknown | null> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) return null;

  try {
    return await request.json();
  } catch {
    return null;
  }
}

const DATABASE_UNAVAILABLE_CODES = new Set([
  "P1000",
  "P1001",
  "P1002",
  "P1003",
  "P1008",
  "P1011",
  "P1017",
  "P2024",
  "P2037",
]);

/** Kenali kegagalan koneksi/pool Prisma tanpa mengandalkan pesan error. */
export function isDatabaseUnavailable(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const candidate = error as { code?: unknown; name?: unknown };
  if (
    typeof candidate.code === "string" &&
    DATABASE_UNAVAILABLE_CODES.has(candidate.code)
  ) {
    return true;
  }

  return (
    candidate.name === "PrismaClientInitializationError" ||
    candidate.name === "PrismaClientRustPanicError"
  );
}

type MobileRouteHandler<Args extends unknown[]> = (
  ...args: Args
) => Promise<Response>;

/**
 * Batas galat untuk route API native.
 *
 * Detail exception hanya masuk log server. Client selalu menerima envelope
 * JSON stabil dan tidak pernah menerima query, credential, atau stack trace.
 */
export function withMobileApiErrors<Args extends unknown[]>(
  handler: MobileRouteHandler<Args>,
): MobileRouteHandler<Args> {
  return async (...args) => {
    try {
      return await handler(...args);
    } catch (error) {
      const incidentId = crypto.randomUUID();
      const diagnostic =
        error && typeof error === "object"
          ? {
              name: "name" in error ? String(error.name) : "UnknownError",
              code: "code" in error ? String(error.code) : undefined,
            }
          : { name: typeof error, code: undefined };
      // Jangan log request/body/error message: semuanya dapat memuat token,
      // query, atau data pengguna. ID insiden menghubungkan log dan kejadian.
      console.error(`[mobile-api] request gagal (${incidentId})`, diagnostic);

      if (isDatabaseUnavailable(error)) {
        const response = mobileError(
          503,
          "DATABASE_UNAVAILABLE",
          "Layanan data sedang tidak tersedia. Coba lagi sebentar.",
        );
        response.headers.set("Retry-After", "5");
        return response;
      }

      return mobileError(
        500,
        "INTERNAL_ERROR",
        "Terjadi gangguan pada server. Coba lagi sebentar.",
      );
    }
  };
}
