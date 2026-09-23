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
