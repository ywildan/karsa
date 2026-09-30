import 'package:flutter/material.dart';

import '../core/api_client.dart';
import '../core/models.dart';
import '../widgets/common.dart';
import 'karsa_lib_article_screen.dart';

class KarsaLibVaultScreen extends StatefulWidget {
  const KarsaLibVaultScreen({required this.api, super.key});
  final ApiClient api;
  @override
  State<KarsaLibVaultScreen> createState() => _KarsaLibVaultScreenState();
}

class _KarsaLibVaultScreenState extends State<KarsaLibVaultScreen> {
  late Future<List<LibArticle>> _future;
  @override
  void initState() { super.initState(); _future = widget.api.libVault(); }
  Future<void> _reload() async { setState(() => _future = widget.api.libVault()); await _future; }

  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: const Color(0xFFFFFBF7),
        appBar: AppBar(title: const Text('Vault penulis')),
        body: FutureBuilder<List<LibArticle>>(future: _future, builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) return const Center(child: CircularProgressIndicator());
          if (snapshot.hasError) return ErrorState(message: friendlyError(snapshot.error!), onRetry: _reload);
          final articles = snapshot.data!;
          if (articles.isEmpty) return const EmptyState(title: 'Vault masih kosong', message: 'Draf dan artikelmu akan tersimpan di sini.', icon: Icons.inventory_2_outlined);
          return RefreshIndicator(onRefresh: _reload, child: ListView.separated(padding: const EdgeInsets.all(16), itemCount: articles.length, separatorBuilder: (_, _) => const SizedBox(height: 10), itemBuilder: (context, index) => _VaultCard(article: articles[index], onChanged: _reload, api: widget.api)));
        }),
      );
}

class _VaultCard extends StatelessWidget {
  const _VaultCard({required this.article, required this.onChanged, required this.api});
  final LibArticle article;
  final Future<void> Function() onChanged;
  final ApiClient api;

  String get _status => switch (article.status) { 'PUBLISHED' => 'Terbit', 'ARCHIVED' => 'Diarsipkan', _ => 'Draf' };
  Color _statusColor(BuildContext context) => switch (article.status) { 'PUBLISHED' => const Color(0xFF55724F), 'ARCHIVED' => Colors.black54, _ => Theme.of(context).colorScheme.primary };

  @override
  Widget build(BuildContext context) => Card(child: Padding(padding: const EdgeInsets.all(15), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
    Row(children: [Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4), decoration: BoxDecoration(color: _statusColor(context).withValues(alpha: .1), borderRadius: BorderRadius.circular(20)), child: Text(_status, style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: _statusColor(context)))), const Spacer(), PopupMenuButton<String>(onSelected: (action) => _act(context, action), itemBuilder: (context) => [if (article.status != 'ARCHIVED') const PopupMenuItem(value: 'edit', child: Text('Edit')), if (article.status == 'DRAFT') const PopupMenuItem(value: 'publish', child: Text('Terbitkan')), if (article.status == 'PUBLISHED') const PopupMenuItem(value: 'archive', child: Text('Arsipkan')), if (article.status == 'ARCHIVED') const PopupMenuItem(value: 'restore', child: Text('Terbitkan kembali')), if (article.status == 'DRAFT') const PopupMenuItem(value: 'delete', child: Text('Hapus draf'))])]),
    InkWell(onTap: article.status == 'PUBLISHED' ? () => Navigator.of(context).push<void>(MaterialPageRoute(builder: (_) => KarsaLibArticleScreen(api: api, articleId: article.id))) : null, child: Text(article.title, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontFamily: 'Georgia', fontWeight: FontWeight.w600, fontSize: 18, height: 1.3))),
    const SizedBox(height: 7), Text(article.body, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontFamily: 'Georgia', color: Colors.black54, fontSize: 11, height: 1.5)),
    if (article.status != 'DRAFT') Padding(padding: const EdgeInsets.only(top: 11), child: Row(children: [const Icon(Icons.visibility_outlined, size: 15, color: Colors.black54), const SizedBox(width: 5), Text('${article.views} pembaca', style: const TextStyle(fontSize: 10, color: Colors.black54)), const SizedBox(width: 12), const Icon(Icons.mode_comment_outlined, size: 14, color: Colors.black54), const SizedBox(width: 5), Text('${article.commentsCount} komentar', style: const TextStyle(fontSize: 10, color: Colors.black54))])),
  ])));

  Future<void> _act(BuildContext context, String action) async {
    if (action == 'delete') {
      final confirmed = await showDialog<bool>(context: context, builder: (context) => AlertDialog(title: const Text('Hapus draf?'), content: const Text('Draf ini akan dihapus permanen.'), actions: [TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Batal')), FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Hapus'))]));
      if (confirmed != true) return;
    }
    if (action == 'edit') { await _edit(context); return; }
    final apiAction = switch (action) { 'publish' => 'PUBLISH', 'archive' => 'ARCHIVE', 'restore' => 'RESTORE', _ => null };
    try {
      if (action == 'delete') await api.deleteLibDraft(article.id);
      else if (apiAction != null) await api.updateLibArticle(article.id, action: apiAction);
      await onChanged();
      if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(action == 'delete' ? 'Draf dihapus.' : 'Artikel diperbarui.'), behavior: SnackBarBehavior.floating));
    } catch (error) { if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(friendlyError(error)))); }
  }

  Future<void> _edit(BuildContext context) async {
    final title = TextEditingController(text: article.title);
    final body = TextEditingController(text: article.body);
    await showModalBottomSheet<void>(context: context, isScrollControlled: true, showDragHandle: true, builder: (context) => Padding(padding: EdgeInsets.fromLTRB(20, 8, 20, MediaQuery.viewInsetsOf(context).bottom + 20), child: SafeArea(child: SingleChildScrollView(child: Column(mainAxisSize: MainAxisSize.min, children: [TextField(controller: title, maxLength: 120, decoration: const InputDecoration(labelText: 'Judul')), const SizedBox(height: 10), TextField(controller: body, minLines: 7, maxLines: 12, maxLength: 20000, decoration: const InputDecoration(labelText: 'Isi artikel')), const SizedBox(height: 12), SizedBox(width: double.infinity, child: FilledButton(onPressed: () async { try { await api.updateLibArticle(article.id, action: 'EDIT', title: title.text, body: body.text); if (context.mounted) Navigator.pop(context); await onChanged(); } catch (error) { if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(friendlyError(error)))); } }, child: const Text('Simpan perubahan')))])))));
    title.dispose(); body.dispose();
  }
}
