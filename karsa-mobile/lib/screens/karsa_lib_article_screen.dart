import 'package:flutter/material.dart';

import '../core/api_client.dart';
import '../core/models.dart';
import '../widgets/common.dart';
import '../widgets/lib_report_dialog.dart';
import '../widgets/lib_ai_sheet.dart';
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
  String? _replyToId;
  String? _replyToName;
  int? _commentCount;
  bool _sending = false;

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
      IconButton(tooltip: 'Laporkan artikel', icon: const Icon(Icons.flag_outlined),
        onPressed: () => _report(articleId: widget.articleId)),
    ]),
    body: FutureBuilder<LibArticle>(future: _article, builder: (context, snapshot) {
      if (snapshot.connectionState != ConnectionState.done) return const LoadingState();
      if (snapshot.hasError) return ErrorState(message: friendlyError(snapshot.error!), onRetry: () => setState(_load));
      final article = snapshot.data!;
      final paragraphs = article.body.trim().split(RegExp(r'\n\s*\n')).map((part) => part.trim()).where((part) => part.isNotEmpty).toList();
      return Column(children: [
        Expanded(child: CustomScrollView(slivers: [
          SliverPadding(padding: const EdgeInsets.fromLTRB(22, 12, 22, 24),
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
                Text('${article.views} pembaca unik', style: const TextStyle(fontSize: 13, color: KarsaColors.muted)),
                if (article.publishedAt != null) Text(formatDay(article.publishedAt!), style: const TextStyle(fontSize: 13, color: KarsaColors.muted)),
                TextButton.icon(onPressed: _jumpToDiscussion, icon: const Icon(Icons.mode_comment_outlined, size: 18),
                  label: Text('${_commentCount ?? article.commentsCount} komentar')),
              ]),
              const Divider(height: 32),
              SelectionArea(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                for (var index = 0; index < paragraphs.length; index++) Padding(
                  key: _paragraphKeys.putIfAbsent(index + 1, () => GlobalKey()),
                  padding: EdgeInsets.only(bottom: index == paragraphs.length - 1 ? 0 : 16),
                  child: Text(paragraphs[index], style: const TextStyle(fontSize: 16, height: 1.85, color: KarsaColors.ink)),
                ),
              ])),
              const Divider(height: 48),
              SectionHeading(key: _discussionKey, title: 'Diskusi', subtitle: 'Berbagi tanggapan dengan teman satu prodi.'),
            ]))),
          FutureBuilder<List<LibComment>>(future: _comments, builder: (context, snapshot) {
            if (snapshot.connectionState != ConnectionState.done) return const SliverToBoxAdapter(
              child: Padding(padding: EdgeInsets.all(24), child: LoadingState(message: 'Memuat diskusi…')));
            if (snapshot.hasError) return SliverToBoxAdapter(child: ErrorState(message: friendlyError(snapshot.error!), onRetry: _reloadComments));
            final rows = snapshot.data!;
            if (rows.isEmpty) return const SliverToBoxAdapter(child: Padding(
              padding: EdgeInsets.fromLTRB(24, 0, 24, 32),
              child: Text('Belum ada komentar. Mulai diskusinya, yuk.', style: TextStyle(fontSize: 14, color: KarsaColors.muted))));
            return SliverPadding(padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
              sliver: SliverList.separated(itemCount: rows.length, separatorBuilder: (_, _) => const SizedBox(height: 12),
                itemBuilder: (_, index) => Card(child: Padding(padding: const EdgeInsets.all(16), child: Column(children: [
                  _commentLine(rows[index]),
                  for (final reply in rows[index].replies) Padding(
                    padding: const EdgeInsets.only(left: 22, top: 12), child: _commentLine(reply, isReply: true)),
                ]))),
              ),
            );
          }),
        ])),
        _composer(article),
      ]);
    }),
  );

  Widget _composer(LibArticle article) => Container(
    decoration: const BoxDecoration(color: Colors.white, border: Border(top: BorderSide(color: KarsaColors.border))),
    child: SafeArea(top: false, child: Padding(padding: const EdgeInsets.fromLTRB(16, 8, 16, 10), child: Column(
      mainAxisSize: MainAxisSize.min, children: [
        if (MediaQuery.viewInsetsOf(context).bottom == 0) ...[
          _ArticleAiPreview(
            enabled: article.aiEnabled && article.aiRevision != null,
            onSummary: () => _openAi(article, summarize: true),
            onAsk: () => _openAi(article, summarize: false),
          ),
          const SizedBox(height: 12),
        ],
        if (_replyToId != null) Row(children: [
          Expanded(child: Text('Membalas $_replyToName', style: const TextStyle(fontSize: 13, color: KarsaColors.orange))),
          IconButton(tooltip: 'Batal membalas', onPressed: _sending ? null : () => setState(() { _replyToId = null; _replyToName = null; }),
            icon: const Icon(Icons.close_rounded, size: 20)),
        ]),
        Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
          Expanded(child: TextField(controller: _comment, focusNode: _focus, enabled: !_sending,
            minLines: 1, maxLines: 4, maxLength: 2000,
            decoration: InputDecoration(hintText: _replyToId == null ? 'Tulis komentar…' : 'Tulis balasan…', counterText: ''))),
          const SizedBox(width: 8),
          IconButton.filled(tooltip: 'Kirim komentar', onPressed: _sending ? null : _sendComment,
            icon: _sending ? const SizedBox.square(dimension: 20, child: CircularProgressIndicator(strokeWidth: 2))
              : const Icon(Icons.arrow_upward_rounded)),
        ]),
      ],
    ))),
  );

  Widget _commentLine(LibComment comment, {bool isReply = false}) => Row(
    crossAxisAlignment: CrossAxisAlignment.start, children: [
      InitialAvatar(name: comment.author, radius: isReply ? 15 : 18),
      const SizedBox(width: 10),
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(comment.author, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
        if (comment.createdAt != null) Text(formatRelativeTime(comment.createdAt!), style: const TextStyle(fontSize: 12, color: KarsaColors.muted)),
        const SizedBox(height: 6),
        Text(comment.isDeleted ? 'Komentar dihapus' : comment.body ?? '',
          style: TextStyle(fontSize: 14, height: 1.6, color: comment.isDeleted ? KarsaColors.muted : KarsaColors.ink,
            fontStyle: comment.isDeleted ? FontStyle.italic : FontStyle.normal)),
        if (!comment.isDeleted) Wrap(spacing: 8, crossAxisAlignment: WrapCrossAlignment.center, children: [
          if (!isReply) TextButton(onPressed: _sending ? null : () {
            setState(() { _replyToId = comment.id; _replyToName = comment.author; });
            _focus.requestFocus();
          }, child: const Text('Balas')),
          PopupMenuButton<String>(tooltip: 'Opsi komentar', enabled: !_deleting.contains(comment.id),
            onSelected: (value) => value == 'delete' ? _deleteComment(comment) : _report(commentId: comment.id),
            itemBuilder: (_) => [
              const PopupMenuItem(value: 'report', child: Text('Laporkan')),
              if (comment.isOwn) const PopupMenuItem(value: 'delete', child: Text('Hapus komentar')),
            ]),
          if (_deleting.contains(comment.id)) const SizedBox.square(dimension: 16, child: CircularProgressIndicator(strokeWidth: 2)),
        ]),
      ])),
    ],
  );

  Future<void> _sendComment() async {
    if (_sending || _comment.text.trim().isEmpty) return;
    setState(() => _sending = true);
    try {
      await widget.api.createLibComment(widget.articleId, body: _comment.text.trim(), parentId: _replyToId);
      if (!mounted) return;
      _comment.clear();
      setState(() { _replyToId = null; _replyToName = null; });
      _focus.unfocus();
      try { await _reloadComments(); } catch (_) { _message('Komentar tersimpan. Muat ulang diskusi untuk melihatnya.'); }
    } catch (error) { _message(friendlyError(error)); }
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
    } catch (error) { _message(friendlyError(error)); }
    finally { if (mounted) setState(() => _deleting.remove(comment.id)); }
  }
  void _message(String message) {
    if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }
}

