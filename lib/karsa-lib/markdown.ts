/**
 * Utilitas Markdown sisi server untuk artikel Karsa Lib.
 *
 * Isi artikel disimpan sebagai Markdown; tempat yang butuh teks polos
 * (cuplikan di feed dan halaman penulis) memakai fungsi di sini agar
 * penanda seperti ** atau # tidak bocor ke tampilan.
 */

/** Ubah Markdown menjadi teks polos satu baris. */
export function markdownPlainText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/^\s*([-*+]|\d{1,3}[.)])\s+/gm, "")
    .replace(/^\|?[\s:|-]+\|?$/gm, " ")
    .replace(/\|/g, " ")
    .replace(/\*\*\*/g, "")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/(^|[\s(])_([^_]+)_(?=$|[\s).,;:!?])/gm, "$1$2")
    .replace(/\s+/g, " ")
    .trim();
}

/** Cuplikan teks polos isi artikel untuk kartu feed (maks 220 karakter). */
export function articleBodyPreview(body: string, max = 220): string {
  const plain = markdownPlainText(body);
  return plain.length > max ? `${plain.slice(0, max - 3).trimEnd()}…` : plain;
}
