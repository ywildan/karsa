/**
 * SiKarsa — lib/unduh.ts
 * ----------------------------------------------------------------------------
 * Data rilis aplikasi Android untuk halaman publik /unduh.
 *
 * Diambil dari GitHub Releases repo ywildan/karsa (rilis terbaru). Workflow
 * karsa-mobile-build.yml menerbitkan satu APK per rilis dengan nama
 * `Karsa-Mobile-<versi>-arm64-v8a.apk` — namanya berubah tiap versi, jadi
 * halaman tidak bisa memakai URL unduh statis; aset APK dicari dari
 * daftar aset rilis terbaru.
 *
 * Catatan rilis dibuat workflow dengan `--generate-notes` (daftar PR yang
 * masuk) ditambah catatan minimum Android. Blok catatan di sini diubah
 * dari Markdown ringan menjadi blok render (daftar/paragraf) dengan
 * penanda dasar dibersihkan; React meng-escape HTML-nya, jadi isi
 * catatan rilis tidak bisa menyuntikkan markup.
 *
 * Bila API GitHub gagal dijangkau (offline, limit), fungsi mengembalikan
 * null dan halaman menampilkan keadaan fallback tanpa angka versi —
 * tombol instal lalu mencoba lagi dari sisi klien.
 */

export type ReleaseNoteBlock =
  | { type: "list"; items: string[] }
  | { type: "text"; text: string };

export type LatestRelease = {
  /** Versi tanpa awalan tag, mis. "2.0.21" dari tag "karsa-v2.0.21". */
  version: string;
  /** Judul rilis, mis. "Karsa Mobile 2.0.21". */
  title: string;
  /** Tanggal terbit dalam Bahasa Indonesia, mis. "24 Oktober 2026". */
  publishedLabel: string;
  /** URL unduh langsung aset APK, atau null bila tidak ada aset .apk. */
  apkUrl: string | null;
  /** Blok catatan rilis yang sudah dibersihkan. */
  notes: ReleaseNoteBlock[];
  /** URL halaman rilis di GitHub (jalan terakhir bila unduhan gagal). */
  releaseUrl: string;
};

const RELEASE_API =
  "https://api.github.com/repos/ywildan/karsa/releases/latest";

const cleanNoteLine = (text: string): string =>
  text
    .replace(/^#{1,6}\s+/, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    // Catatan hasil --generate-notes penuh tautan Markdown
    // ([@ywildan](...) in [#75](...)) — sisakan teksnya saja.
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .trim();

function parseReleaseNotes(body: string): ReleaseNoteBlock[] {
  const blocks: ReleaseNoteBlock[] = [];
  let list: string[] = [];
  const flushList = () => {
    if (list.length > 0) {
      blocks.push({ type: "list", items: list });
      list = [];
    }
  };
  for (const rawLine of body.split("\n")) {
    const line = rawLine.trim();
    if (line.startsWith("- ") || line.startsWith("* ")) {
      const item = cleanNoteLine(line.slice(2));
      if (item) list.push(item);
    } else if (line === "") {
      flushList();
    } else {
      flushList();
      const text = cleanNoteLine(line);
      if (text) blocks.push({ type: "text", text });
    }
  }
  flushList();
  return blocks;
}

type GitHubReleaseApi = {
  tag_name?: string;
  name?: string | null;
  body?: string | null;
  published_at?: string | null;
  html_url?: string;
  assets?: { name?: string; browser_download_url?: string }[];
};

export async function getLatestRelease(): Promise<LatestRelease | null> {
  let data: GitHubReleaseApi;
  try {
    const res = await fetch(RELEASE_API, {
      headers: { Accept: "application/vnd.github+json" },
      // Diperbarui tiap jam: rilis baru langsung tampil tanpa deploy,
      // tapi halaman tidak menghantam API GitHub di setiap kunjungan.
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    data = (await res.json()) as GitHubReleaseApi;
  } catch {
    return null;
  }
  if (!data.tag_name) return null;

  const version = data.tag_name.replace(/^karsa-v/, "").replace(/^v/, "");
  const assets = data.assets ?? [];
  const apk =
    assets.find((a) => a.name?.endsWith("-arm64-v8a.apk")) ??
    assets.find((a) => a.name?.endsWith(".apk"));

  return {
    version,
    title: data.name?.trim() || `Karsa Mobile ${version}`,
    publishedLabel: data.published_at
      ? new Date(data.published_at).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
          timeZone: "Asia/Jakarta",
        })
      : "",
    apkUrl: apk?.browser_download_url ?? null,
    notes: parseReleaseNotes(data.body ?? ""),
    releaseUrl: data.html_url ?? "https://github.com/ywildan/karsa/releases/latest",
  };
}
