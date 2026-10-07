import 'package:flutter/material.dart';

import '../core/api_client.dart';
import '../core/models.dart';
import '../core/pending_submission.dart';
import 'ai_text.dart';
import 'common.dart';

class LibAiSheetResult {
  const LibAiSheetResult({this.source, this.reloadArticle = false});
  final int? source;
  final bool reloadArticle;
}

Future<LibAiSheetResult?> showLibAiSheet(BuildContext context, {
  required ApiClient api, required LibArticle article, required bool summarize,
}) => showModalBottomSheet<LibAiSheetResult>(
  context: context,
  isScrollControlled: true,
  useSafeArea: true,
  showDragHandle: true,
  backgroundColor: KarsaColors.background,
  builder: (context) => Padding(
    padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
    child: FractionallySizedBox(
      heightFactor: .88,
      child: _LibAiSheet(api: api, article: article, summarize: summarize),
    ),
  ),
);

class _LibAiSheet extends StatefulWidget {
  const _LibAiSheet({required this.api, required this.article, required this.summarize});
  final ApiClient api;
  final LibArticle article;
  final bool summarize;
  @override
  State<_LibAiSheet> createState() => _LibAiSheetState();
}

class _LibAiSheetState extends State<_LibAiSheet> {
  final _question = TextEditingController();
  final _focus = FocusNode();
  final _scroll = ScrollController();
  final _submission = PendingSubmission();
  final List<LibAiTurn> _turns = [];
  LibAiQuota? _quota;
  LibAiText? _summary;
  String _revision = '';
  String? _pendingQuestion;
  String? _error;
  bool _loading = true;
  bool _enabled = false;
  bool _sending = false;
  late bool _summarize;

