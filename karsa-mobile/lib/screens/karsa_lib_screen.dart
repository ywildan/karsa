import 'package:flutter/material.dart';

import '../core/api_client.dart';
import '../core/models.dart';
import '../widgets/common.dart';
import 'karsa_lib_article_screen.dart';
import 'karsa_lib_author_screen.dart';
import 'karsa_lib_vault_screen.dart';

class KarsaLibScreen extends StatefulWidget {
  const KarsaLibScreen({required this.api, required this.user, super.key});
  final ApiClient api;
  final AppUser user;

  @override
  State<KarsaLibScreen> createState() => _KarsaLibScreenState();
}

class _KarsaLibScreenState extends State<KarsaLibScreen> {
  late Future<LibBootstrap> _bootstrap;
  late Future<List<LibArticle>> _feed;
  String _sort = 'Terbaru';

  @override
  void initState() {
    super.initState();
    _load();
  }

  void _load() {
    _bootstrap = widget.api.libBootstrap();
    _feed = widget.api.libFeed();
  }

  Future<void> _refresh() async {
    setState(_load);
    await Future.wait([_bootstrap, _feed]);
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: const Color(0xFFFFFBF7),
        appBar: AppBar(
          titleSpacing: 18,
          title: Row(
            children: [
              Container(
                width: 34,
                height: 34,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.primary,
                  borderRadius: BorderRadius.circular(11),
                ),
                child: const Text('K', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w800)),
              ),
              const SizedBox(width: 10),
              const Text('Karsa ', style: TextStyle(fontWeight: FontWeight.w700)),
              Text('Lib', style: TextStyle(color: Theme.of(context).colorScheme.primary, fontWeight: FontWeight.w700)),
            ],
          ),
          actions: [
            IconButton(
              tooltip: 'Cari artikel',
              onPressed: () => _message('Pencarian artikel akan tersedia di pembaruan berikutnya.'),
              icon: const Icon(Icons.search_rounded),
            ),
            const SizedBox(width: 6),
          ],
        ),
        floatingActionButton: FutureBuilder<LibBootstrap>(
          future: _bootstrap,
          builder: (context, snapshot) => snapshot.data?.canWrite == true && snapshot.data?.profile != null
              ? FloatingActionButton.extended(
                  onPressed: () => _compose(context),
                  icon: const Icon(Icons.edit_rounded),
                  label: const Text('Tulis'),
                )
              : const SizedBox.shrink(),
        ),
        body: FutureBuilder<LibBootstrap>(
          future: _bootstrap,
          builder: (context, snapshot) {
            if (snapshot.connectionState != ConnectionState.done) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snapshot.hasError) {
              return ErrorState(message: friendlyError(snapshot.error!), onRetry: _refresh);
            }
            final bootstrap = snapshot.data!;
            if (bootstrap.profile == null) return _setup(bootstrap);
            return _feedView(bootstrap);
          },
        ),
      );

  Widget _feedView(LibBootstrap bootstrap) => RefreshIndicator(
        onRefresh: _refresh,
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            SliverToBoxAdapter(child: _welcome(bootstrap)),
            if (!bootstrap.canWrite) SliverToBoxAdapter(child: _writerAccessCard(bootstrap)),
            SliverToBoxAdapter(child: _feedHeader(bootstrap)),
            FutureBuilder<List<LibArticle>>(
              future: _feed,
              builder: (context, snapshot) {
                if (snapshot.connectionState != ConnectionState.done) {
                  return const SliverFillRemaining(child: Center(child: CircularProgressIndicator()));
                }
                if (snapshot.hasError) {
                  return SliverFillRemaining(child: ErrorState(message: friendlyError(snapshot.error!), onRetry: _refresh));
                }
                var articles = snapshot.data!;
                if (_sort == 'Populer') {
                  articles = [...articles]..sort((a, b) => b.views.compareTo(a.views));
                }
                if (articles.isEmpty) {
                  return const SliverFillRemaining(
                    child: EmptyState(
                      title: 'Belum ada artikel',
                      message: 'Saat ada tulisan baru dari prodimu, artikel itu akan muncul di sini.',
                      icon: Icons.auto_stories_outlined,
                    ),
                  );
                }
                return SliverPadding(
                  padding: const EdgeInsets.fromLTRB(16, 2, 16, 100),
                  sliver: SliverList.separated(
                    itemCount: articles.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 12),
                    itemBuilder: (context, index) => _ArticleCard(
                      article: articles[index],
                      onOpen: () => _openArticle(articles[index]),
                      onAuthor: () => _openAuthor(articles[index]),
                      onReport: () => _reportArticle(articles[index]),
                    ),
                  ),
                );
              },
            ),
          ],
        ),
      );

  Widget _welcome(LibBootstrap bootstrap) => Padding(
        padding: const EdgeInsets.fromLTRB(18, 16, 18, 2),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('RUANG BERBAGI ILMU', style: TextStyle(color: Theme.of(context).colorScheme.primary, fontSize: 10, letterSpacing: 1.4, fontWeight: FontWeight.w800)),
          const SizedBox(height: 6),
          Text('Beranda', style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.w600, letterSpacing: -.8)),
          const SizedBox(height: 4),
          Text('Cerita dan pengetahuan dari teman satu prodimu.', style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.black54)),
          const SizedBox(height: 15),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(17),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: const Color(0xFFF1DFCE)),
              gradient: const LinearGradient(colors: [Color(0xFFF9E8D8), Color(0xFFFFF2E6)]),
            ),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [Icon(Icons.wb_sunny_outlined, size: 15, color: Theme.of(context).colorScheme.primary), const SizedBox(width: 6), Text('PERPUSTAKAAN GAGASANMU', style: TextStyle(color: Theme.of(context).colorScheme.primary, fontSize: 9, letterSpacing: 1, fontWeight: FontWeight.w800))]),
              const SizedBox(height: 9),
              Text('Ilmu kecil, dibagikan bersama.', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w600, height: 1.15)),
              const SizedBox(height: 6),
              Text('Temukan pengalaman dan pengetahuan yang tumbuh dari teman satu program studimu.', style: Theme.of(context).textTheme.bodySmall?.copyWith(color: const Color(0xFF71675E), height: 1.5)),
            ]),
          ),
        ]),
      );

  Widget _writerAccessCard(LibBootstrap bootstrap) {
    final request = bootstrap.latestRequest;
    final status = request?['status'] as String?;
    if (status == 'PENDING') {
      return Padding(
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 0),
        child: Card(color: const Color(0xFFFFF5E9), child: const ListTile(leading: Icon(Icons.hourglass_top_rounded), title: Text('Permohonan sedang ditinjau'), subtitle: Text('Kami akan memperbarui akses menulismu setelah admin meninjau permohonan.'))),
      );
    }
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 0),
      child: Card(
        child: ListTile(
          leading: const Icon(Icons.draw_outlined),
          title: const Text('Punya ilmu untuk dibagikan?'),
          subtitle: const Text('Ajukan akses penulis untuk mulai membuat artikel.'),
          trailing: const Icon(Icons.chevron_right_rounded),
          onTap: () => _authorRequest(),
        ),
      ),
    );
  }

  Widget _feedHeader(LibBootstrap bootstrap) => Padding(
        padding: const EdgeInsets.fromLTRB(18, 23, 16, 9),
        child: Row(children: [
          Expanded(child: Text(bootstrap.profile!.faculty, maxLines: 1, overflow: TextOverflow.ellipsis, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700))),
          const SizedBox(width: 5),
          _sortChip('Terbaru'),
          _sortChip('Populer'),
          PopupMenuButton<String>(
            tooltip: 'Menu Karsa Lib',
            icon: const Icon(Icons.more_horiz_rounded),
            onSelected: (value) {
              if (value == 'vault') _openVault();
              if (value == 'request') _authorRequest();
            },
            itemBuilder: (context) => [
              if (bootstrap.canWrite) const PopupMenuItem(value: 'vault', child: ListTile(leading: Icon(Icons.inventory_2_outlined), title: Text('Vault penulis'))),
              if (!bootstrap.canWrite) const PopupMenuItem(value: 'request', child: ListTile(leading: Icon(Icons.draw_outlined), title: Text('Ajukan jadi penulis'))),
              const PopupMenuItem(enabled: false, child: Text('Profil prodi dikunci')),
            ],
          ),
        ]),
      );

  Widget _sortChip(String label) => Padding(
        padding: const EdgeInsets.only(left: 3),
        child: ChoiceChip(
          label: Text(label),
          selected: _sort == label,
          onSelected: (_) => setState(() => _sort = label),
          labelStyle: const TextStyle(fontSize: 10, fontWeight: FontWeight.w600),
          visualDensity: VisualDensity.compact,
          padding: EdgeInsets.zero,
          side: BorderSide.none,
        ),
      );

  Widget _setup(LibBootstrap bootstrap) => _ProfileSetup(
        api: widget.api,
        bootstrap: bootstrap,
        suggestedName: widget.user.name ?? '',
        onSaved: _refresh,
      );

  Future<void> _openArticle(LibArticle article) async {
    await Navigator.of(context).push<void>(MaterialPageRoute(
      builder: (_) => KarsaLibArticleScreen(api: widget.api, articleId: article.id),
    ));
    if (mounted) await _refresh();
  }

  Future<void> _openAuthor(LibArticle article) async {
    await Navigator.of(context).push<void>(MaterialPageRoute(
      builder: (_) => KarsaLibAuthorScreen(api: widget.api, authorId: article.authorId),
    ));
  }

  Future<void> _openVault() async {
    await Navigator.of(context).push<void>(MaterialPageRoute(builder: (_) => KarsaLibVaultScreen(api: widget.api)));
    if (mounted) await _refresh();
  }

  Future<void> _compose(BuildContext context) async {
    final title = TextEditingController();
    final body = TextEditingController();
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (context) => Padding(
        padding: EdgeInsets.fromLTRB(20, 8, 20, MediaQuery.viewInsetsOf(context).bottom + 22),
        child: SafeArea(child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Tulis artikel', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700)),
          const SizedBox(height: 6), const Text('Artikelmu akan dibagikan ke mahasiswa prodimu.', style: TextStyle(color: Colors.black54, fontSize: 12)),
          const SizedBox(height: 18), TextField(controller: title, maxLength: 120, decoration: const InputDecoration(labelText: 'Judul artikel', hintText: 'Contoh: Cara memahami jurnal umum')),
          const SizedBox(height: 12), TextField(controller: body, minLines: 7, maxLines: 12, maxLength: 20000, decoration: const InputDecoration(labelText: 'Isi artikel', hintText: 'Mulai tulis pengalaman atau pengetahuanmu...')),
          const SizedBox(height: 10), SizedBox(width: double.infinity, child: FilledButton.icon(onPressed: () async {
            try {
              await widget.api.createLibArticle(title: title.text, body: body.text);
              if (context.mounted) Navigator.pop(context);
              if (mounted) { await _refresh(); _message('Draf disimpan di vault.'); }
            } catch (error) { if (context.mounted) _message(friendlyError(error)); }
          }, icon: const Icon(Icons.save_outlined), label: const Text('Simpan draf'))),
        ])),
      ),
    );
    title.dispose(); body.dispose();
  }

  Future<void> _authorRequest() async {
    final motivation = TextEditingController();
    final topics = TextEditingController();
    var accepted = false;
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (sheetContext) => StatefulBuilder(builder: (context, setModalState) => Padding(
        padding: EdgeInsets.fromLTRB(20, 8, 20, MediaQuery.viewInsetsOf(context).bottom + 18),
        child: SafeArea(child: SingleChildScrollView(child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
          Text('Ajukan akses penulis', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700)),
          const SizedBox(height: 5), Text('${widget.user.name ?? 'Mahasiswa'} · ${widget.user.email}', style: const TextStyle(fontSize: 11, color: Colors.black54)),
          const SizedBox(height: 14), TextField(controller: motivation, minLines: 3, maxLines: 5, maxLength: 2000, decoration: const InputDecoration(labelText: 'Mengapa ingin menjadi penulis?', hintText: 'Ceritakan singkat tujuanmu berbagi ilmu.')),
          const SizedBox(height: 10), TextField(controller: topics, maxLength: 500, decoration: const InputDecoration(labelText: 'Topik artikel yang ingin ditulis', hintText: 'Contoh: akuntansi dasar, pajak, tips belajar')),
          CheckboxListTile(contentPadding: EdgeInsets.zero, value: accepted, onChanged: (value) => setModalState(() => accepted = value ?? false), title: const Text('Saya setuju mengikuti panduan komunitas Karsa Lib.', style: TextStyle(fontSize: 11)), controlAffinity: ListTileControlAffinity.leading),
          SizedBox(width: double.infinity, child: FilledButton(onPressed: !accepted ? null : () async {
            try {
              await widget.api.requestLibAuthor(motivation: motivation.text, topics: topics.text);
              if (sheetContext.mounted) Navigator.pop(sheetContext);
              if (mounted) { await _refresh(); _message('Permohonan terkirim untuk ditinjau.'); }
            } catch (error) { if (sheetContext.mounted) _message(friendlyError(error)); }
          }, child: const Text('Kirim permohonan'))),
        ]))),
      )),
    );
    motivation.dispose(); topics.dispose();
  }

  Future<void> _reportArticle(LibArticle article) async {
    await showDialog<void>(context: context, builder: (dialogContext) {
      String? reason;
      final details = TextEditingController();
      return StatefulBuilder(builder: (context, setDialogState) => AlertDialog(
        title: const Text('Laporkan artikel'),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          Text(article.title, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12)),
          const SizedBox(height: 14), DropdownButtonFormField<String>(value: reason, decoration: const InputDecoration(labelText: 'Alasan'), items: const [DropdownMenuItem(value: 'MISINFORMATION', child: Text('Informasi keliru')), DropdownMenuItem(value: 'INAPPROPRIATE', child: Text('Konten tidak pantas')), DropdownMenuItem(value: 'SPAM', child: Text('Spam atau promosi')), DropdownMenuItem(value: 'COPYRIGHT', child: Text('Hak cipta')), DropdownMenuItem(value: 'OTHER', child: Text('Lainnya'))], onChanged: (value) => setDialogState(() => reason = value)),
          const SizedBox(height: 10), TextField(controller: details, maxLines: 3, maxLength: 1000, decoration: const InputDecoration(labelText: 'Keterangan (opsional)')),
        ]),
        actions: [TextButton(onPressed: () => Navigator.pop(dialogContext), child: const Text('Batal')), FilledButton(onPressed: reason == null ? null : () async {
          try { await widget.api.reportLibContent(articleId: article.id, reason: reason!, details: details.text); if (dialogContext.mounted) Navigator.pop(dialogContext); if (mounted) _message('Laporan terkirim untuk ditinjau.'); }
          catch (error) { if (dialogContext.mounted) _message(friendlyError(error)); }
        }, child: const Text('Kirim'))],
      ));
    });
  }

  void _message(String text) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)..hideCurrentSnackBar()..showSnackBar(SnackBar(content: Text(text), behavior: SnackBarBehavior.floating));
  }
}

