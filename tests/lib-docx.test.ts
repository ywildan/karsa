import assert from "node:assert/strict";
import test from "node:test";

import JSZip from "jszip";

import { docxToMarkdown, htmlToMarkdown, splitTitleFromMarkdown } from "../lib/karsa-lib/docx";
import { articleBodyPreview, markdownPlainText } from "../lib/karsa-lib/markdown";

/**
 * Bangun dokumen .docx contoh di memori (OOXML minimal ditulis tangan):
 * heading 1/2, run tebal/miring/gabungan, daftar poin, tabel, dan
 * hyperlink eksternal — cukup untuk menguji konversi ujung ke ujung
 * tanpa menyimpan fixture biner di repo.
 */
async function buildSampleDocx(): Promise<Buffer> {
  const paragraph = (
    runs: Array<[string, ("b" | "i" | "bi")?]>,
    options: { style?: string; numbered?: boolean } = {},
  ) => {
    const properties: string[] = [];
    if (options.style) properties.push(`<w:pStyle w:val="${options.style}"/>`);
    if (options.numbered) {
      properties.push('<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>');
    }
    const pPr = properties.length ? `<w:pPr>${properties.join("")}</w:pPr>` : "";
    const body = runs
      .map(([text, format]) => {
        const marks = format
          ? `<w:rPr>${format.includes("b") ? "<w:b/>" : ""}${format.includes("i") ? "<w:i/>" : ""}</w:rPr>`
          : "";
        return `<w:r>${marks}<w:t xml:space="preserve">${text}</w:t></w:r>`;
      })
      .join("");
    return `<w:p>${pPr}${body}</w:p>`;
  };
  const cell = (text: string) =>
    `<w:tc><w:tcPr><w:tcW w:w="2400" w:type="dxa"/></w:tcPr>${paragraph([[text]])}</w:tc>`;
  const table =
    "<w:tbl><w:tblPr><w:tblW w:w=\"0\" w:type=\"auto\"/></w:tblPr>" +
    `<w:tr>${cell("Nama")}${cell("Nilai")}</w:tr>` +
    `<w:tr>${cell("Debit")}${cell("100")}</w:tr></w:tbl>`;
  const hyperlink =
    '<w:p><w:r><w:t xml:space="preserve">Kunjungi </w:t></w:r>' +
    '<w:hyperlink r:id="rId3"><w:r><w:rPr><w:u w:val="single"/></w:rPr><w:t>Situs UNTIDAR</w:t></w:r></w:hyperlink>' +
    '<w:r><w:t xml:space="preserve"> untuk info.</w:t></w:r></w:p>';
  const document =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>' +
    paragraph([["Pengantar Akuntansi Dasar"]], { style: "Heading1" }) +
    paragraph([
      ["Teks pembuka dengan "],
      ["kata tebal", "b"],
      [", "],
      ["kata miring", "i"],
      [" dan "],
      ["gabungan", "bi"],
      ["."],
    ]) +
    paragraph([["Sub Bab Satu"]], { style: "Heading2" }) +
    paragraph([["Isi sub bab pertama."]]) +
    paragraph([["Poin pertama"]], { numbered: true }) +
    paragraph([["Poin kedua"]], { numbered: true }) +
    table +
    hyperlink +
    "</w:body></w:document>";

  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
      '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
      '<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/></Types>',
  );
  zip.file(
    "_rels/.rels",
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
  );
  zip.file("word/document.xml", document);
  zip.file(
    "word/_rels/document.xml.rels",
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
      '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>' +
      '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="https://untidar.ac.id" TargetMode="External"/></Relationships>',
  );
  zip.file(
    "word/styles.xml",
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      '<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:rPr><w:b/><w:sz w:val="32"/></w:rPr></w:style>' +
      '<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:rPr><w:b/><w:sz w:val="28"/></w:rPr></w:style>' +
      '<w:style w:type="paragraph" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:sz w:val="22"/></w:rPr></w:style></w:styles>',
  );
  zip.file(
    "word/numbering.xml",
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      '<w:abstractNum w:abstractNumId="0"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="\u2022"/></w:lvl></w:abstractNum>' +
      '<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num></w:numbering>',
  );
  return zip.generateAsync({ type: "nodebuffer" });
}

