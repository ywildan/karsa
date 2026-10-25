import 'package:flutter/material.dart';

import '../core/api_client.dart';
import '../core/models.dart';
import '../widgets/common.dart';
import '../widgets/lib_report_dialog.dart';
import '../widgets/lib_ai_sheet.dart';
import '../widgets/markdown_text.dart';
import 'karsa_lib_author_screen.dart';

class KarsaLibArticleScreen extends StatefulWidget {
  const KarsaLibArticleScreen({required this.api, required this.articleId, super.key});
  final ApiClient api;
  final String articleId;
  @override
  State<KarsaLibArticleScreen> createState() => _KarsaLibArticleScreenState();
}

class _KarsaLibArticleScreenState extends State<KarsaLibArticleScreen> {
  late Future<LibArticle> _article;
  late Future<List<LibComment>> _comments;
  final _comment = TextEditingController();
  final _focus = FocusNode();
  final _discussionKey = GlobalKey();
  final Map<int, GlobalKey> _paragraphKeys = {};
  final Set<String> _deleting = {};
  final Set<String> _expandedThreads = {};
  String? _replyToId;
  String? _replyToName;
  String? _replyToBody;
  int? _commentCount;
  bool _sending = false;
  /// Sinyal untuk komposer saja supaya mengetik tidak membangun ulang
  /// seluruh layar artikel.
  late final Listenable _commentSignals = Listenable.merge([_comment, _focus]);

  @override
  void initState() { super.initState(); _load(); }
  @override
  void dispose() { _comment.dispose(); _focus.dispose(); super.dispose(); }
  void _load() {
    _article = widget.api.libArticle(widget.articleId);
    _comments = widget.api.libComments(widget.articleId)
        .then((rows) {
          _updateCommentCount(rows);
          return rows;
        });
    _commentCount = null;
  }
  Future<void> _reloadComments() async {
    if (!mounted) return;
    final next = widget.api.libComments(widget.articleId).then((rows) {
      _updateCommentCount(rows);
      return rows;
    });
    setState(() => _comments = next);
    await next;
  }
  /// Hitung komentar yang terlihat (lewat load awal maupun reload)
  /// agar angkanya tidak melompat dari total mentah ke jumlah yang
  /// ditampilkan setelah refresh.
  void _updateCommentCount(List<LibComment> rows) {
    if (!mounted) return;
    setState(() => _commentCount = rows.fold<int>(0,
      (total, row) => total + (row.isDeleted ? 0 : 1) + row.replies.where((reply) => !reply.isDeleted).length));
  }
  void _jumpToDiscussion() {
    final target = _discussionKey.currentContext;
    if (target != null) Scrollable.ensureVisible(target,
      duration: MediaQuery.disableAnimationsOf(context) ? Duration.zero : const Duration(milliseconds: 220));
    _focus.requestFocus();
  }
  Future<void> _report({String? articleId, String? commentId}) async {
    final sent = await showLibReportDialog(context, api: widget.api, articleId: articleId, commentId: commentId);
    if (sent == true) _message('Laporan terkirim untuk ditinjau.');
  }

