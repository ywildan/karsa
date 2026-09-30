import { mobileError, mobileOk } from "@/lib/mobile/http";

import type { LibResult } from "./service";

export function libResponse<T>(result: LibResult<T>) {
  if (!result.ok) return mobileError(result.status, result.code, result.message);
  return mobileOk(result.data, result.status ?? 200);
}
