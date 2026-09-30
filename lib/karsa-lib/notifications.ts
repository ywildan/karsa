import "server-only";

type ArticleReportNotification = {
  reportId: string;
  articleTitle: string;
  reporterName: string;
  reporterEmail: string;
  reason: string;
  details: string | null;
};

/** Kirim pemberitahuan via Resend jika seluruh konfigurasi server tersedia. */
export async function notifyArticleReport(input: ArticleReportNotification): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const recipient = process.env.KARSA_LIB_REPORT_EMAIL;
  const sender = process.env.KARSA_LIB_REPORT_FROM;
  if (!apiKey || !recipient || !sender) return false;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: sender,
        to: [recipient],
        subject: `[Karsa Lib] Laporan artikel: ${input.articleTitle}`,
        text: [
          "Ada laporan artikel baru di Karsa Lib.",
          `ID laporan: ${input.reportId}`,
          `Artikel: ${input.articleTitle}`,
          `Pelapor: ${input.reporterName} (${input.reporterEmail})`,
          `Alasan: ${input.reason}`,
          `Keterangan: ${input.details || "Tidak ada"}`,
          "Tinjau dan tindak lanjuti laporan melalui dashboard Karsa Lib.",
        ].join("\n"),
      }),
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    });
    if (!response.ok) {
      console.error(`[karsa-lib-email] report notification failed status=${response.status}`);
      return false;
    }
    return true;
  } catch (error) {
    const name = error && typeof error === "object" && "name" in error ? String(error.name) : "UnknownError";
    console.error(`[karsa-lib-email] report notification failed name=${name}`);
    return false;
  }
}
