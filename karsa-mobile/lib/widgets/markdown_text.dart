import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import 'common.dart';

/// Renderer Markdown ringan untuk isi artikel Karsa Lib.
///
/// Format yang didukung mengikuti hasil konversi .docx dan penulisan
/// manual di editor: heading (# s.d. ######), **tebal**, *miring*,
/// ***tebal miring***, `kode`, tautan [teks](url), daftar tak berurutan
/// (- atau *), daftar berurutan (1.), kutipan (>), dan tabel Markdown.
///
/// Blok dipisah dengan aturan yang PERSIS sama seperti backend
/// (`articleParagraphs` di lib/karsa-lib/ai-policy.ts: pisah pada baris
/// kosong) supaya nomor blok di sini selalu sama dengan nomor paragraf
/// yang dikutip Teman Baca ("Paragraf N").
List<String> markdownBlocks(String body) => body
    .trim()
    .split(RegExp(r'\n\s*\n'))
    .map((part) => part.trim())
    .where((part) => part.isNotEmpty)
    .toList();

// Grup tangkap berpasangan: grup ganjil = token utuh, grup genap = isinya.
// Urutan penting: kode dan *** harus dicoba sebelum ** dan *.
final _inlinePattern = RegExp(
  r'(`([^`\n]+)`)' // 1-2: kode sebaris
  r'|(\*\*\*([^\n]+?)\*\*\*)' // 3-4: tebal + miring
  r'|(\*\*([^\n]+?)\*\*)' // 5-6: tebal
  r'|(\*([^*\n]+?)\*)' // 7-8: miring (bintang)
  r'|((?:^|[\s(])_([^_\n]+?)_(?=$|[\s).,;:!?]))' // 9-10: miring (garis bawah)
  r'|(\[([^\]\n]+?)\]\(((?:https?:\/\/|mailto:)[^)\s]+?)\))', // 11-12-13: tautan aman
);

/// Memecah teks sebaris menjadi span berformat. [style] adalah gaya dasar
/// yang diwarisi (mis. tambahan tebal dari konteks luar).
List<InlineSpan> parseMarkdownInline(
  String text, {
  required TextStyle style,
  void Function(String url)? onTapLink,
}) {
  final spans = <InlineSpan>[];
  var rest = text;
  while (rest.isNotEmpty) {
    final match = _inlinePattern.firstMatch(rest);
    if (match == null) {
      spans.add(TextSpan(text: rest, style: style));
      break;
    }
    if (match.start > 0) {
      spans.add(TextSpan(text: rest.substring(0, match.start), style: style));
    }
    final token = match.group(0)!;
    if (match.group(2) != null) {
      // Kode sebaris.
      spans.add(TextSpan(
        text: match.group(2)!,
        style: style.copyWith(
          fontFamily: 'monospace',
          backgroundColor: KarsaColors.tintSoft,
        ),
      ));
    } else if (match.group(4) != null) {
      spans.addAll(parseMarkdownInline(
        match.group(4)!,
        style: style.copyWith(fontWeight: FontWeight.w700, fontStyle: FontStyle.italic),
        onTapLink: onTapLink,
      ));
    } else if (match.group(6) != null) {
      spans.addAll(parseMarkdownInline(
        match.group(6)!,
        style: style.copyWith(fontWeight: FontWeight.w700),
        onTapLink: onTapLink,
      ));
    } else if (match.group(8) != null) {
      spans.addAll(parseMarkdownInline(
        match.group(8)!,
        style: style.copyWith(fontStyle: FontStyle.italic),
        onTapLink: onTapLink,
      ));
    } else if (match.group(10) != null) {
      // Miring garis bawah: karakter sebelum _ (spasi/tanda kurung)
      // bukan bagian format dan ditampilkan apa adanya.
      final prefixLength = token.length - (match.group(10)!.length + 2);
      if (prefixLength > 0) spans.add(TextSpan(text: token.substring(0, prefixLength), style: style));
      spans.addAll(parseMarkdownInline(
        match.group(10)!,
        style: style.copyWith(fontStyle: FontStyle.italic),
        onTapLink: onTapLink,
      ));
    } else if (match.group(12) != null) {
      final label = match.group(12)!;
      final url = match.group(13)!;
      spans.add(TextSpan(
        text: label,
        style: style.copyWith(
          color: KarsaColors.accentInk,
          decoration: TextDecoration.underline,
        ),
        recognizer: onTapLink == null
            ? null
            : (TapGestureRecognizer()..onTap = () => onTapLink(url)),
      ));
    }
    rest = rest.substring(match.end);
  }
  return spans;
}