  Future<void> _openAi(LibArticle article, {required bool summarize}) async {
    if (!article.aiEnabled || article.aiRevision == null) return;
    _focus.unfocus();
    final result = await showLibAiSheet(context, api: widget.api, article: article, summarize: summarize);
    if (!mounted || result == null) return;
    if (result.reloadArticle) {
      setState(_load);
      _message('Artikel diperbarui. Materi dimuat ulang.');
      return;
    }
    final target = _paragraphKeys[result.source]?.currentContext;
    if (target != null) {
      await Scrollable.ensureVisible(target, alignment: .1,
        duration: MediaQuery.disableAnimationsOf(context) ? Duration.zero : const Duration(milliseconds: 250));
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Artikel'), actions: [
      // Pintu masuk Teman baca ada di header supaya bar bawah hanya dipakai
      // untuk komentar; dua tab (Ringkasan/Tanya materi) tetap ada di sheet.
      FutureBuilder<LibArticle>(future: _article, builder: (context, snapshot) {
        final article = snapshot.data;
        if (article == null) {
          return const IconButton(tooltip: 'Teman baca', icon: Icon(Icons.auto_awesome_outlined), onPressed: null);
        }
        final enabled = article.aiEnabled && article.aiRevision != null;
        return IconButton(
          tooltip: enabled ? 'Teman baca' : 'Teman baca masih dalam pengembangan',
          icon: const Icon(Icons.auto_awesome_outlined),
          onPressed: enabled ? () => _openAi(article, summarize: false) : null,
        );
      }),
      IconButton(tooltip: 'Laporkan artikel', icon: const Icon(Icons.flag_outlined),
        onPressed: () => _report(articleId: widget.articleId)),
    ]),
    body: FutureBuilder<LibArticle>(future: _article, builder: (context, snapshot) {
      if (snapshot.connectionState != ConnectionState.done) return const LoadingState();
      if (snapshot.hasError) return ErrorState(message: friendlyError(snapshot.error!), onRetry: () => setState(_load));
      final article = snapshot.data!;
      return Column(children: [
        Expanded(child: CustomScrollView(slivers: [
          SliverPadding(padding: const EdgeInsets.fromLTRB(KarsaSpace.gutter, KarsaSpace.md, KarsaSpace.gutter, KarsaSpace.xl),
            sliver: SliverToBoxAdapter(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              InkWell(borderRadius: BorderRadius.circular(12),
                onTap: () => Navigator.of(context).push<void>(MaterialPageRoute(
                  builder: (_) => KarsaLibAuthorScreen(api: widget.api, authorId: article.authorId))),
                child: Padding(padding: const EdgeInsets.symmetric(vertical: 8), child: Row(children: [
                  InitialAvatar(name: article.authorName),
                  const SizedBox(width: 12),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(article.authorName, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                    Text(article.authorProgramName ?? 'Mahasiswa Karsa', style: const TextStyle(fontSize: 12, color: KarsaColors.muted)),
                  ])),
                  const Icon(Icons.chevron_right_rounded),
                ])),
              ),
              const SizedBox(height: 20),
              SelectableText(article.title, style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w700, height: 1.3)),
              const SizedBox(height: 12),
              Wrap(spacing: 14, runSpacing: 8, crossAxisAlignment: WrapCrossAlignment.center, children: [
                Text('${article.views} pembaca unik', style: const TextStyle(fontSize: KarsaType.caption, color: KarsaColors.muted)),
                if (article.publishedAt != null) Text(formatDay(article.publishedAt!), style: const TextStyle(fontSize: KarsaType.caption, color: KarsaColors.muted)),
                TextButton.icon(onPressed: _jumpToDiscussion, icon: const Icon(Icons.mode_comment_outlined, size: 18),
                  label: Text('${_commentCount ?? article.commentsCount} komentar')),
              ]),
              const Divider(height: 32),
              SelectionArea(child: MarkdownBody(
                body: article.body,
                blockKeys: _paragraphKeys,
                onTapLink: openMarkdownLink,
              )),
              const Divider(height: 48),
              SectionHeading(key: _discussionKey, title: 'Diskusi', subtitle: 'Berbagi tanggapan dengan teman satu prodi.'),
            ]))),
          FutureBuilder<List<LibComment>>(future: _comments, builder: (context, snapshot) {
            if (snapshot.connectionState != ConnectionState.done) return const SliverToBoxAdapter(
              child: Padding(padding: EdgeInsets.all(24), child: LoadingState(message: 'Memuat diskusi…')));
            if (snapshot.hasError) return SliverToBoxAdapter(child: ErrorState(message: friendlyError(snapshot.error!), onRetry: _reloadComments));
            final rows = snapshot.data!;
            if (rows.isEmpty) return const SliverToBoxAdapter(child: Padding(
              padding: EdgeInsets.fromLTRB(KarsaSpace.gutter, 0, KarsaSpace.gutter, KarsaSpace.xl),
              child: EmptyState(title: 'Belum ada komentar',
                message: 'Mulai diskusinya, yuk.', icon: Icons.chat_bubble_outline_rounded)));
            return SliverPadding(padding: const EdgeInsets.fromLTRB(KarsaSpace.gutter, 0, KarsaSpace.gutter, KarsaSpace.xl),
              sliver: SliverList.separated(itemCount: rows.length,
                separatorBuilder: (_, _) => const SizedBox(height: 16),
                itemBuilder: (_, index) => _commentThread(rows[index])),
            );
          }),
        ])),
        _composer(),
      ]);
    }),
  );

  /// Bar komentar: permukaan putih ber-garis atas, strip balasan, lalu satu
  /// shell membulat berisi field borderless dan tombol kirim. Pola ini sama
  /// dengan komposer chat grup.
  Widget _composer() => Container(
    decoration: const BoxDecoration(color: KarsaColors.card, border: Border(top: BorderSide(color: KarsaColors.border))),
    child: SafeArea(top: false, child: Padding(padding: const EdgeInsets.fromLTRB(KarsaSpace.gutter, 8, KarsaSpace.gutter, 10), child: Column(
      mainAxisSize: MainAxisSize.min, children: [
        if (_replyToId != null) ...[
          _replyStrip(),
          const SizedBox(height: 8),
        ],
        ListenableBuilder(
          listenable: _commentSignals,
          builder: (context, _) {
            final canSend = !_sending && _comment.text.trim().isNotEmpty;
            final focused = _focus.hasFocus;
            return AnimatedContainer(
              duration: const Duration(milliseconds: 160),
              curve: Curves.easeOut,
              decoration: BoxDecoration(
                color: KarsaColors.background,
                border: Border.all(
                  color: focused ? KarsaColors.accentInk : KarsaColors.border,
                  width: focused ? 1.4 : 1,
                ),
                borderRadius: BorderRadius.circular(KarsaRadius.sheet),
              ),
              child: Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
                Expanded(child: TextField(controller: _comment, focusNode: _focus,
                  maxLength: 2000, minLines: 1, maxLines: 4,
                  style: const TextStyle(fontSize: KarsaType.bodyLarge, height: 1.45),
                  textInputAction: TextInputAction.newline,
                  onEditingComplete: () {},
                  decoration: InputDecoration(
                    hintText: _replyToId == null ? 'Tulis komentar…' : 'Tulis balasan…',
                    hintStyle: const TextStyle(fontSize: KarsaType.bodyLarge, color: KarsaColors.muted),
                    counterText: '',
                    border: InputBorder.none,
                    enabledBorder: InputBorder.none,
                    focusedBorder: InputBorder.none,
                    disabledBorder: InputBorder.none,
                    filled: false,
                    isDense: true,
                    contentPadding: const EdgeInsets.fromLTRB(16, 14, 8, 14)))),
                Padding(padding: const EdgeInsets.all(4), child: IconButton.filled(
                  tooltip: 'Kirim komentar',
                  padding: EdgeInsets.zero,
                  style: IconButton.styleFrom(
                    // Tombol tetap oranye selama mengirim agar spinner terbaca.
                    disabledBackgroundColor: _sending ? KarsaColors.orange : null,
                    disabledForegroundColor: _sending ? KarsaColors.onOrange : null,
                  ),
                  onPressed: canSend ? _sendComment : null,
                  icon: _sending
                      ? const SizedBox.square(dimension: 18,
                          child: CircularProgressIndicator(strokeWidth: 2, color: KarsaColors.onOrange))
                      : const Icon(Icons.arrow_upward_rounded, size: 20))),
              ]),
            );
          },
        ),
      ],
    ))),
  );

  /// Strip "Membalas …" yang menempel di komposer, sama dengan chat grup.
  Widget _replyStrip() => Container(
    padding: const EdgeInsets.fromLTRB(12, 8, 4, 8),
    decoration: BoxDecoration(
      color: KarsaColors.tintSoft,
      borderRadius: BorderRadius.circular(KarsaRadius.md),
    ),
    child: Row(children: [
      Container(width: 3, height: 30,
        decoration: BoxDecoration(color: KarsaColors.accentInk, borderRadius: BorderRadius.circular(999))),
      const SizedBox(width: 10),
      Expanded(child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('Membalas ${_replyToName ?? ''}', maxLines: 1, overflow: TextOverflow.ellipsis,
          style: const TextStyle(fontSize: KarsaType.caption, fontWeight: FontWeight.w700, color: KarsaColors.accentInk)),
        if ((_replyToBody ?? '').trim().isNotEmpty) ...[
          const SizedBox(height: 2),
          Text(_replyToBody!.trim(), maxLines: 1, overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontSize: KarsaType.caption, color: KarsaColors.muted)),
        ],
      ])),
      IconButton(tooltip: 'Batal membalas',
        onPressed: _sending ? null : () => setState(() { _replyToId = null; _replyToName = null; _replyToBody = null; }),
        icon: const Icon(Icons.close_rounded, size: 20)),
    ]),
  );

  Widget _commentThread(LibComment comment) {
    final replies = comment.replies;
    final expanded = _expandedThreads.contains(comment.id);
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      _commentLine(comment),
      if (replies.isNotEmpty) ...[
        const SizedBox(height: 8),
        KarsaTapAction(
          onTap: () => setState(() {
            if (expanded) { _expandedThreads.remove(comment.id); } else { _expandedThreads.add(comment.id); }
          }),
          label: expanded ? 'Sembunyikan balasan' : 'Lihat ${replies.length} balasan',
          accessibilityLabel: expanded ? 'Sembunyikan balasan' : 'Lihat balasan',
          style: const TextStyle(fontSize: KarsaType.caption, fontWeight: FontWeight.w600, color: KarsaColors.muted),
        ),
        if (expanded) ...[
          const SizedBox(height: 12),
          for (final reply in replies)
            Padding(padding: const EdgeInsets.only(left: 42, bottom: 12),
              child: _commentLine(reply, isReply: true)),
        ],
      ],
    ]);
  }

  Widget _commentLine(LibComment comment, {bool isReply = false}) => Row(
    crossAxisAlignment: CrossAxisAlignment.start, children: [
      InitialAvatar(name: comment.author, radius: isReply ? 14 : 16),
      const SizedBox(width: 10),
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        RichText(
          text: TextSpan(
            style: const TextStyle(fontSize: 14, height: 1.45, color: KarsaColors.ink),
            children: [
              TextSpan(text: comment.author, style: const TextStyle(fontWeight: FontWeight.w700)),
              TextSpan(
                text: '  ${comment.isDeleted ? 'Komentar dihapus' : comment.body ?? ''}',
                style: TextStyle(
                  color: comment.isDeleted ? KarsaColors.muted : KarsaColors.ink,
                  fontStyle: comment.isDeleted ? FontStyle.italic : FontStyle.normal),
              ),
            ],
          ),
        ),
        const SizedBox(height: 4),
        Row(children: [
          if (comment.createdAt != null)
            Text(formatRelativeTime(comment.createdAt!),
              style: const TextStyle(fontSize: 12, color: KarsaColors.muted)),
          if (!comment.isDeleted) ...[
            const SizedBox(width: 12),
            if (!isReply)
              KarsaTapAction(
                onTap: _sending ? null : () {
                  setState(() { _replyToId = comment.id; _replyToName = comment.author; _replyToBody = comment.body; });
                  _focus.requestFocus();
                },
                label: 'Balas',
                accessibilityLabel: 'Balas komentar ${comment.author}',
                style: const TextStyle(fontSize: KarsaType.caption, fontWeight: FontWeight.w600, color: KarsaColors.muted),
              ),
            if (!isReply) const SizedBox(width: 12),
            PopupMenuButton<String>(
              tooltip: 'Opsi komentar',
              enabled: !_deleting.contains(comment.id),
              icon: const Icon(Icons.more_horiz_rounded, color: KarsaColors.muted),
              onSelected: (value) => value == 'delete' ? _deleteComment(comment) : _report(commentId: comment.id),
              itemBuilder: (_) => [
                const PopupMenuItem(value: 'report', child: Text('Laporkan')),
                if (comment.isOwn) const PopupMenuItem(value: 'delete', child: Text('Hapus komentar')),
              ],
            ),
          ],
          if (_deleting.contains(comment.id)) ...[
            const SizedBox(width: 8),
            const SizedBox.square(dimension: 14, child: CircularProgressIndicator(strokeWidth: 2)),
          ],
        ]),
      ])),
    ],
  );

  Future<void> _sendComment() async {
    final draft = _comment.text;
    final text = draft.trim();
    if (_sending || text.isEmpty) return;
    setState(() => _sending = true);
    try {
      await widget.api.createLibComment(widget.articleId, body: text, parentId: _replyToId);
      if (!mounted) return;
      setState(() {
        // Jangan hapus ketikan baru yang masuk selagi komentar dikirim.
        if (_comment.text == draft) {
          _comment.clear();
        } else if (_comment.text.startsWith(draft)) {
          final next = _comment.text.substring(draft.length);
          _comment.value = TextEditingValue(text: next, selection: TextSelection.collapsed(offset: next.length));
        }
        _replyToId = null; _replyToName = null; _replyToBody = null;
      });
      _focus.unfocus();
      try { await _reloadComments(); } catch (_) { _message('Komentar tersimpan. Muat ulang diskusi untuk melihatnya.'); }
    } catch (error) { _message(friendlyError(error), kind: KarsaSnackKind.danger); }
    finally { if (mounted) setState(() => _sending = false); }
  }
  Future<void> _deleteComment(LibComment comment) async {
    if (_deleting.contains(comment.id)) return;
    final confirmed = await showDialog<bool>(context: context, builder: (context) => AlertDialog(
      title: const Text('Hapus komentar?'),
      content: const Text('Komentar tidak dapat dipulihkan. Balasan tetap tersimpan agar konteks diskusi tidak hilang.'),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Batal')),
        FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Hapus')),
      ],
    ));
    if (!mounted || confirmed != true) return;
    setState(() => _deleting.add(comment.id));
    try {
      await widget.api.deleteLibComment(comment.id);
      try { await _reloadComments(); } catch (_) { _message('Komentar dihapus. Muat ulang diskusi untuk memperbarui tampilan.'); }
    } catch (error) { _message(friendlyError(error), kind: KarsaSnackKind.danger); }
    finally { if (mounted) setState(() => _deleting.remove(comment.id)); }
  }
  void _message(String message, {KarsaSnackKind kind = KarsaSnackKind.neutral}) {
    if (mounted) showKarsaSnack(context, message, kind: kind);
  }
}