  @override
  void initState() { super.initState(); _summarize = widget.summarize; _load(); }
  @override
  void dispose() { _question.dispose(); _focus.dispose(); _scroll.dispose(); super.dispose(); }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final state = await widget.api.libAiState(widget.article.id, widget.article.aiRevision ?? '');
      if (!mounted) return;
      setState(() {
        _enabled = state.enabled; _revision = state.revision; _summary = state.summary;
        _quota = state.quota; _turns..clear()..addAll(state.turns);
      });
      _scrollToEnd();
    } catch (error) { _handleError(error); }
    finally { if (mounted) setState(() => _loading = false); }
  }

  void _handleError(Object error) {
    if (!mounted) return;
    if (error is ApiException && error.code == 'AI_ARTICLE_CHANGED') {
      Navigator.pop(context, const LibAiSheetResult(reloadArticle: true));
      return;
    }
    setState(() => _error = friendlyError(error));
  }

  void _scrollToEnd() => WidgetsBinding.instance.addPostFrameCallback((_) {
    if (mounted && _scroll.hasClients) {
      _scroll.jumpTo(_scroll.position.maxScrollExtent);
    }
  });

  Future<void> _syncQuota() async {
    if (!mounted) return;
    try {
      final state = await widget.api.libAiState(widget.article.id, _revision);
      if (mounted) setState(() { _quota = state.quota; _enabled = state.enabled; });
    } catch (_) {
      // Error utama tetap terlihat; refresh kuota tidak mengirim ulang ke AI.
    }
  }

  Future<void> _createSummary() async {
    if (_sending || !_enabled || (_quota?.summaryRemaining ?? 0) == 0) return;
    setState(() { _sending = true; _error = null; });
    try {
      final response = await widget.api.libAiSummary(widget.article.id, _revision);
      if (!mounted) return;
      setState(() { _summary = LibAiText.fromJson(response); _quota = LibAiQuota.fromJson(response['quota'] as Map<String, dynamic>); });
    } catch (error) { _handleError(error); await _syncQuota(); }
    finally { if (mounted) setState(() => _sending = false); }
  }

  Future<void> _send() async {
    final draft = _question.text;
    final text = draft.trim();
    if (_sending || !_enabled || text.isEmpty || (_quota?.remaining ?? 0) == 0) return;
    _focus.requestFocus();
    setState(() { _sending = true; _pendingQuestion = text; _error = null; });
    _scrollToEnd();
    try {
      final response = await widget.api.askLibAi(widget.article.id,
        revision: _revision, question: text,
        requestId: _submission.keyFor({'article': widget.article.id, 'revision': _revision, 'question': text}));
      _submission.complete();
      if (!mounted) return;
      final turn = LibAiTurn.fromJson(response);
      setState(() {
        _turns.removeWhere((item) => item.id == turn.id); _turns.add(turn);
        _quota = LibAiQuota.fromJson(response['quota'] as Map<String, dynamic>);
        if (_question.text == draft) {
          _question.clear();
        } else if (_question.text.startsWith(draft)) {
          final next = _question.text.substring(draft.length);
          _question.value = TextEditingValue(text: next, selection: TextSelection.collapsed(offset: next.length));
        }
      });
    } catch (error) {
      if (error is ApiException && error.code == 'AI_REQUEST_FAILED') _submission.complete();
      _handleError(error);
      await _syncQuota();
    } finally {
      if (mounted) { setState(() { _sending = false; _pendingQuestion = null; }); _scrollToEnd(); }
    }
  }

  Widget _sources(List<int> sources) => Wrap(spacing: 4, children: [
    for (final source in sources) TextButton(
      onPressed: () => Navigator.pop(context, LibAiSheetResult(source: source)),
      child: Text('Paragraf $source ↗', style: const TextStyle(fontSize: 12)),
    ),
  ]);

  Widget _answer(String text, List<int> sources) => Container(
    width: double.infinity,
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(color: const Color(0xFFFFF2E7), borderRadius: BorderRadius.circular(16)),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      AiAnswerText(text),
      if (sources.isNotEmpty) ...[
        const SizedBox(height: 8),
        _sources(sources),
      ],
    ]),
  );

  @override
  Widget build(BuildContext context) => Column(children: [
    Padding(padding: const EdgeInsets.fromLTRB(18, 0, 8, 8), child: Row(children: [
      const Icon(Icons.auto_awesome_outlined, color: KarsaColors.orange, size: 21),
      const SizedBox(width: 8),
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('Teman baca', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
        Text(widget.article.title, maxLines: 1, overflow: TextOverflow.ellipsis,
          style: const TextStyle(fontSize: 12, color: KarsaColors.muted)),
      ])),
      IconButton(tooltip: 'Tutup Teman baca', onPressed: () => Navigator.pop(context), icon: const Icon(Icons.close_rounded)),
    ])),
    Row(children: [
      Expanded(child: TextButton(onPressed: () { _focus.unfocus(); setState(() => _summarize = true); },
        child: Text('Ringkasan', style: TextStyle(color: _summarize ? KarsaColors.orange : KarsaColors.muted)))),
      Expanded(child: TextButton(onPressed: () => setState(() => _summarize = false),
        child: Text('Tanya materi', style: TextStyle(color: !_summarize ? KarsaColors.orange : KarsaColors.muted)))),
    ]),
    Expanded(child: _loading ? const LoadingState(message: 'Menyiapkan Teman baca…')
      : !_enabled ? Center(child: SingleChildScrollView(padding: const EdgeInsets.all(24), child: Column(mainAxisSize: MainAxisSize.min, children: [
          Text(_error ?? 'Teman baca masih dalam pengembangan.'),
          if (_error != null) TextButton(onPressed: _load, child: const Text('Coba lagi')),
        ])))
      : _summarize ? _summaryView() : _chatView()),
    if (!_loading && _enabled && !_summarize)
      AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        curve: Curves.easeOut,
        child: _composer(),
      ),
  ]);

  Widget _summaryView() => ListView(padding: const EdgeInsets.all(18), children: [
    if (_error != null) Padding(padding: const EdgeInsets.only(bottom: 12),
      child: Text(_error!, style: const TextStyle(fontSize: 12, color: KarsaColors.muted))),
    if (_summary != null) ...[
      _answer(_summary!.body, _summary!.sources),
      const SizedBox(height: 12),
      FilledButton(onPressed: () => setState(() => _summarize = false), child: const Text('Tanya tentang ringkasan')),
    ] else ...[
      const Text('Poin-poin penting artikel', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
      const SizedBox(height: 10),
      const Text('Buat ringkasan untuk membantu memahami materi. Isi artikel akan dikirim ke penyedia AI Karsa.'),
      const SizedBox(height: 16),
      FilledButton.icon(onPressed: _sending || (_quota?.summaryRemaining ?? 0) == 0 ? null : _createSummary,
        icon: const Icon(Icons.auto_awesome_outlined), label: Text(_sending && _pendingQuestion == null ? 'Menyiapkan ringkasan…' : 'Buat ringkasan')),
      if ((_quota?.summaryRemaining ?? 0) == 0) ...[
        const Text('Kuota membuat ringkasan baru hari ini habis.'),
        TextButton(onPressed: _sending ? null : _load, child: const Text('Periksa ringkasan tersimpan')),
      ],
    ],
    const SizedBox(height: 14),
    const Text('AI dapat keliru. Periksa kembali artikel dan sumber belajarmu.', style: TextStyle(fontSize: 12, color: KarsaColors.muted)),
  ]);

  Widget _chatView() => ListView(controller: _scroll, padding: const EdgeInsets.fromLTRB(18, 10, 18, 18), children: [
    if (_turns.isEmpty && _pendingQuestion == null) ...[
      const Text('Ada bagian yang belum jelas?', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
      const SizedBox(height: 8),
      const Text('Tanyakan materi dari artikel ini. Jawaban menyertakan rujukan paragraf jika tersedia.'),
      const SizedBox(height: 16),
      for (final example in ['Apa inti artikel ini?', 'Jelaskan konsep utama dengan bahasa sederhana.']) Padding(
        padding: const EdgeInsets.only(bottom: 8), child: OutlinedButton(
          onPressed: (_quota?.remaining ?? 0) == 0 ? null : () { _question.text = example; _focus.requestFocus(); },
          child: Text(example),
        )),
    ],
    for (final turn in _turns) ...[
      Padding(padding: const EdgeInsets.fromLTRB(24, 12, 0, 8), child: Text(turn.question, textAlign: TextAlign.right,
        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600))),
      _answer(turn.answer, turn.sources),
    ],
    if (_pendingQuestion != null) ...[
      Padding(padding: const EdgeInsets.only(top: 16, bottom: 8), child: Text(_pendingQuestion!, textAlign: TextAlign.right)),
      const Text('Teman baca sedang menyiapkan jawaban…', style: TextStyle(color: KarsaColors.muted, fontSize: 12)),
    ],
    if (_error != null) Padding(padding: const EdgeInsets.only(top: 12),
      child: Text(_error!, style: const TextStyle(fontSize: 12, color: KarsaColors.muted))),
  ]);

  /// Composer selalu memakai struktur widget yang sama walau keyboard
  /// buka/tutup: hanya visibilitas teks pembantu yang berubah, bukan
  /// kehadiran widgetnya. Mengganti kehadiran widget saat inset berubah
  /// menggeser layout dan membuat fokus TextField terlepas.
  Widget _composer() {
    final keyboardOpen = MediaQuery.viewInsetsOf(context).bottom > 0;
    return SafeArea(top: false, child: Padding(
      padding: const EdgeInsets.fromLTRB(14, 8, 14, 10),
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        AnimatedOpacity(
          duration: const Duration(milliseconds: 150),
          opacity: keyboardOpen ? 0 : 1,
          child: IgnorePointer(
            ignoring: keyboardOpen,
            child: Text('${_quota?.remaining ?? 0} / ${_quota?.limit ?? 0} pertanyaan tersisa hari ini',
              style: const TextStyle(fontSize: 11, color: KarsaColors.muted)),
          ),
        ),
        const SizedBox(height: 8),
        Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
          Expanded(child: TextField(controller: _question, focusNode: _focus,
            enabled: (_quota?.remaining ?? 0) > 0, minLines: 1, maxLines: 3, maxLength: 600,
            textInputAction: TextInputAction.newline,
            onEditingComplete: () {}, onSubmitted: (_) {},
            decoration: const InputDecoration(hintText: 'Tanya tentang materi…', counterText: ''))),
          const SizedBox(width: 8),
          IconButton.filled(tooltip: 'Kirim pertanyaan', onPressed: _sending || (_quota?.remaining ?? 0) == 0 ? null : _send,
            icon: const Icon(Icons.arrow_upward_rounded)),
        ]),
        AnimatedOpacity(
          duration: const Duration(milliseconds: 150),
          opacity: keyboardOpen ? 0 : 1,
          child: const Column(mainAxisSize: MainAxisSize.min, children: [
            SizedBox(height: 7),
            Text('Artikel dan pertanyaan dikirim ke penyedia AI. Periksa kembali jawaban.',
              style: TextStyle(fontSize: 10, color: KarsaColors.muted), textAlign: TextAlign.center),
          ]),
        ),
      ]),
    ));
  }
}