Future<void> openMarkdownLink(String url) async {
  final uri = Uri.tryParse(url);
  if (uri == null) return;
  if (uri.scheme != 'http' && uri.scheme != 'https' && uri.scheme != 'mailto') return;
  await launchUrl(uri, mode: LaunchMode.externalApplication);
}

/// Versi Dart dari `markdownPlainText` di server: mengubah Markdown
/// menjadi teks polos satu baris untuk cuplikan kartu — dipakai daftar
/// Tulisan saya yang menerima body utuh (untuk keperluan edit) sehingga
/// penanda seperti ** tidak boleh tampil mentah di kartu.
String markdownPlainPreview(String markdown, {int max = 220}) {
  var text = markdown
      .replaceAll(RegExp(r'```[\s\S]*?```'), ' ')
      .replaceAllMapped(RegExp(r'`([^`]*)`'), (match) => match.group(1)!)
      .replaceAllMapped(RegExp(r'!\[([^\]]*)\]\([^)]*\)'), (match) => match.group(1)!)
      .replaceAllMapped(RegExp(r'\[([^\]]+)\]\([^)]*\)'), (match) => match.group(1)!)
      .replaceAll(RegExp(r'^#{1,6}\s+', multiLine: true), '')
      .replaceAll(RegExp(r'^>\s?', multiLine: true), '')
      .replaceAll(RegExp(r'^\s*([-*+]|\d{1,3}[.)])\s+', multiLine: true), '')
      .replaceAll(RegExp(r'^\|?[\s:|-]+\|?$', multiLine: true), ' ')
      .replaceAll('|', ' ')
      .replaceAll('***', '')
      .replaceAll('**', '')
      .replaceAll('*', '')
      .replaceAll(RegExp(r'\s+'), ' ')
      .trim();
  if (text.length > max) text = '${text.substring(0, max - 3).trimRight()}…';
  return text;
}

/// Merender SATU blok Markdown (heading / daftar / kutipan / tabel /
/// paragraf) dengan gaya editorial artikel.
class MarkdownBlock extends StatelessWidget {
  const MarkdownBlock(this.block, {super.key, this.onTapLink});
  final String block;
  final void Function(String url)? onTapLink;

  static const _bodyStyle = TextStyle(fontSize: 16, height: 1.85, color: KarsaColors.ink);

