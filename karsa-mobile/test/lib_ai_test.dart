import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:karsa_mobile/core/api_client.dart';
import 'package:karsa_mobile/core/models.dart';
import 'package:karsa_mobile/screens/karsa_lib_article_screen.dart';

class ArticleAiApi extends ApiClient {
  ArticleAiApi({required this.enabled});
  final bool enabled;
  int stateCalls = 0;
  int providerCalls = 0;
  final response = Completer<Map<String, dynamic>>();

  @override
  Future<LibArticle> libArticle(String articleId) async => LibArticle(
    id: articleId, title: 'Materi jurnal', body: 'Paragraf satu.\n\nParagraf dua.',
    authorId: 'author', authorName: 'Penulis', views: 1, commentsCount: 0,
    aiEnabled: enabled, aiRevision: enabled ? 'revision' : null,
  );
  @override
  Future<List<LibComment>> libComments(String articleId) async => [];
  @override
  Future<LibAiState> libAiState(String articleId, String revision) async {
    stateCalls++;
    return LibAiState(enabled: enabled, revision: revision, turns: const [],
      quota: const LibAiQuota(remaining: 5, limit: 5, summaryRemaining: 3));
  }
  @override
  Future<Map<String, dynamic>> askLibAi(String articleId, {
    required String revision, required String question, required String requestId,
    bool webSearch = false,
  }) {
    providerCalls++;
    return response.future;
  }
}

void main() {
  test('old backend leaves AI disabled and parses an empty disabled state', () {
    final article = LibArticle.fromJson({'id': 'a'});
    expect(article.aiEnabled, isFalse);
    expect(article.aiRevision, isNull);
    final state = LibAiState.fromJson({'enabled': false, 'revision': 'r', 'messages': [], 'quota': null});
    expect(state.enabled, isFalse);
    expect(state.quota, isNull);
  });

  testWidgets('development buttons cannot open a sheet or request AI', (tester) async {
    final api = ArticleAiApi(enabled: false);
    await tester.pumpWidget(MaterialApp(home: KarsaLibArticleScreen(api: api, articleId: 'a')));
    await tester.pumpAndSettle();
    expect(find.text('Dalam pengembangan'), findsOneWidget);
    expect(tester.widget<OutlinedButton>(find.widgetWithText(OutlinedButton, 'Ringkas')).onPressed, isNull);
    expect(tester.widget<FilledButton>(find.widgetWithText(FilledButton, 'Tanya AI')).onPressed, isNull);
    await tester.tap(find.text('Tanya AI'));
    await tester.pumpAndSettle();
    expect(api.stateCalls, 0);
    expect(api.providerCalls, 0);
  });

  testWidgets('chat fits a narrow screen with keyboard and preserves a newly typed draft', (tester) async {
    tester.view.physicalSize = const Size(360, 800);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.view.resetViewInsets);
    final api = ArticleAiApi(enabled: true);
    await tester.pumpWidget(MaterialApp(home: KarsaLibArticleScreen(api: api, articleId: 'a')));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Tanya AI'));
    await tester.pumpAndSettle();
    final question = find.byWidgetPredicate((widget) => widget is TextField && widget.decoration?.hintText == 'Tanya tentang materi…');
    tester.view.viewInsets = const FakeViewPadding(bottom: 280);
    await tester.pumpAndSettle();
    await tester.enterText(question, 'Apa inti materi?');
    await tester.tap(find.byTooltip('Kirim pertanyaan'));
    await tester.pump();
    expect(tester.widget<TextField>(question).enabled, isTrue);
    await tester.enterText(question, 'Pertanyaan selanjutnya');
    api.response.complete({'id': 'turn', 'question': 'Apa inti materi?', 'answer': 'Jawaban dari artikel.',
      'sources': [1], 'quota': {'remaining': 4, 'limit': 5, 'summary_remaining': 3}});
    await tester.pumpAndSettle();
    expect(tester.widget<TextField>(question).controller?.text, 'Pertanyaan selanjutnya');
    expect(api.providerCalls, 1);
    tester.view.viewInsets = const FakeViewPadding();
    await tester.pumpAndSettle();
    expect(find.text('4 / 5 pertanyaan tersisa hari ini'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
