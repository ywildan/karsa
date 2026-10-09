import 'package:flutter/material.dart';

import '../core/api_client.dart';
import '../core/models.dart';
import '../widgets/common.dart';
import 'karsa_lib_article_screen.dart';

class KarsaLibAuthorScreen extends StatefulWidget {
  const KarsaLibAuthorScreen({required this.api, required this.authorId, super.key});
  final ApiClient api;
  final String authorId;

  @override
  State<KarsaLibAuthorScreen> createState() => _KarsaLibAuthorScreenState();
}

class _KarsaLibAuthorScreenState extends State<KarsaLibAuthorScreen> {
  late Future<LibAuthorProfile> _future;

  @override
  void initState() { super.initState(); _future = widget.api.libAuthorProfile(widget.authorId); }

  Future<void> _reload() async {
    setState(() => _future = widget.api.libAuthorProfile(widget.authorId));
    try { await _future; } catch (_) { /* Rendered by FutureBuilder. */ }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Profil penulis')),
        body: RefreshIndicator(onRefresh: _reload, child: FutureBuilder<LibAuthorProfile>(future: _future, builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) return const LoadingState(message: 'Memuat profil…');
          if (snapshot.hasError) return ErrorState(message: friendlyError(snapshot.error!), onRetry: () => setState(() => _future = widget.api.libAuthorProfile(widget.authorId)));
          final profile = snapshot.data!;

          return CustomScrollView(slivers: [
            SliverToBoxAdapter(child: Padding(padding: const EdgeInsets.fromLTRB(KarsaSpace.gutter, KarsaSpace.lg, KarsaSpace.gutter, KarsaSpace.xl), child: Column(children: [
              InitialAvatar(name: profile.name, image: profile.image, radius: 38),
              const SizedBox(height: 12), Text(profile.name, style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700)),
              const SizedBox(height: 4), Text(profile.programName, textAlign: TextAlign.center, style: const TextStyle(color: KarsaColors.muted, fontSize: KarsaType.body)),
              Text(profile.faculty, textAlign: TextAlign.center, style: const TextStyle(color: KarsaColors.muted, fontSize: KarsaType.caption)),
              const SizedBox(height: 17),
              Row(children: [Expanded(child: _StatTile(value: profile.articleCount.toString(), label: 'Artikel terbit', icon: Icons.auto_stories_outlined)), const SizedBox(width: 10), Expanded(child: _StatTile(value: profile.totalViews.toString(), label: 'Total pembaca', icon: Icons.visibility_outlined))]),
              const SizedBox(height: 9), const Text('Total pembaca adalah jumlah pembaca unik pada tiap artikel.', textAlign: TextAlign.center, style: TextStyle(color: KarsaColors.muted, fontSize: 12)),
            ]))),
            SliverPadding(padding: const EdgeInsets.fromLTRB(KarsaSpace.gutter, KarsaSpace.xs, KarsaSpace.gutter, KarsaSpace.sm), sliver: SliverToBoxAdapter(child: Text('Tulisan ${profile.name.split(' ').first}', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)))),
            if (profile.articles.isEmpty)
              const SliverFillRemaining(child: EmptyState(title: 'Belum ada artikel', message: 'Artikel yang diterbitkan penulis akan tampil di sini.', icon: Icons.menu_book_outlined))
            else
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(KarsaSpace.gutter, 0, KarsaSpace.gutter, KarsaSpace.xl),
                sliver: SliverList.separated(
                  itemCount: profile.articles.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 10),
                  itemBuilder: (context, index) => _ProfileArticleCard(
                    article: profile.articles[index],
                    onTap: () async { await Navigator.of(context).push<void>(
                      MaterialPageRoute(
                        builder: (_) => KarsaLibArticleScreen(
                          api: widget.api,
                          articleId: profile.articles[index].id,
                        ),
                      ),
                    ); if (mounted) await _reload(); },
                  ),
                ),
              ),
          ]);
        })),
      );
}

class _StatTile extends StatelessWidget {
  const _StatTile({required this.value, required this.label, required this.icon});
  final String value;
  final String label;
  final IconData icon;
  @override
  Widget build(BuildContext context) => Card(child: Padding(padding: const EdgeInsets.symmetric(vertical: KarsaSpace.lg, horizontal: KarsaSpace.md), child: Row(children: [Icon(icon, color: Theme.of(context).colorScheme.primary, size: 19), const SizedBox(width: 9), Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(value, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800)), Text(label, style: const TextStyle(fontSize: KarsaType.caption, color: KarsaColors.muted))]))])));
}

class _ProfileArticleCard extends StatelessWidget {
  const _ProfileArticleCard({required this.article, required this.onTap});
  final LibArticle article;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => Card(child: InkWell(borderRadius: BorderRadius.circular(KarsaRadius.card), onTap: onTap, child: Padding(padding: const EdgeInsets.all(KarsaSpace.lg), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
    Text(article.title, style: const TextStyle(fontSize: KarsaType.title, height: 1.3, fontWeight: FontWeight.w600)),
    const SizedBox(height: 6), Text(article.body, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: KarsaType.body, height: 1.5, color: KarsaColors.muted)),
    const SizedBox(height: 12), Row(children: [Icon(Icons.visibility_outlined, size: 15, color: Theme.of(context).colorScheme.onSurfaceVariant), const SizedBox(width: 5), Text('${article.views} pembaca', style: TextStyle(fontSize: KarsaType.caption, color: Theme.of(context).colorScheme.onSurfaceVariant)), const Spacer(), Text(article.publishedAt == null ? '' : formatRelativeTime(article.publishedAt!), style: const TextStyle(fontSize: KarsaType.caption, color: KarsaColors.muted))]),
  ]))));
}
