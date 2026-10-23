import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:karsa_mobile/widgets/markdown_text.dart';

String plainTextOf(List<InlineSpan> spans) => spans
    .map((span) => span is TextSpan ? (span.text ?? '') : '')
    .join();

void main() {
  test('markdownBlocks splits exactly like the backend paragraph rule', () {
    final blocks = markdownBlocks('Satu.\n\nDua.\n \nTiga.\n');
    expect(blocks, ['Satu.', 'Dua.', 'Tiga.']);
    expect(markdownBlocks(''), isEmpty);
    expect(markdownBlocks('Satu baris\nmasih satu blok'), [
      'Satu baris\nmasih satu blok',
    ]);
  });

  test('parseMarkdownInline formats bold, italic, and combined', () {
    const style = TextStyle(fontSize: 16);
    final spans = parseMarkdownInline(
      'Biasa **tebal** dan *miring* serta ***keduanya*** selesai.',
      style: style,
    );
    expect(plainTextOf(spans), 'Biasa tebal dan miring serta keduanya selesai.');
    final bold = spans.whereType<TextSpan>().firstWhere((s) => s.text == 'tebal');
    expect(bold.style?.fontWeight, FontWeight.w700);
    final italic = spans.whereType<TextSpan>().firstWhere((s) => s.text == 'miring');
    expect(italic.style?.fontStyle, FontStyle.italic);
    final both = spans.whereType<TextSpan>().firstWhere((s) => s.text == 'keduanya');
    expect(both.style?.fontWeight, FontWeight.w700);
    expect(both.style?.fontStyle, FontStyle.italic);
  });

  test('parseMarkdownInline nests italic inside bold', () {
    const style = TextStyle(fontSize: 16);
    final spans = parseMarkdownInline('**tebal *miring* lagi**', style: style);
    expect(plainTextOf(spans), 'tebal miring lagi');
    final inner = spans.whereType<TextSpan>().firstWhere((s) => s.text == 'miring');
    expect(inner.style?.fontWeight, FontWeight.w700);
    expect(inner.style?.fontStyle, FontStyle.italic);
  });

  test('parseMarkdownInline keeps code literal and snake_case untouched', () {
    const style = TextStyle(fontSize: 16);
    final code = parseMarkdownInline('Pakai `**bukan tebal**` di sini', style: style);
    expect(plainTextOf(code), 'Pakai **bukan tebal** di sini');
    final snake = parseMarkdownInline('field body_preview tetap polos', style: style);
    expect(plainTextOf(snake), 'field body_preview tetap polos');
  });

  test('parseMarkdownInline only linkifies safe schemes', () {
    const style = TextStyle(fontSize: 16);
    String? tapped;
    final spans = parseMarkdownInline(
      'Baca [panduan](https://contoh.id/p) dan [jahat](javascript:alert) ya',
      style: style,
      onTapLink: (url) => tapped = url,
    );
    expect(plainTextOf(spans), 'Baca panduan dan [jahat](javascript:alert) ya');
    final link = spans.whereType<TextSpan>().firstWhere((s) => s.text == 'panduan');
    expect(link.recognizer, isNotNull);
    (link.recognizer! as TapGestureRecognizer).onTap!();
    expect(tapped, 'https://contoh.id/p');
  });

  test('markdownPlainPreview strips markers like the server preview', () {
    final plain = markdownPlainPreview(
      '## Sub Judul\n\nTeks **tebal** dan *miring* dengan [tautan](https://contoh.id) dan `kode`.\n\n- Poin satu\n- Poin dua\n\n| Nama | Nilai |\n| --- | --- |\n| Debit | 100 |',
    );
    expect(
      plain,
      'Sub Judul Teks tebal dan miring dengan tautan dan kode. Poin satu Poin dua Nama Nilai Debit 100',
    );
  });

  testWidgets('MarkdownBlock renders a heading block', (tester) async {
    await tester.pumpWidget(const MaterialApp(
      home: Scaffold(body: MarkdownBlock('# Judul Besar')),
    ));
    expect(find.text('Judul Besar'), findsOneWidget);
  });

  testWidgets('MarkdownBody renders list and table blocks', (tester) async {
    await tester.pumpWidget(const MaterialApp(
      home: Scaffold(
        body: MarkdownBody(
          body: '- Poin satu\n- Poin dua\n\n| Nama | Nilai |\n| --- | --- |\n| Debit | 100 |',
        ),
      ),
    ));
    expect(find.text('Poin satu'), findsOneWidget);
    expect(find.text('Poin dua'), findsOneWidget);
    expect(find.text('Nama'), findsOneWidget);
    expect(find.text('Debit'), findsOneWidget);
  });
}
