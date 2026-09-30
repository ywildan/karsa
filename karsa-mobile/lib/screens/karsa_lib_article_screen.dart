import 'package:flutter/material.dart';

import '../core/api_client.dart';
import '../core/models.dart';
import '../widgets/common.dart';
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
  String? _replyToId;
  String? _replyToName;
  bool _sending = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() { _comment.dispose(); super.dispose(); }

  void _load() {
    _article = widget.api.libArticle(widget.articleId);
    _comments = widget.api.libComments(widget.articleId);
  }

  Future<void> _reloadComments() async {
    setState(() => _comments = widget.api.libComments(widget.articleId));
    await _comments;
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: const Color(0xFFFFFBF7),
        appBar: AppBar(title: const Text('Artikel'), actions: [
          FutureBuilder<LibArticle>(future: _article, builder: (context, snapshot) => snapshot.hasData ? IconButton(tooltip: 'Laporkan artikel', icon: const Icon(Icons.flag_outlined), onPressed: () => _report(articleId: widget.articleId)) : const SizedBox.shrink()),
        ]),
        body: FutureBuilder<LibArticle>(
          future: _article,
          builder: (context, snapshot) {
            if (snapshot.connectionState != ConnectionState.done) return const Center(child: CircularProgressIndicator());
            if (snapshot.hasError) return ErrorState(message: friendlyError(snapshot.error!), onRetry: () => setState(_load));
            final article = snapshot.data!;
            return CustomScrollView(slivers: [
              SliverPadding(padding: const EdgeInsets.fromLTRB(20, 10, 20, 8), sliver: SliverToBoxAdapter(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                _authorLine(article),
                const SizedBox(height: 19),
                Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5), decoration: BoxDecoration(color: const Color(0xFFF4EFE9), borderRadius: BorderRadius.circular(6)), child: const Text('ARTIKEL', style: TextStyle(fontSize: 9, letterSpacing: .8, fontWeight: FontWeight.w800, color: Color(0xFF777065)))),
                const SizedBox(height: 12),
                Text(article.title, style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontFamily: 'Georgia', fontWeight: FontWeight.w600, height: 1.2, letterSpacing: -.5)),
                const SizedBox(height: 13),
                Row(children: [Icon(Icons.visibility_outlined, size: 16, color: Theme.of(context).colorScheme.onSurfaceVariant), const SizedBox(width: 5), Text('${article.views} pembaca unik', style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Theme.of(context).colorScheme.onSurfaceVariant)), const SizedBox(width: 13), Icon(Icons.mode_comment_outlined, size: 15, color: Theme.of(context).colorScheme.onSurfaceVariant), const SizedBox(width: 5), Text('${article.commentsCount} komentar', style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Theme.of(context).colorScheme.onSurfaceVariant))]),
                const Padding(padding: EdgeInsets.symmetric(vertical: 17), child: Divider()),
                Text(article.body, style: Theme.of(context).textTheme.bodyLarge?.copyWith(fontFamily: 'Georgia', height: 1.85, fontSize: 16)),
                const Padding(padding: EdgeInsets.only(top: 22), child: Divider()),
                Text('Diskusi', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700)),
                const SizedBox(height: 4),
                Text('Berbagi tanggapan dengan teman satu prodi.', style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.black54)),
              ]))),
              SliverToBoxAdapter(child: _commentComposer()),
              FutureBuilder<List<LibComment>>(
                future: _comments,
                builder: (context, commentSnapshot) {
                  if (commentSnapshot.connectionState != ConnectionState.done) return const SliverToBoxAdapter(child: Padding(padding: EdgeInsets.all(28), child: Center(child: CircularProgressIndicator())));
                  if (commentSnapshot.hasError) return SliverToBoxAdapter(child: ErrorState(message: friendlyError(commentSnapshot.error!), onRetry: _reloadComments));
                  final comments = commentSnapshot.data!;
                  if (comments.isEmpty) return const SliverToBoxAdapter(child: Padding(padding: EdgeInsets.fromLTRB(24, 20, 24, 40), child: Text('Belum ada komentar. Mulai diskusinya, yuk.', textAlign: TextAlign.center, style: TextStyle(color: Colors.black54, fontSize: 12))));
                  return SliverPadding(padding: const EdgeInsets.fromLTRB(16, 3, 16, 36), sliver: SliverList.separated(itemCount: comments.length, separatorBuilder: (_, _) => const SizedBox(height: 8), itemBuilder: (context, index) => _commentCard(comments[index], article))); 
                },
              ),
            ]);
          },
        ),
      );

  Widget _authorLine(LibArticle article) {
    final name = article.authorName;
    final initials = name.trim().split(RegExp(r'\s+')).take(2).map((part) => part.isEmpty ? '' : part[0]).join().toUpperCase();
    return InkWell(
      onTap: () => Navigator.of(context).push<void>(MaterialPageRoute(builder: (_) => KarsaLibAuthorScreen(api: widget.api, authorId: article.authorId))),
      borderRadius: BorderRadius.circular(14),
      child: Row(children: [CircleAvatar(backgroundColor: Theme.of(context).colorScheme.primaryContainer, foregroundColor: Theme.of(context).colorScheme.onPrimaryContainer, child: Text(initials.isEmpty ? 'K' : initials)), const SizedBox(width: 11), Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(name, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)), const SizedBox(height: 3), Text(article.authorProgramName ?? 'Mahasiswa Karsa', style: const TextStyle(color: Colors.black54, fontSize: 10))])), const Icon(Icons.chevron_right_rounded, color: Colors.black45)]),
    );
  }

  Widget _commentComposer() => Padding(
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 12),
        child: Column(children: [
          if (_replyToId != null) Row(children: [Expanded(child: Text('Membalas $_replyToName', style: const TextStyle(fontSize: 11, color: Color(0xFF8B4C22)))), IconButton(visualDensity: VisualDensity.compact, onPressed: () => setState(() { _replyToId = null; _replyToName = null; }), icon: const Icon(Icons.close, size: 17))]),
          Row(crossAxisAlignment: CrossAxisAlignment.end, children: [Expanded(child: TextField(controller: _comment, minLines: 1, maxLines: 4, maxLength: 2000, decoration: InputDecoration(hintText: _replyToId == null ? 'Tulis komentar...' : 'Tulis balasan...', counterText: '', filled: true, fillColor: Colors.white, border: OutlineInputBorder(borderRadius: BorderRadius.circular(15), borderSide: const BorderSide(color: Color(0xFFF0E7DE))))),), const SizedBox(width: 8), IconButton.filled(onPressed: _sending ? null : _sendComment, tooltip: 'Kirim komentar', icon: _sending ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.arrow_upward_rounded))]),
        ]),
      );

  Widget _commentCard(LibComment comment, LibArticle article) => Card(
        child: Padding(padding: const EdgeInsets.fromLTRB(13, 12, 9, 9), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          _commentLine(comment, article),
          if (comment.replies.isNotEmpty) Padding(padding: const EdgeInsets.only(left: 22, top: 8), child: Column(children: comment.replies.map((reply) => Padding(padding: const EdgeInsets.only(top: 7), child: _commentLine(reply, article, compact: true))).toList())),
        ])),
      );

  Widget _commentLine(LibComment comment, LibArticle article, {bool compact = false}) => Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        CircleAvatar(radius: compact ? 13 : 15, backgroundColor: const Color(0xFFF3E7DA), child: Text(comment.author.isEmpty ? 'K' : comment.author[0].toUpperCase(), style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w700))),
        const SizedBox(width: 9),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [Expanded(child: Text(comment.author, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700))), Text(comment.createdAt == null ? '' : formatRelativeTime(comment.createdAt!), style: const TextStyle(fontSize: 9, color: Colors.black45))]),
          const SizedBox(height: 4),
          Text(comment.isDeleted ? 'Komentar dihapus' : comment.body ?? '', style: TextStyle(fontSize: 12, height: 1.45, color: comment.isDeleted ? Colors.black45 : const Color(0xFF504B43), fontStyle: comment.isDeleted ? FontStyle.italic : FontStyle.normal)),
          if (!compact) Wrap(spacing: 2, children: [TextButton(onPressed: comment.isDeleted ? null : () => setState(() { _replyToId = comment.id; _replyToName = comment.author; }), style: TextButton.styleFrom(visualDensity: VisualDensity.compact, padding: const EdgeInsets.symmetric(horizontal: 5)), child: const Text('Balas', style: TextStyle(fontSize: 10))), TextButton(onPressed: () => _report(commentId: comment.id), style: TextButton.styleFrom(visualDensity: VisualDensity.compact, padding: const EdgeInsets.symmetric(horizontal: 5)), child: const Text('Laporkan', style: TextStyle(fontSize: 10))), if (comment.isOwn && !comment.isDeleted) TextButton(onPressed: () => _deleteComment(comment), style: TextButton.styleFrom(visualDensity: VisualDensity.compact, padding: const EdgeInsets.symmetric(horizontal: 5)), child: const Text('Hapus', style: TextStyle(fontSize: 10, color: Colors.redAccent)))]),
          if (compact && comment.isOwn && !comment.isDeleted) Align(alignment: Alignment.centerLeft, child: TextButton(onPressed: () => _deleteComment(comment), style: TextButton.styleFrom(visualDensity: VisualDensity.compact, padding: EdgeInsets.zero), child: const Text('Hapus', style: TextStyle(fontSize: 10, color: Colors.redAccent)))),
        ])),
      ]);

  Future<void> _sendComment() async {
    if (_comment.text.trim().isEmpty) return;
    setState(() => _sending = true);
    try {
      await widget.api.createLibComment(widget.articleId, body: _comment.text.trim(), parentId: _replyToId);
      _comment.clear(); setState(() { _replyToId = null; _replyToName = null; }); await _reloadComments();
    } catch (error) { _message(friendlyError(error)); }
    finally { if (mounted) setState(() => _sending = false); }
  }

  Future<void> _deleteComment(LibComment comment) async {
    final confirm = await showDialog<bool>(context: context, builder: (context) => AlertDialog(title: const Text('Hapus komentar?'), content: const Text('Komentar akan ditandai sebagai dihapus dan tidak dapat dipulihkan.'), actions: [TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Batal')), FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Hapus'))]));
    if (confirm != true) return;
    try { await widget.api.deleteLibComment(comment.id); await _reloadComments(); }
    catch (error) { _message(friendlyError(error)); }
  }

  Future<void> _report({String? articleId, String? commentId}) async {
    String? reason;
    final details = TextEditingController();
    await showDialog<void>(context: context, builder: (dialogContext) => StatefulBuilder(builder: (context, setDialogState) => AlertDialog(
      title: Text(commentId == null ? 'Laporkan artikel' : 'Laporkan komentar'),
      content: Column(mainAxisSize: MainAxisSize.min, children: [DropdownButtonFormField<String>(value: reason, decoration: const InputDecoration(labelText: 'Alasan'), items: const [DropdownMenuItem(value: 'MISINFORMATION', child: Text('Informasi keliru')), DropdownMenuItem(value: 'INAPPROPRIATE', child: Text('Konten tidak pantas')), DropdownMenuItem(value: 'SPAM', child: Text('Spam atau promosi')), DropdownMenuItem(value: 'COPYRIGHT', child: Text('Hak cipta')), DropdownMenuItem(value: 'OTHER', child: Text('Lainnya'))], onChanged: (value) => setDialogState(() => reason = value)), const SizedBox(height: 10), TextField(controller: details, maxLines: 3, maxLength: 1000, decoration: const InputDecoration(labelText: 'Keterangan (opsional)'))]),
      actions: [TextButton(onPressed: () => Navigator.pop(dialogContext), child: const Text('Batal')), FilledButton(onPressed: reason == null ? null : () async { try { await widget.api.reportLibContent(articleId: articleId, commentId: commentId, reason: reason!, details: details.text); if (dialogContext.mounted) Navigator.pop(dialogContext); if (mounted) _message('Laporan terkirim untuk ditinjau.'); } catch (error) { if (dialogContext.mounted) _message(friendlyError(error)); } }, child: const Text('Kirim'))],
    )));
    details.dispose();
  }

  void _message(String message) { if (mounted) ScaffoldMessenger.of(context)..hideCurrentSnackBar()..showSnackBar(SnackBar(content: Text(message), behavior: SnackBarBehavior.floating)); }
}