class _ArticleCard extends StatelessWidget {
  const _ArticleCard({required this.article, required this.onOpen, required this.onAuthor, required this.onReport});
  final LibArticle article;
  final VoidCallback onOpen;
  final VoidCallback onAuthor;
  final VoidCallback onReport;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    final initials = article.authorName.trim().split(RegExp(r'\s+')).take(2).map((word) => word.isEmpty ? '' : word[0]).join().toUpperCase();
    return Card(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(15, 14, 15, 11),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          InkWell(onTap: onAuthor, borderRadius: BorderRadius.circular(12), child: Padding(padding: const EdgeInsets.symmetric(vertical: 2), child: Row(children: [
            CircleAvatar(radius: 18, backgroundColor: colors.primaryContainer, foregroundColor: colors.onPrimaryContainer, child: Text(initials.isEmpty ? 'K' : initials, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700))),
            const SizedBox(width: 10), Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(article.authorName, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)), const SizedBox(height: 2), Text('${article.authorProgramName ?? 'Satu prodi'} · ${article.publishedAt == null ? '' : formatRelativeTime(article.publishedAt!)}', style: const TextStyle(fontSize: 10, color: Colors.black54))])),
            const Icon(Icons.chevron_right_rounded, size: 19, color: Colors.black38),
          ]))),
          const SizedBox(height: 12),
          Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5), decoration: BoxDecoration(color: const Color(0xFFF4EFE9), borderRadius: BorderRadius.circular(6)), child: const Text('ARTIKEL', style: TextStyle(fontSize: 8, letterSpacing: .8, fontWeight: FontWeight.w800, color: Color(0xFF777065)))),
          const SizedBox(height: 8),
          InkWell(onTap: onOpen, child: Text(article.title, style: const TextStyle(fontFamily: 'Georgia', fontSize: 19, height: 1.25, fontWeight: FontWeight.w600))),
          const SizedBox(height: 6),
          InkWell(onTap: onOpen, child: Text(article.body, maxLines: 3, overflow: TextOverflow.ellipsis, style: const TextStyle(fontFamily: 'Georgia', fontSize: 12, height: 1.6, color: Color(0xFF6E6A62)))),
          const Divider(height: 22),
          Row(children: [Icon(Icons.visibility_outlined, size: 15, color: colors.onSurfaceVariant), const SizedBox(width: 5), Text('${article.views} pembaca', style: TextStyle(fontSize: 10, color: colors.onSurfaceVariant)), const SizedBox(width: 14), Icon(Icons.mode_comment_outlined, size: 14, color: colors.onSurfaceVariant), const SizedBox(width: 5), Text('${article.commentsCount}', style: TextStyle(fontSize: 10, color: colors.onSurfaceVariant)), const Spacer(), TextButton.icon(onPressed: onReport, icon: const Icon(Icons.flag_outlined, size: 14), label: const Text('Laporkan'), style: TextButton.styleFrom(visualDensity: VisualDensity.compact, foregroundColor: Colors.black54, textStyle: const TextStyle(fontSize: 10))) ]),
        ]),
      ),
    );
  }
}

