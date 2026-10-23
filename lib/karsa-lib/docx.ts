/**
 * Konversi dokumen Word (.docx) menjadi Markdown untuk artikel Karsa Lib.
 *
 * Alur: mammoth (.docx -> HTML bersih) lalu turndown (HTML -> Markdown).
 * Hasilnya disimpan di kolom `body` artikel yang sama dengan artikel yang
 * diketik manual, jadi viewer, feed, dan Teman Baca memperlakukannya
 * persis seperti artikel Markdown lain.
 *
 * Keputusan produk (v1):
 * - Gambar di dalam dokumen TIDAK disimpan (belum ada penyimpanan gambar
 *   artikel); jumlahnya dilaporkan sebagai `droppedImages` agar penulis
 *   tahu ada gambar yang hilang.
 * - Tabel dikonversi menjadi tabel Markdown bila strukturnya sederhana
 *   (baris pertama menjadi header); bila tidak, isinya diratakan menjadi
 *   teks per baris agar tidak ada konten yang hilang diam-diam.
 * - HTML mentah sisa konversi dibuang (tag-nya saja, teks dipertahankan)
 *   karena `body` tidak pernah dirender sebagai HTML.
 */

import mammoth from "mammoth";
import TurndownService from "turndown";

import { KARSA_LIB_ARTICLE_MAX_TITLE } from "./constants";

export interface DocxConversion {
  /** Judul dari heading pertama dokumen, atau null bila tidak ada. */
  title: string | null;
  /** Isi artikel dalam Markdown (heading judul sudah dikeluarkan). */
  markdown: string;
  /** Jumlah gambar yang dibuang karena belum ada penyimpanan gambar. */
  droppedImages: number;
  /** Pesan mammoth selama konversi (mis. style yang tidak dikenal). */
  warnings: string[];
}

const turndown = new TurndownService({
  headingStyle: "atx",
  bulletListMarker: "-",
  codeBlockStyle: "fenced",
  emDelimiter: "*",
  strongDelimiter: "**",
  linkStyle: "inlined",
});

// Gambar dibuang: belum ada penyimpanan gambar untuk artikel.
turndown.addRule("karsaDropImage", {
  filter: "img",
  replacement: () => "",
});

// Tautan hanya dipertahankan untuk http/https/mailto; skema lain
// (javascript:, data:, file:) diratakan menjadi teksnya saja.
turndown.addRule("karsaSafeLink", {
  filter: (node) =>
    node.nodeName === "A" &&
    !/^(https?:|mailto:)/i.test(node.getAttribute("href") ?? ""),
  replacement: (content) => content,
});

// Tabel sederhana -> tabel Markdown; selain itu ratakan per baris.
turndown.addRule("karsaTable", {
  filter: "table",
  replacement: (_content, node) => {
    const element = node as unknown as {
      querySelectorAll: (selector: string) => ArrayLike<{
        querySelectorAll: (selector: string) => ArrayLike<{ textContent: string | null }>;
      }>;
    };
    const rows = Array.from(element.querySelectorAll("tr")).map((row) =>
      Array.from(row.querySelectorAll("th,td")).map((cell) =>
        (cell.textContent ?? "").replace(/\s+/g, " ").replace(/\|/g, "\\|").trim(),
      ),
    );
    if (rows.length === 0) return "";
    const width = Math.max(...rows.map((row) => row.length));
    const regular = width > 0 && rows.every((row) => row.length === width);
    if (!regular) {
      return "\n\n" + rows.map((row) => row.join(" | ")).join("\n") + "\n\n";
    }
    const [header, ...rest] = rows;
    const separator = header.map(() => "---");
    const lines = [header, separator, ...rest].map((row) => `| ${row.join(" | ")} |`);
    return "\n\n" + lines.join("\n") + "\n\n";
  },
});

/** Konversi HTML (keluaran mammoth) menjadi Markdown yang bersih. */
export function htmlToMarkdown(html: string): { markdown: string; droppedImages: number } {
  const droppedImages = (html.match(/<img\b/gi) ?? []).length;
  let markdown = turndown.turndown(html);
  // Buang tag HTML mentah yang masih tersisa (mis. dari tabel kompleks):
  // tag dibuang, teks di dalamnya dipertahankan.
  markdown = markdown.replace(/<\/?[a-zA-Z][^>]*>/g, "");
  markdown = markdown
    .replace(/\u00A0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { markdown, droppedImages };
}

/** Ambil judul dari blok Markdown pertama bila itu heading tingkat 1-2. */
export function splitTitleFromMarkdown(markdown: string): { title: string | null; body: string } {
  const blocks = markdown.split(/\n\s*\n/);
  const first = blocks[0]?.trim() ?? "";
  const match = first.match(/^#{1,2}\s+(.+)$/);
  if (!match) return { title: null, body: markdown };
  const title = match[1]
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .trim()
    .slice(0, KARSA_LIB_ARTICLE_MAX_TITLE);
  const body = blocks.slice(1).join("\n\n").trim();
  return { title: title || null, body };
}

/** Konversi buffer file .docx menjadi judul + Markdown artikel. */
export async function docxToMarkdown(data: Buffer): Promise<DocxConversion> {
  const result = await mammoth.convertToHtml({ buffer: data });
  const { markdown, droppedImages } = htmlToMarkdown(result.value);
  const { title, body } = splitTitleFromMarkdown(markdown);
  return {
    title,
    markdown: body,
    droppedImages,
    warnings: result.messages.map((message) => message.message),
  };
}
