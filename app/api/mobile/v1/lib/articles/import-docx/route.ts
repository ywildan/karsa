import { authenticateMobileRequest } from "@/lib/mobile/auth";
import { mobileError, withMobileApiErrors } from "@/lib/mobile/http";
import { importDocxArticle } from "@/lib/karsa-lib/service";
import { libResponse } from "@/lib/karsa-lib/http";

export const runtime = "nodejs";

/**
 * POST multipart/form-data dengan field "file" berisi dokumen .docx.
 * Hasilnya DRAF artikel Markdown di vault penulis (belum terbit).
 */
export const POST = withMobileApiErrors(async function POST(request: Request) {
  const actor = await authenticateMobileRequest(request);
  if (!actor) return mobileError(401, "UNAUTHENTICATED", "Sesi tidak valid.");
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return mobileError(400, "DOCX_FILE_REQUIRED", "Lampirkan file .docx pada field 'file'.");
  }
  const data = Buffer.from(await file.arrayBuffer());
  return libResponse(await importDocxArticle(actor, { file_name: file.name, data }));
});