class _ProfileSetup extends StatefulWidget {
  const _ProfileSetup({required this.api, required this.bootstrap, required this.suggestedName, required this.onSaved});
  final ApiClient api;
  final LibBootstrap bootstrap;
  final String suggestedName;
  final Future<void> Function() onSaved;

  @override
  State<_ProfileSetup> createState() => _ProfileSetupState();
}

class _ProfileSetupState extends State<_ProfileSetup> {
  late final TextEditingController _name = TextEditingController(text: widget.suggestedName);
  String? _facultyId;
  String? _programId;
  String? _classId;
  bool _saving = false;

  @override
  void dispose() { _name.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) => ListView(padding: const EdgeInsets.all(20), children: [
        const SizedBox(height: 12),
        Icon(Icons.auto_stories_rounded, size: 42, color: Theme.of(context).colorScheme.primary),
        const SizedBox(height: 14),
        Text('Siapkan ruang belajarmu', textAlign: TextAlign.center, style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700)),
        const SizedBox(height: 7),
        const Text('Pilih identitas program studi agar feed Karsa Lib menampilkan artikel yang tepat untukmu.', textAlign: TextAlign.center, style: TextStyle(color: Colors.black54, fontSize: 12, height: 1.5)),
        const SizedBox(height: 22),
        TextField(controller: _name, textCapitalization: TextCapitalization.words, maxLength: 80, decoration: const InputDecoration(labelText: 'Nama yang ditampilkan', prefixIcon: Icon(Icons.person_outline))),
        const SizedBox(height: 12),
        DropdownButtonFormField<String>(value: _facultyId, isExpanded: true, decoration: const InputDecoration(labelText: 'Fakultas'), items: widget.bootstrap.faculties.map((faculty) => DropdownMenuItem(value: faculty.id, child: Text(faculty.name, overflow: TextOverflow.ellipsis))).toList(), onChanged: (value) => setState(() { _facultyId = value; _programId = null; _classId = null; })),
        const SizedBox(height: 12),
        DropdownButtonFormField<String>(value: _programId, isExpanded: true, decoration: const InputDecoration(labelText: 'Program studi'), items: widget.bootstrap.programs.where((program) => program.facultyId == _facultyId).map((program) => DropdownMenuItem(value: program.id, child: Text(program.name, overflow: TextOverflow.ellipsis))).toList(), onChanged: (value) => setState(() { _programId = value; _classId = null; })),
        if (widget.bootstrap.faculties.isEmpty || widget.bootstrap.programs.where((program) => program.facultyId == _facultyId).isEmpty)
          const Padding(padding: EdgeInsets.only(top: 7), child: Text('Pilihan fakultas/prodi belum tersedia. Admin Karsa perlu mengatur Fakultas dan menghubungkan Prodi terlebih dahulu.', style: TextStyle(fontSize: 11, color: Colors.black54, height: 1.4))),
        const SizedBox(height: 12),
        DropdownButtonFormField<String>(value: _classId, isExpanded: true, decoration: const InputDecoration(labelText: 'Kelas (opsional)'), items: [const DropdownMenuItem<String>(value: null, child: Text('Tidak memilih kelas')), ...widget.bootstrap.classes.where((item) => item.programId == _programId).map((item) => DropdownMenuItem(value: item.id, child: Text('${item.name}${item.semesterName == null ? '' : ' · ${item.semesterName}'}', overflow: TextOverflow.ellipsis)))], onChanged: (value) => setState(() => _classId = value)),
        const SizedBox(height: 15),
        Container(padding: const EdgeInsets.all(13), decoration: BoxDecoration(color: const Color(0xFFFFF4E9), borderRadius: BorderRadius.circular(13), border: Border.all(color: const Color(0xFFF1DFCE))), child: const Row(crossAxisAlignment: CrossAxisAlignment.start, children: [Icon(Icons.lock_outline, size: 17, color: Color(0xFF9B4B18)), SizedBox(width: 9), Expanded(child: Text('Fakultas dan program studimu tidak dapat diubah setelah disimpan. Pilihan prodi menentukan artikel yang bisa kamu lihat.', style: TextStyle(fontSize: 11, height: 1.5, color: Color(0xFF735C49))))])),
        const SizedBox(height: 18),
        FilledButton(onPressed: _saving || _facultyId == null || _programId == null || _name.text.trim().length < 2 ? null : _save, child: Padding(padding: const EdgeInsets.symmetric(vertical: 13), child: Text(_saving ? 'Menyimpan…' : 'Simpan profil'))),
      ]);

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      await widget.api.createLibProfile(displayName: _name.text.trim(), facultyId: _facultyId!, programId: _programId!, classId: _classId);
      await widget.onSaved();
    } catch (error) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(friendlyError(error))));
    } finally { if (mounted) setState(() => _saving = false); }
  }
}
