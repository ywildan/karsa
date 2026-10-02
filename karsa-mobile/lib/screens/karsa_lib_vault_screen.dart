import 'package:flutter/material.dart';

import '../core/api_client.dart';
import '../core/models.dart';
import '../widgets/common.dart';
import 'karsa_lib_article_screen.dart';
import 'karsa_lib_editor_screen.dart';

class KarsaLibVaultScreen extends StatefulWidget {
  const KarsaLibVaultScreen({required this.api, super.key});
  final ApiClient api;
  @override
  State<KarsaLibVaultScreen> createState() => _KarsaLibVaultScreenState();
}

class _KarsaLibVaultScreenState extends State<KarsaLibVaultScreen> {
  late Future<List<LibArticle>> _future;
  final Set<String> _busy = {};
  @override
  void initState() { super.initState(); _future = widget.api.libVault(); }
  Future<void> _reload() async {
    if (!mounted) return;
    setState(() => _future = widget.api.libVault());
    try { await _future; } catch (_) { /* Rendered by FutureBuilder. */ }
  }
  Future<void> _edit([LibArticle? article]) async {
    final saved = await Navigator.of(context).push<bool>(MaterialPageRoute(
      builder: (_) => KarsaLibEditorScreen(api: widget.api, article: article)));
    if (mounted && saved == true) {
      _message(article == null ? 'Draf disimpan.' : 'Perubahan disimpan.');
      await _reload();
    }
  }
  void _message(String message) {
    if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }
  Future<void> _act(LibArticle article, String action) async {
    if (_busy.contains(article.id)) return;
    if (action == 'edit') { await _edit(article); return; }
    final title = switch (action) {
      'delete' => 'Hapus draf?', 'archive' => 'Arsipkan artikel?',
      'publish' => 'Terbitkan artikel?', _ => 'Terbitkan kembali?',
    };
    final description = switch (action) {
      'delete' => 'Draf ini akan dihapus permanen.',
      'archive' => 'Artikel tidak lagi muncul di beranda. Kamu bisa menerbitkannya kembali.',
      _ => 'Artikel akan dapat dibaca oleh seluruh mahasiswa di prodimu.',
    };
    final confirmed = await showDialog<bool>(context: context, builder: (context) => AlertDialog(
      title: Text(title), content: Text(description),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Batal')),
        FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Lanjutkan')),
      ],
    ));
    if (!mounted || confirmed != true) return;
    setState(() => _busy.add(article.id));
    try {
      if (action == 'delete') {
        await widget.api.deleteLibDraft(article.id);
      } else {
        await widget.api.updateLibArticle(article.id, action: switch (action) {
          'publish' => 'PUBLISH', 'archive' => 'ARCHIVE', _ => 'RESTORE',
        });
      }
      _message(switch (action) {
        'delete' => 'Draf dihapus.', 'archive' => 'Artikel diarsipkan.',
        'publish' => 'Artikel berhasil diterbitkan.', _ => 'Artikel diterbitkan kembali.',
      });
      await _reload();
    } catch (error) { _message(friendlyError(error)); }
    finally { if (mounted) setState(() => _busy.remove(article.id)); }
  }

  @override
  Widget build(BuildContext context) => DefaultTabController(
    length: 3,
    child: Scaffold(
      appBar: AppBar(title: const Text('Tulisan saya'), bottom: const TabBar(
        tabs: [Tab(text: 'Draf'), Tab(text: 'Terbit'), Tab(text: 'Arsip')],
      )),
      floatingActionButton: FloatingActionButton.extended(onPressed: () => _edit(),
        icon: const Icon(Icons.edit_rounded), label: const Text('Tulis')),
      body: FutureBuilder<List<LibArticle>>(future: _future, builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) return const LoadingState();
        if (snapshot.hasError) return ErrorState(message: friendlyError(snapshot.error!), onRetry: _reload);
        return TabBarView(children: [
          for (final status in ['DRAFT', 'PUBLISHED', 'ARCHIVED']) _list(
            snapshot.data!.where((article) => article.status == status).toList(), status),
        ]);
      }),
    ),
  );

  Widget _list(List<LibArticle> articles, String status) => RefreshIndicator(
    onRefresh: _reload,
    child: CustomScrollView(physics: const AlwaysScrollableScrollPhysics(), slivers: [
      if (articles.isEmpty) SliverFillRemaining(hasScrollBody: false, child: EmptyState(
        title: switch (status) { 'DRAFT' => 'Belum ada draf', 'PUBLISHED' => 'Belum ada artikel terbit', _ => 'Arsip masih kosong' },
        message: switch (status) { 'DRAFT' => 'Mulai menulis dengan tombol Tulis.', 'PUBLISHED' => 'Terbitkan drafmu untuk berbagi dengan teman satu prodi.', _ => 'Artikel yang kamu arsipkan tersimpan di sini.' },
        icon: Icons.auto_stories_outlined,
      )) else SliverPadding(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 100),
        sliver: SliverList.separated(itemCount: articles.length, separatorBuilder: (_, _) => const SizedBox(height: 12),
          itemBuilder: (context, index) {
            final article = articles[index];
            final busy = _busy.contains(article.id);
            return Card(child: Padding(padding: const EdgeInsets.all(18), child: Column(
              crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  StatusBadge(label: switch (status) { 'DRAFT' => 'Draf', 'PUBLISHED' => 'Terbit', _ => 'Diarsipkan' }),
                  const Spacer(),
                  PopupMenuButton<String>(enabled: !busy, tooltip: 'Opsi tulisan',
                    onSelected: (action) => _act(article, action),
                    itemBuilder: (_) => [
                      if (status != 'ARCHIVED') const PopupMenuItem(value: 'edit', child: Text('Edit tulisan')),
                      if (status == 'DRAFT') const PopupMenuItem(value: 'publish', child: Text('Terbitkan')),
                      if (status == 'PUBLISHED') const PopupMenuItem(value: 'archive', child: Text('Arsipkan')),
                      if (status == 'ARCHIVED') const PopupMenuItem(value: 'restore', child: Text('Terbitkan kembali')),
                      if (status == 'DRAFT') const PopupMenuItem(value: 'delete', child: Text('Hapus draf')),
                    ]),
                ]),
                const SizedBox(height: 8),
                Text(article.title, style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w700, height: 1.35)),
                const SizedBox(height: 8),
                Text(article.body, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 14, height: 1.6, color: KarsaColors.muted)),
                const SizedBox(height: 12),
                if (status != 'DRAFT') Text('${article.views} pembaca · ${article.commentsCount} komentar',
                  style: const TextStyle(fontSize: 12, color: KarsaColors.muted)),
                if (article.updatedAt != null) Text('Diperbarui ${formatRelativeTime(article.updatedAt!)}',
                  style: const TextStyle(fontSize: 12, color: KarsaColors.muted)),
                const SizedBox(height: 12),
                SizedBox(width: double.infinity, child: OutlinedButton.icon(
                  onPressed: busy ? null : () async {
                    if (status == 'DRAFT') { await _edit(article); }
                    else if (status == 'ARCHIVED') { await _act(article, 'restore'); }
                    else {
                      await Navigator.of(context).push<void>(MaterialPageRoute(
                        builder: (_) => KarsaLibArticleScreen(api: widget.api, articleId: article.id)));
                      if (mounted) await _reload();
                    }
                  },
                  icon: busy ? const SizedBox.square(dimension: 18, child: CircularProgressIndicator(strokeWidth: 2))
                    : Icon(status == 'DRAFT' ? Icons.edit_outlined : status == 'ARCHIVED' ? Icons.restore_rounded : Icons.menu_book_outlined),
                  label: Text(busy ? 'Memproses…' : status == 'DRAFT' ? 'Lanjut menulis' : status == 'ARCHIVED' ? 'Terbitkan kembali' : 'Baca artikel'),
                )),
              ],
            )));
          },
        ),
      ),
    ]),
  );
}
