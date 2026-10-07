import 'package:flutter_test/flutter_test.dart';
import 'package:karsa_mobile/widgets/ai_text.dart';

void main() {
  test('parseAiText splits run-together numbered points', () {
    final lines = parseAiText(
      '1. indonesia adalah negara kepulauan 2. kekayaan indonesia melimpah 3. persatuan penting',
    );
    expect(lines.length, 3);
    expect((lines[0] as AiNumberedItem).number, '1');
    expect((lines[0] as AiNumberedItem).text, 'indonesia adalah negara kepulauan');
    expect((lines[1] as AiNumberedItem).text, 'kekayaan indonesia melimpah');
    expect((lines[2] as AiNumberedItem).text, 'persatuan penting');
  });

  test('parseAiText keeps already-newlined points and decimals intact', () {
    final neat = parseAiText('Ringkasan:\n1. satu\n2. dua');
    expect(neat.length, 3);
    expect(neat.first, isA<AiParagraph>());
    expect((neat[1] as AiNumberedItem).number, '1');

    final decimal = parseAiText('Nilai pi 3.14 dan tahun 2024. Maju terus.');
    expect(decimal.length, 1);
    expect(decimal.first, isA<AiParagraph>());
    expect(
      (decimal.first as AiParagraph).text,
      'Nilai pi 3.14 dan tahun 2024. Maju terus.',
    );
  });
}