  @override
  Widget build(BuildContext context) {
    final lines = block.split('\n').map((line) => line.trimRight()).toList();
    final firstLine = lines.first.trim();

    // Heading: blok satu baris yang diawali #.
    if (lines.length == 1) {
      final heading = RegExp(r'^(#{1,6})\s+(.+)$').firstMatch(firstLine);
      if (heading != null) {
        final level = heading.group(1)!.length;
        final style = switch (level) {
          1 => const TextStyle(fontSize: 24, height: 1.35, fontWeight: FontWeight.w800, color: KarsaColors.ink),
          2 => const TextStyle(fontSize: 20, height: 1.4, fontWeight: FontWeight.w800, color: KarsaColors.ink),
          3 => const TextStyle(fontSize: 17, height: 1.45, fontWeight: FontWeight.w700, color: KarsaColors.ink),
          _ => const TextStyle(fontSize: 16, height: 1.5, fontWeight: FontWeight.w700, color: KarsaColors.ink),
        };
        return Text.rich(TextSpan(children: parseMarkdownInline(heading.group(2)!, style: style, onTapLink: onTapLink)));
      }
    }

    // Heading di baris pertama blok yang berisi lebih dari satu baris
    // (penulis manual sering tidak memberi baris kosong sesudahnya):
    // tampilkan heading dan sisa blok secara terpisah. Blok tetap satu
    // kesatuan untuk penomoran paragraf backend.
    if (lines.length > 1 && RegExp(r'^#{1,6}\s+.+$').hasMatch(firstLine)) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          MarkdownBlock(firstLine, onTapLink: onTapLink),
          const SizedBox(height: 8),
          MarkdownBlock(lines.skip(1).join('\n'), onTapLink: onTapLink),
        ],
      );
    }

    // Tabel Markdown: semua baris diawali |.
    if (lines.length >= 2 && lines.every((line) => line.trim().startsWith('|'))) {
      return _buildTable(lines);
    }

    // Daftar tak berurutan.
    if (lines.every((line) => RegExp(r'^\s*[-*]\s+').hasMatch(line))) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          for (final line in lines)
            _listRow('•', line.replaceFirst(RegExp(r'^\s*[-*]\s+'), '')),
        ],
      );
    }

    // Daftar berurutan.
    if (lines.every((line) => RegExp(r'^\s*\d{1,3}[.)]\s+').hasMatch(line))) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          for (final line in lines)
            _listRow(
              '${RegExp(r'^\s*(\d{1,3})[.)]').firstMatch(line)!.group(1)}.',
              line.replaceFirst(RegExp(r'^\s*\d{1,3}[.)]\s+'), ''),
            ),
        ],
      );
    }

    // Kutipan: semua baris diawali >.
    if (lines.every((line) => line.trim().startsWith('>'))) {
      final text = lines.map((line) => line.trim().replaceFirst(RegExp(r'^>\s?'), '')).join('\n');
      return Container(
        padding: const EdgeInsets.only(left: 14),
        decoration: const BoxDecoration(
          border: Border(left: BorderSide(color: KarsaColors.tintStrong, width: 3)),
        ),
        child: Text.rich(TextSpan(
          children: parseMarkdownInline(
            text,
            style: _bodyStyle.copyWith(fontStyle: FontStyle.italic, color: KarsaColors.muted),
            onTapLink: onTapLink,
          ),
        )),
      );
    }

    // Paragraf biasa (baris tunggal digabung spasi hanya antar kata yang
    // terpisah baris lunak; karakter \n dipertahankan sebagai jeda baris).
    return Text.rich(TextSpan(
      children: parseMarkdownInline(block.trim(), style: _bodyStyle, onTapLink: onTapLink),
    ));
  }

  Widget _listRow(String marker, String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 26,
            child: Text(marker, style: _bodyStyle.copyWith(fontWeight: FontWeight.w700)),
          ),
          Expanded(
            child: Text.rich(TextSpan(
              children: parseMarkdownInline(text, style: _bodyStyle, onTapLink: onTapLink),
            )),
          ),
        ],
      ),
    );
  }

  Widget _buildTable(List<String> lines) {
    List<String> cellsOf(String line) {
      var value = line.trim();
      if (value.startsWith('|')) value = value.substring(1);
      if (value.endsWith('|')) value = value.substring(0, value.length - 1);
      return value.split('|').map((cell) => cell.trim().replaceAll(r'\|', '|')).toList();
    }

    final rows = lines.map(cellsOf).toList();
    final isSeparator = (List<String> row) => row.every((cell) => RegExp(r'^:?-{3,}:?$').hasMatch(cell));
    final dataRows = rows.where((row) => !isSeparator(row)).toList();
    if (dataRows.isEmpty) return const SizedBox.shrink();
    final header = dataRows.first;
    final bodyRows = dataRows.skip(1).toList();
    const cellPadding = EdgeInsets.symmetric(horizontal: 10, vertical: 8);
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Table(
        defaultColumnWidth: const IntrinsicColumnWidth(),
        border: TableBorder.all(color: KarsaColors.border),
        children: [
          TableRow(
            decoration: const BoxDecoration(color: KarsaColors.tintSoft),
            children: [
              for (final cell in header)
                Padding(
                  padding: cellPadding,
                  child: Text.rich(TextSpan(
                    children: parseMarkdownInline(cell, style: _bodyStyle.copyWith(fontSize: 14, fontWeight: FontWeight.w700), onTapLink: onTapLink),
                  )),
                ),
            ],
          ),
          for (final row in bodyRows)
            TableRow(children: [
              for (final cell in row)
                Padding(
                  padding: cellPadding,
                  child: Text.rich(TextSpan(
                    children: parseMarkdownInline(cell, style: _bodyStyle.copyWith(fontSize: 14), onTapLink: onTapLink),
                  )),
                ),
            ]),
        ],
      ),
    );
  }
}

/// Merender seluruh isi artikel blok demi blok. [blockKeys] (opsional)
/// memetakan nomor blok 1-based ke GlobalKey — dipakai halaman artikel
/// agar kutipan "Paragraf N" dari Teman Baca bisa menggulir ke blok itu.
class MarkdownBody extends StatelessWidget {
  const MarkdownBody({
    required this.body,
    super.key,
    this.blockKeys,
    this.onTapLink,
    this.spacing = 16,
  });
  final String body;
  final Map<int, GlobalKey>? blockKeys;
  final void Function(String url)? onTapLink;
  final double spacing;

  @override
  Widget build(BuildContext context) {
    final blocks = markdownBlocks(body);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (var index = 0; index < blocks.length; index++)
          Padding(
            key: blockKeys?.putIfAbsent(index + 1, () => GlobalKey()),
            padding: EdgeInsets.only(bottom: index == blocks.length - 1 ? 0 : spacing),
            child: MarkdownBlock(blocks[index], onTapLink: onTapLink),
          ),
      ],
    );
  }
}
