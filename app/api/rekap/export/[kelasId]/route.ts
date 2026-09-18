/**
 * Karsa — app/api/rekap/export/[kelasId]/route.ts
 * ----------------------------------------------------------------------------
 * Download rekap Excel. API route memakai respons HTTP, bukan redirect.
 */
import { buildRekapExcelFile } from "@/actions/rekap";
import { auth } from "@/auth";

const EXCEL_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ kelasId: string }> },
) {
  const session = await auth();

  if (!session?.user?.id) {
    return Response.json({ error: "Belum login." }, { status: 401 });
  }

  if (!session.user.is_admin) {
    return Response.json(
      { error: "Akses admin diperlukan." },
      { status: 403 },
    );
  }

  const { kelasId } = await params;
  if (!kelasId?.trim()) {
    return Response.json({ error: "Kelas tidak ditemukan." }, { status: 404 });
  }

  const result = await buildRekapExcelFile(kelasId);

  if (!result.ok) {
    if (result.reason === "not_found") {
      return Response.json(
        { error: "Kelas tidak ditemukan." },
        { status: 404 },
      );
    }

    return Response.json(
      { error: "File rekap tidak dapat dibuat. Coba lagi." },
      { status: 500 },
    );
  }

  return new Response(new Uint8Array(result.bytes), {
    headers: {
      "Content-Type": EXCEL_CONTENT_TYPE,
      "Content-Disposition": `attachment; filename="${result.filename}"`,
      "Content-Length": String(result.bytes.length),
    },
  });
}