/// Aktivasi mengikuti flag backend; backend lama otomatis tetap disabled.
class _ArticleAiPreview extends StatelessWidget {
  const _ArticleAiPreview({required this.enabled, required this.onSummary, required this.onAsk});
  final bool enabled;
  final VoidCallback onSummary;
  final VoidCallback onAsk;

  @override
  Widget build(BuildContext context) {
    final disabledColor = KarsaColors.muted.withValues(alpha: .75);
    final shape = RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(12),
    );
    final summarize = OutlinedButton.icon(
      onPressed: enabled ? onSummary : null,
      style: OutlinedButton.styleFrom(
        disabledForegroundColor: disabledColor,
        minimumSize: const Size(0, 44),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        side: const BorderSide(color: KarsaColors.border),
        shape: shape,
      ),
      icon: const Icon(Icons.auto_awesome_outlined, size: 18),
      label: const Text('Ringkas'),
    );
    final ask = FilledButton.icon(
      onPressed: enabled ? onAsk : null,
      style: FilledButton.styleFrom(
        disabledForegroundColor: disabledColor,
        disabledBackgroundColor: const Color(0xFFF4E6D8),
        minimumSize: const Size(0, 44),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        shape: shape,
      ),
      icon: const Icon(Icons.chat_bubble_outline_rounded, size: 18),
      label: const Text('Tanya AI'),
    );

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Wrap(
          spacing: 8,
          runSpacing: 4,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            const Text(
              'Teman baca',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: KarsaColors.muted,
              ),
            ),
            if (!enabled) Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: const Color(0xFFFFF2E7),
                borderRadius: BorderRadius.circular(6),
              ),
              child: const Text(
                'Dalam pengembangan',
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w600,
                  color: KarsaColors.muted,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 6),
        LayoutBuilder(
          builder: (context, constraints) {
            if (constraints.maxWidth < 280 ||
                MediaQuery.textScalerOf(context).scale(14) > 21) {
              return Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [summarize, const SizedBox(height: 6), ask],
              );
            }
            return Row(
              children: [
                Expanded(child: summarize),
                const SizedBox(width: 8),
                Expanded(child: ask),
              ],
            );
          },
        ),
      ],
    );
  }
}
