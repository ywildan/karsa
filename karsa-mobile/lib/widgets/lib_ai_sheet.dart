import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../core/api_client.dart';
import '../core/models.dart';
import '../core/pending_submission.dart';
import 'ai_text.dart';
import 'common.dart';

/// URL halaman paket/plan — sumber kebenaran tunggal harga & tier.
/// TODO: ganti dengan URL halaman plan yang sebenarnya (mis. di karsa-landing).
const _planUrl = 'https://karsa-landing.vercel.app/paket';

/// Format angka token dengan pemisah ribuan titik (380.000).
String formatTokenCount(int value) {
  final digits = value.toString();
  final buffer = StringBuffer();
  for (var i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 == 0) buffer.write('.');
    buffer.write(digits[i]);
  }
  return buffer.toString();
}

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
  late final PageController _pages;
  final List<LibAiTurn> _turns = [];
  LibAiQuota? _quota;
  LibAiText? _summary;
  String _revision = '';
  String? _pendingQuestion;
  bool _pendingWebSearch = false;
  String? _failedQuestion;
  bool _failedWebSearch = false;
  String? _error;
  bool _loading = true;
  bool _enabled = false;
  bool _sending = false;
  bool _webSearchArmed = false;
  late bool _summarize;

  @override
  void initState() {
    super.initState();
    _summarize = widget.summarize;
    _pages = PageController(initialPage: _summarize ? 0 : 1);
    _focus.addListener(_onFocusChanged);
    _load();
  }
  @override
  void dispose() {
    _focus.removeListener(_onFocusChanged);
    _question.dispose(); _focus.dispose(); _scroll.dispose(); _pages.dispose(); super.dispose();
  }

  /// Shell komposer menebalkan tepinya saat fokus; dengarkan perubahan
  /// fokus agar animasi itu berjalan tanpa menunggu rebuild lain.
  void _onFocusChanged() {
    if (mounted) setState(() {});
  }

  /// Pindah tab lewat tombol: perbarui indikator segera, lalu animasikan
  /// PageView bila sudah terpasang. [onPageChanged] menyinkronkan [_summarize]
  /// saat pengguna menggeser langsung.
  void _goToPage(int page) {
    if (_summarize != (page == 0)) setState(() => _summarize = page == 0);
    if (_pages.hasClients) {
      _pages.animateToPage(page, duration: const Duration(milliseconds: 250), curve: Curves.easeOut);
    }
  }

  /// Pastikan posisi PageView mengikuti tab terpilih (mis. tab sempat ditekan
  /// saat konten masih loading sehingga PageView belum terpasang).
  void _syncPageWithTab() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || !_pages.hasClients) return;
      final target = _summarize ? 0 : 1;
      if ((_pages.page?.round() ?? -1) != target) _pages.jumpToPage(target);
    });
  }

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
    finally {
      if (!mounted) return;
      setState(() => _loading = false);
      _syncPageWithTab();
    }
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

  /// Ikon "web": one-shot untuk 1 pertanyaan berikutnya. Bila kuota habis,
  /// tampilkan dialog penawaran paket, bukan mengaktifkan mode.
  void _onWebSearchTap() {
    if ((_quota?.websearchRemaining ?? 0) == 0) {
      _showWebSearchQuotaDialog();
      return;
    }
    setState(() => _webSearchArmed = !_webSearchArmed);
  }

  Future<void> _showWebSearchQuotaDialog() async {
    if (!mounted) return;
    final isFree = (_quota?.websearchTier ?? 'free') == 'free';
    await showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Kuota Web Search Habis'),
        content: Text(isFree
            ? 'Jatah gratis 3x bulan ini telah habis. Lihat paket untuk fitur extra web search.'
            : 'Jatah hari ini habis, coba lagi besok.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Tutup')),
          if (isFree)
            FilledButton(
              onPressed: () {
                Navigator.pop(context);
                _openPlan();
              },
              child: const Text('Lihat Paket'),
            ),
        ],
      ),
    );
  }

  Future<void> _openPlan() async {
    final uri = Uri.tryParse(_planUrl);
    if (uri != null) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  Future<void> _openWebSource(String url) async {
    final uri = Uri.tryParse(url);
    if (uri != null && (uri.scheme == 'https' || uri.scheme == 'http')) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
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
    if (_sending || !_enabled || text.isEmpty || (_quota?.tokenRemaining ?? 0) == 0) return;
    final useWebSearch = _webSearchArmed;
    _focus.requestFocus();
    setState(() { _sending = true; _pendingQuestion = text; _pendingWebSearch = useWebSearch; _webSearchArmed = false; _error = null; _failedQuestion = null; });
    _scrollToEnd();
    try {
      final response = await widget.api.askLibAi(widget.article.id,
        revision: _revision, question: text, webSearch: useWebSearch,
        requestId: _submission.keyFor({'article': widget.article.id, 'revision': _revision, 'question': text, 'web_search': useWebSearch}));
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
      final errorCode = error is ApiException ? error.code : null;
      final quotaError = errorCode == 'AI_QUOTA_EXCEEDED' || errorCode == 'AI_TOKEN_QUOTA_EXCEEDED';
      if (errorCode == 'AI_QUOTA_EXCEEDED' && useWebSearch) {
        _showWebSearchQuotaDialog();
      } else {
        _handleError(error);
        // Pertanyaan yang gagal dipertahankan sebagai bubble "gagal terkirim"
        // dengan aksi coba lagi — tidak langsung lenyap dari chat.
        // (Kuota habis tidak dipertahankan: retry langsung tidak akan berhasil.)
        if (!quotaError && mounted) {
          setState(() { _failedQuestion = text; _failedWebSearch = useWebSearch; });
        }
      }
      await _syncQuota();
    } finally {
      if (mounted) { setState(() { _sending = false; _pendingQuestion = null; _pendingWebSearch = false; }); _scrollToEnd(); }
    }
  }

  /// Kirim ulang pertanyaan yang gagal: kembalikan teks ke composer,
  /// pulihkan status ikon web search, lalu kirim seperti biasa.
  Future<void> _retryFailed() async {
    final text = _failedQuestion;
    if (text == null || _sending || !_enabled) return;
    _question.text = text;
    setState(() { _webSearchArmed = _failedWebSearch; });
    await _send();
  }

  /// Bubble pertanyaan pengirim: rata kanan, oranye muda, lebar mengikuti teks.
  Widget _questionBubble(String text) => Align(
    alignment: Alignment.centerRight,
    child: Container(
      margin: const EdgeInsets.only(top: 12, bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.8),
      decoration: BoxDecoration(
        color: KarsaColors.orange.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Text(text, style: const TextStyle(fontSize: KarsaType.bodyLarge, fontWeight: FontWeight.w600)),
    ),
  );

  Widget _sources(List<int> sources) => Wrap(spacing: 4, children: [    for (final source in sources) TextButton(
      onPressed: () => Navigator.pop(context, LibAiSheetResult(source: source)),
      child: Text('Paragraf $source ↗', style: const TextStyle(fontSize: KarsaType.caption)),
    ),
  ]);

  Widget _webSources(List<LibAiWebSource> webSources) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      const Text('Sumber web:', style: TextStyle(fontSize: KarsaType.caption, fontWeight: FontWeight.w600)),
      for (final source in webSources)
        TextButton(
          onPressed: () => _openWebSource(source.url),
          child: Text(source.title.isEmpty ? source.url : '${source.title} ↗',
              style: const TextStyle(fontSize: KarsaType.caption)),
        ),
    ],
  );

  Widget _answer(String text, List<int> sources, {bool webSearch = false, List<LibAiWebSource> webSources = const []}) => Container(
    width: double.infinity,
    padding: const EdgeInsets.all(KarsaSpace.lg),
    decoration: BoxDecoration(color: KarsaColors.tintSoft, borderRadius: BorderRadius.circular(KarsaRadius.lg)),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      if (webSearch) ...[
        Container(
          padding: const EdgeInsets.symmetric(horizontal: KarsaSpace.sm, vertical: 3),
          decoration: BoxDecoration(color: KarsaColors.tintStrong, borderRadius: BorderRadius.circular(KarsaRadius.sm)),
          child: const Row(mainAxisSize: MainAxisSize.min, children: [
            Icon(Icons.public_outlined, size: 14, color: KarsaColors.accentInk),
            SizedBox(width: 4),
            Text('dari web', style: TextStyle(fontSize: KarsaType.caption, color: KarsaColors.accentInk, fontWeight: FontWeight.w600)),
          ]),
        ),
        const SizedBox(height: 8),
      ],
      AiAnswerText(text),
      if (sources.isNotEmpty) ...[
        const SizedBox(height: 8),
        _sources(sources),
      ],
      if (webSources.isNotEmpty) ...[
        const SizedBox(height: 8),
        _webSources(webSources),
      ],
    ]),
  );

  @override
  Widget build(BuildContext context) => Column(children: [
    Padding(padding: const EdgeInsets.fromLTRB(KarsaSpace.gutter, 0, KarsaSpace.sm, KarsaSpace.sm), child: Row(children: [
      const Icon(Icons.auto_awesome_outlined, color: KarsaColors.orange, size: 21),
      const SizedBox(width: 8),
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('Teman baca', style: TextStyle(fontSize: KarsaType.title, fontWeight: FontWeight.w700)),
        Text(widget.article.title, maxLines: 1, overflow: TextOverflow.ellipsis,
          style: const TextStyle(fontSize: KarsaType.caption, color: KarsaColors.muted)),
      ])),
      IconButton(tooltip: 'Tutup Teman baca', onPressed: () => Navigator.pop(context), icon: const Icon(Icons.close_rounded)),
    ])),
    Row(children: [
      Expanded(child: TextButton(onPressed: () { _focus.unfocus(); _goToPage(0); },
        child: Text('Ringkasan', style: TextStyle(color: _summarize ? KarsaColors.accentInk : KarsaColors.muted)))),
      Expanded(child: TextButton(onPressed: () => _goToPage(1),
        child: Text('Tanya materi', style: TextStyle(color: !_summarize ? KarsaColors.accentInk : KarsaColors.muted)))),
    ]),
    Expanded(child: _loading ? const LoadingState(message: 'Menyiapkan Teman baca…')
      : !_enabled ? Center(child: SingleChildScrollView(padding: const EdgeInsets.all(24), child: Column(mainAxisSize: MainAxisSize.min, children: [
          Text(_error ?? 'Teman baca masih dalam pengembangan.'),
          if (_error != null) TextButton(onPressed: _load, child: const Text('Coba lagi')),
        ])))
      : PageView(
          controller: _pages,
          onPageChanged: (index) {
            final summarize = index == 0;
            if (summarize != _summarize) setState(() => _summarize = summarize);
          },
          children: [_summaryView(), _chatView()],
        )),
    if (!_loading && _enabled && !_summarize) _composer(),
  ]);

  Widget _summaryView() => ListView(padding: const EdgeInsets.fromLTRB(KarsaSpace.gutter, KarsaSpace.md, KarsaSpace.gutter, KarsaSpace.lg), children: [
    if (_error != null) Padding(padding: const EdgeInsets.only(bottom: 12),
      child: Text(_error!, style: const TextStyle(fontSize: KarsaType.caption, color: KarsaColors.muted))),
    if (_summary != null) ...[
      _answer(_summary!.body, _summary!.sources),
      const SizedBox(height: 12),
      FilledButton(onPressed: () => _goToPage(1), child: const Text('Tanya tentang ringkasan')),
    ] else ...[
      const Text('Poin-poin penting artikel', style: TextStyle(fontSize: KarsaType.headline, fontWeight: FontWeight.w700)),
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
    const Text('AI dapat keliru. Periksa kembali artikel dan sumber belajarmu.', textAlign: TextAlign.center, style: TextStyle(fontSize: KarsaType.caption, color: KarsaColors.muted)),
  ]);

  Widget _chatView() => ListView(controller: _scroll, padding: const EdgeInsets.fromLTRB(KarsaSpace.gutter, KarsaSpace.md, KarsaSpace.gutter, KarsaSpace.lg), children: [
    if (_turns.isEmpty && _pendingQuestion == null && _failedQuestion == null) ...[
      const Text('Ada bagian yang belum jelas?', style: TextStyle(fontSize: KarsaType.headline, fontWeight: FontWeight.w700)),
      const SizedBox(height: 8),
      const Text('Tanyakan materi dari artikel ini. Jawaban menyertakan rujukan paragraf jika tersedia.'),
      const SizedBox(height: 16),
      for (final example in ['Apa inti artikel ini?', 'Jelaskan konsep utama dengan bahasa sederhana.']) Padding(
        padding: const EdgeInsets.only(bottom: 8), child: OutlinedButton(
          onPressed: (_quota?.tokenRemaining ?? 0) == 0 ? null : () { _question.text = example; _focus.requestFocus(); },
          child: Text(example),
        )),
    ],
    for (final turn in _turns) ...[
      _questionBubble(turn.question),
      _answer(turn.answer, turn.sources, webSearch: turn.webSearch, webSources: turn.webSources),
    ],
    if (_pendingQuestion != null) ...[
      _questionBubble(_pendingQuestion!),
      Text(_pendingWebSearch ? 'Mencari info terbaru…' : 'Teman baca sedang menyiapkan jawaban…',
        style: const TextStyle(color: KarsaColors.muted, fontSize: KarsaType.caption)),
    ],
    if (_failedQuestion != null && _pendingQuestion == null) ...[
      _questionBubble(_failedQuestion!),
      Align(
        alignment: Alignment.centerRight,
        child: KarsaTapAction(
          onTap: _sending ? null : _retryFailed,
          icon: Icons.refresh_rounded,
          label: 'Gagal terkirim — ketuk untuk coba lagi',
          accessibilityLabel: 'Kirim ulang pertanyaan yang gagal',
          style: const TextStyle(fontSize: KarsaType.caption, color: KarsaColors.accentInk, fontWeight: FontWeight.w600),
        ),
      ),
    ],
    if (_error != null) Padding(padding: const EdgeInsets.only(top: 12),
      child: Text(_error!, style: const TextStyle(fontSize: KarsaType.caption, color: KarsaColors.muted))),
  ]);

  /// Composer chat: satu shell membulat berisi kolom teks borderless dan
  /// baris aksi (chip web search, sisa token, tombol kirim). Semua bentuk
  /// memakai satu bahasa: shell radius 24, chip dan tombol bundar.
  ///
  /// Border tema sengaja dinetralkan di TextField: `InputDecoration`
  /// mewarisi `enabledBorder`/`focusedBorder` global, yang kalau dibiarkan
  /// menggambar kotak kedua di dalam shell. Tepi shell sendiri menebal
  /// saat fokus sebagai penanda.
  ///
  /// Perilaku tidak berubah: toggle web search tetap one-shot (reset
  /// setelah kirim), dialog kuota habis, dan logika kirim sama persis.
  Widget _composer() {
    final keyboardOpen = MediaQuery.viewInsetsOf(context).bottom > 0;
    final quotaAvailable = (_quota?.tokenRemaining ?? 0) > 0;
    return SafeArea(top: false, child: Padding(
      padding: const EdgeInsets.fromLTRB(KarsaSpace.gutter, KarsaSpace.sm, KarsaSpace.gutter, KarsaSpace.sm),
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        AnimatedContainer(
          duration: const Duration(milliseconds: 160),
          curve: Curves.easeOut,
          decoration: BoxDecoration(
            color: KarsaColors.card,
            border: Border.all(
              color: _focus.hasFocus ? KarsaColors.accentInk : KarsaColors.border,
              width: _focus.hasFocus ? 1.4 : 1,
            ),
            borderRadius: BorderRadius.circular(KarsaRadius.sheet),
          ),
          child: quotaAvailable ? _composerInput() : _composerQuotaEmpty(),
        ),
        // Disclaimer hanya memakan ruang saat keyboard tertutup; dengan
        // AnimatedSize ruangnya ikut menyusut, bukan sekadar transparan.
        AnimatedSize(
          duration: const Duration(milliseconds: 160),
          curve: Curves.easeOut,
          alignment: Alignment.topCenter,
          child: keyboardOpen ? const SizedBox(width: double.infinity) : const Padding(
            padding: EdgeInsets.only(top: KarsaSpace.sm),
            child: Text('Artikel dan pertanyaan dikirim ke penyedia AI. Periksa kembali jawaban.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: KarsaType.caption, color: KarsaColors.muted)),
          ),
        ),
      ]),
    ));
  }

  Widget _composerInput() => Column(mainAxisSize: MainAxisSize.min, children: [
    Padding(
      padding: const EdgeInsets.fromLTRB(KarsaSpace.lg, 14, KarsaSpace.lg, 0),
      child: TextField(controller: _question, focusNode: _focus,
        minLines: 1, maxLines: 3, maxLength: 600,
        style: const TextStyle(fontSize: KarsaType.bodyLarge, height: 1.45),
        textInputAction: TextInputAction.newline,
        onEditingComplete: () {}, onSubmitted: (_) {},
        decoration: const InputDecoration(
          hintText: 'Tanya tentang materi…',
          hintStyle: TextStyle(fontSize: KarsaType.bodyLarge, color: KarsaColors.muted),
          counterText: '',
          border: InputBorder.none,
          enabledBorder: InputBorder.none,
          focusedBorder: InputBorder.none,
          disabledBorder: InputBorder.none,
          filled: false,
          isDense: true,
          contentPadding: EdgeInsets.zero)),
    ),
    Padding(
      padding: const EdgeInsets.fromLTRB(10, 2, 10, 8),
      child: Row(children: [
        _webSearchChip(),
        const SizedBox(width: KarsaSpace.sm),
        Expanded(child: Align(alignment: Alignment.centerRight, child: _quotaLabel())),
        const SizedBox(width: KarsaSpace.sm),
        _sendButton(),
      ]),
    ),
  ]);

  /// Chip web search ringkas (32) supaya seimbang dengan tombol kirim 40
  /// dan tidak mendominasi baris aksi. Status aktif ditandai ikon, label,
  /// dan latar — bukan warna saja — serta diekspos ke pembaca layar.
  Widget _webSearchChip() {
    final armed = _webSearchArmed;
    return Tooltip(
      message: armed ? 'Web search aktif untuk pertanyaan berikut' : 'Aktifkan web search',
      child: Semantics(
        selected: armed,
        child: InkWell(
          borderRadius: BorderRadius.circular(999),
          onTap: _sending ? null : _onWebSearchTap,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 150),
            curve: Curves.easeOut,
            // minHeight, bukan height tetap: chip ikut memanjang saat
            // pengguna memperbesar ukuran teks sistem.
            constraints: const BoxConstraints(minHeight: 32),
            margin: const EdgeInsets.symmetric(vertical: 4),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: armed ? KarsaColors.tintStrong : null,
              border: Border.all(color: armed ? KarsaColors.tintStrong : KarsaColors.border),
              borderRadius: BorderRadius.circular(999),
            ),
            child: Row(mainAxisSize: MainAxisSize.min, children: [
              Icon(armed ? Icons.public_rounded : Icons.public_outlined,
                size: 15, color: armed ? KarsaColors.accentInk : KarsaColors.muted),
              const SizedBox(width: 5),
              Text(armed ? 'Cari web aktif' : 'Cari web',
                style: TextStyle(fontSize: KarsaType.caption, fontWeight: FontWeight.w700,
                  color: armed ? KarsaColors.accentInk : KarsaColors.muted)),
            ]),
          ),
        ),
      ),
    );
  }

  /// Sisa token ringkas di baris aksi; menebal saat tersisa <=20% agar
  /// pengguna sadar sebelum kuota habis total.
  Widget _quotaLabel() {
    final remaining = _quota?.tokenRemaining ?? 0;
    final limit = _quota?.tokenLimit ?? 0;
    final low = limit > 0 && remaining <= limit ~/ 5;
    return Text('Sisa ${formatTokenCount(remaining)} token',
      maxLines: 1, overflow: TextOverflow.ellipsis, textAlign: TextAlign.right,
      style: TextStyle(fontSize: KarsaType.caption,
        fontWeight: low ? FontWeight.w700 : FontWeight.w400,
        color: low ? KarsaColors.accentInk : KarsaColors.muted));
  }

  /// Tombol kirim dengan spinner di tempat panah saat menunggu jawaban.
  Widget _sendButton() => IconButton.filled(
    tooltip: 'Kirim pertanyaan',
    padding: EdgeInsets.zero,
    style: IconButton.styleFrom(
      // Selama mengirim tombol tetap oranye supaya spinner putih terbaca.
      disabledBackgroundColor: _sending ? KarsaColors.orange : null,
      disabledForegroundColor: _sending ? KarsaColors.onOrange : null,
    ),
    onPressed: _sending || (_quota?.tokenRemaining ?? 0) == 0 ? null : _send,
    icon: _sending
        ? const SizedBox.square(dimension: 18,
            child: CircularProgressIndicator(strokeWidth: 2, color: KarsaColors.onOrange))
        : const Icon(Icons.arrow_upward_rounded, size: 20),
  );

  /// Pengganti kolom input saat kuota token bulan ini habis: satu baris
  /// ajakan melihat paket, bukan field mati tanpa penjelasan.
  Widget _composerQuotaEmpty() => Padding(
    padding: const EdgeInsets.fromLTRB(KarsaSpace.lg, KarsaSpace.md, KarsaSpace.sm, KarsaSpace.sm),
    child: Row(children: [
      const Icon(Icons.hourglass_empty_rounded, size: 18, color: KarsaColors.muted),
      const SizedBox(width: KarsaSpace.sm),
      const Expanded(child: Text('Kuota token bulan ini habis.',
        style: TextStyle(fontSize: KarsaType.body, color: KarsaColors.ink))),
      TextButton(onPressed: _openPlan, child: const Text('Lihat paket')),
    ]),
  );
}