test("htmlToMarkdown keeps editorial formatting", () => {
  const { markdown } = htmlToMarkdown(
    "<h1>Judul</h1><p>Teks <strong>tebal</strong>, <em>miring</em>, dan <strong><em>gabungan</em></strong>.</p>" +
      "<h2>Sub Judul</h2><ul><li>Satu</li><li>Dua</li></ul>" +
      "<blockquote><p>Kutipan penting.</p></blockquote>",
  );
  assert.match(markdown, /^# Judul$/m);
  assert.match(markdown, /\*\*tebal\*\*/);
  assert.match(markdown, /\*miring\*/);
  assert.match(markdown, /\*\*\*gabungan\*\*\*/);
  assert.match(markdown, /^## Sub Judul$/m);
  assert.match(markdown, /^- +Satu$/m);
  assert.match(markdown, /^> Kutipan penting\.$/m);
});

test("htmlToMarkdown drops images but counts them", () => {
  const { markdown, droppedImages } = htmlToMarkdown(
    '<p>Sebelum <img src="a.png" alt="A"> sesudah</p><p><img src="b.png"></p>',
  );
  assert.equal(droppedImages, 2);
  assert.ok(!markdown.includes("<img"));
  assert.match(markdown, /Sebelum\s+sesudah/);
});

test("htmlToMarkdown only keeps safe link schemes", () => {
  const { markdown } = htmlToMarkdown(
    '<p><a href="https://contoh.id/artikel">aman</a> <a href="javascript:alert(1)">berbahaya</a> <a href="mailto:a@b.id">email</a></p>',
  );
  assert.match(markdown, /\[aman\]\(https:\/\/contoh\.id\/artikel\)/);
  assert.match(markdown, /\[email\]\(mailto:a@b\.id\)/);
  assert.ok(!markdown.includes("javascript:"));
  assert.match(markdown, /berbahaya/);
});

test("htmlToMarkdown converts a regular table to a Markdown table", () => {
  const { markdown } = htmlToMarkdown(
    "<table><tr><th>Nama</th><th>Nilai</th></tr><tr><td>Debit</td><td>100</td></tr></table>",
  );
  assert.match(markdown, /\| Nama \| Nilai \|/);
  assert.match(markdown, /\| --- \| --- \|/);
  assert.match(markdown, /\| Debit \| 100 \|/);
});

test("splitTitleFromMarkdown takes the first heading as the title", () => {
  const { title, body } = splitTitleFromMarkdown("# Judul **Artikel**\n\nIsi pertama.\n\nIsi kedua.");
  assert.equal(title, "Judul Artikel");
  assert.equal(body, "Isi pertama.\n\nIsi kedua.");
  const plain = splitTitleFromMarkdown("Tanpa heading.\n\nIsi.");
  assert.equal(plain.title, null);
  assert.equal(plain.body, "Tanpa heading.\n\nIsi.");
});

test("docxToMarkdown converts a generated document end to end", async () => {
  const result = await docxToMarkdown(await buildSampleDocx());
  assert.equal(result.title, "Pengantar Akuntansi Dasar");
  assert.match(result.markdown, /\*\*kata tebal\*\*/);
  assert.match(result.markdown, /\*kata miring\*/);
  assert.match(result.markdown, /^## Sub Bab Satu$/m);
  assert.match(result.markdown, /^- +Poin pertama$/m);
  assert.match(result.markdown, /\| Nama \| Nilai \|/);
  assert.match(result.markdown, /\[Situs UNTIDAR\]\(https:\/\/untidar\.ac\.id\)/);
  assert.equal(result.droppedImages, 0);
});

test("docxToMarkdown rejects a non-docx buffer", async () => {
  await assert.rejects(() => docxToMarkdown(Buffer.from("ini bukan file docx")));
});

test("markdownPlainText strips markers for feed previews", () => {
  const plain = markdownPlainText(
    "## Sub Judul\n\nTeks **tebal** dan *miring* dengan [tautan](https://contoh.id) dan `kode`.\n\n- Poin satu\n- Poin dua\n\n| Nama | Nilai |\n| --- | --- |\n| Debit | 100 |",
  );
  assert.equal(
    plain,
    "Sub Judul Teks tebal dan miring dengan tautan dan kode. Poin satu Poin dua Nama Nilai Debit 100",
  );
  assert.equal(markdownPlainText("field body_preview utuh"), "field body_preview utuh");
});

test("articleBodyPreview truncates long bodies with an ellipsis", () => {
  const preview = articleBodyPreview("kata ".repeat(100));
  assert.ok(preview.length <= 218 && preview.length >= 215, `panjang ${preview.length}`);
  assert.ok(preview.endsWith("…"));
});
