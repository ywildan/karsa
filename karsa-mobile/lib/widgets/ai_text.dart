import 'package:flutter/material.dart';

/// Satu baris jawaban AI: paragraf biasa atau satu butir daftar bernomor.
sealed class AiTextLine {
  const AiTextLine();
}

class AiParagraph extends AiTextLine {
  const AiParagraph(this.text);
  final String text;
}

class AiNumberedItem extends AiTextLine {
  const AiNumberedItem(this.number, this.text);
  final String number;
  final String text;
}

/// Memecah jawaban AI menjadi baris-baris tampilan.
///
/// Provider kadang mengembalikan "1. ... 2. ... 3. ..." dalam satu baris.
/// Fungsi ini memecahnya dulu (dengan pengaman desimal seperti 3.14),
/// lalu mengelompokkan tiap "N. teks" menjadi butir daftar agar Flutter
/// bisa merendernya dengan indentasi yang rapi.
List<AiTextLine> parseAiText(String value) {
  final normalized = _normalizeAiBreaks(value);
  if (normalized.isEmpty) return const [];
  final lines = <AiTextLine>[];
  final buffer = StringBuffer();
  void flush() {
    final text = buffer.toString().trim();
    buffer.clear();
    if (text.isNotEmpty) lines.add(AiParagraph(text));
  }

  for (final raw in normalized.split('\n')) {
    final line = raw.trim();
    if (line.isEmpty) {
      flush();
      continue;
    }
    final match = RegExp(r'^(\d{1,2})\.\s+(.+)$').firstMatch(line);
    if (match != null) {
      flush();
      lines.add(AiNumberedItem(match.group(1)!, match.group(2)!.trim()));
    } else {
      if (buffer.isNotEmpty) buffer.write(' ');
      buffer.write(line);
    }
  }
  flush();
  return lines;
}

String _normalizeAiBreaks(String value) {
  var text = value.replaceAll(RegExp(r'\r\n?'), '\n');
  // Hanya pecah bila ada bukti daftar berurutan "1. ... 2. ..." supaya
  // desimal seperti 3.14 dan tahun seperti 2024 tidak ikut terbelah.
  if (!RegExp(r'\b1\.\s+\S[\s\S]{0,400}?\b2\.\s+\S').hasMatch(text)) {
    return text.split('\n').map((line) => line.trimRight()).join('\n').trim();
  }
  text = text
      .replaceAllMapped(
        RegExp(r'([^\n:])\s+(\d{1,2}\.\s+[A-Za-zÀ-ɏḀ-ỿ])'),
        (match) => '${match.group(1)}\n${match.group(2)}',
      )
      .replaceAllMapped(
        RegExp(r'(:)\s+(1\.\s+[A-Za-zÀ-ɏḀ-ỿ])'),
        (match) => '${match.group(1)}\n${match.group(2)}',
      );
  return text.split('\n').map((line) => line.trimRight()).join('\n').trim();
}

/// Menampilkan jawaban AI dengan daftar bernomor yang rapi.
class AiAnswerText extends StatelessWidget {
  const AiAnswerText(this.text, {super.key});
  final String text;

  @override
  Widget build(BuildContext context) {
    const style = TextStyle(fontSize: 15, height: 1.6);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (final line in parseAiText(text))
          switch (line) {
            AiNumberedItem(number: final number, text: final item) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SizedBox(
                    width: 26,
                    child: Text('$number.',
                        style: style.copyWith(fontWeight: FontWeight.w700)),
                  ),
                  Expanded(child: SelectableText(item, style: style)),
                ],
              ),
            ),
            AiParagraph(text: final paragraph) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: SelectableText(paragraph, style: style),
            ),
          },
      ],
    );
  }
}
