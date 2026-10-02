import 'dart:async';
import 'dart:ui';

import 'package:flutter/material.dart';

import '../core/api_client.dart';
import '../core/models.dart';
import '../widgets/common.dart';
import '../widgets/lib_report_dialog.dart';
import 'karsa_lib_editor_screen.dart';
import 'karsa_lib_author_request_screen.dart';
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
  Future<List<LibArticle>>? _feed;
  final TextEditingController _searchController = TextEditingController();
  Timer? _searchDebounce;
  String _sort = 'latest';
  String _searchQuery = '';


  @override
  void initState() {
    super.initState();
    _load();
  }

  void _load() {
    _bootstrap = widget.api.libBootstrap();
    _feed = null;
  }

  Future<List<LibArticle>> _requestFeed() => widget.api.libFeed(
        sort: _sort,
        query: _searchQuery,
      );

  void _selectSort(String sort) {
    if (_sort == sort) return;
    setState(() {
      _sort = sort;
      _feed = _requestFeed();
    });
  }

  void _applySearch(String value) {
    final query = value.trim();
    if (query == _searchQuery) return;
    setState(() {
      _searchQuery = query;
      _feed = _requestFeed();
    });
  }

  void _onSearchChanged(String value) {
    _searchDebounce?.cancel();
    _searchDebounce = Timer(const Duration(milliseconds: 350), () {
      if (mounted) _applySearch(value);
    });
  }

  @override
  void dispose() {
    _searchDebounce?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _refresh() async {
    setState(_load);
    try {
      final bootstrap = await _bootstrap;
      if (!mounted || bootstrap.profile == null) return;
      final feed = _feed ??= _requestFeed();
      setState(() {});
      await feed;
    } catch (_) {
      // FutureBuilder displays the request error and its retry action.
    }
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
            FutureBuilder<LibBootstrap>(future: _bootstrap, builder: (context, snapshot) {
              final bootstrap = snapshot.data;
              if (bootstrap?.profile == null) return const SizedBox.shrink();
              final pending = bootstrap!.latestRequest?['status'] == 'PENDING';
              return PopupMenuButton<String>(
                tooltip: 'Menu Karsa Lib',
                onSelected: (value) {
                  if (value == 'vault') _openVault();
                  if (value == 'request') _authorRequest();
                  if (value == 'profile') Navigator.of(context).push<void>(MaterialPageRoute(
                    builder: (_) => KarsaLibAuthorScreen(api: widget.api, authorId: widget.user.id)));
                },
                itemBuilder: (_) => [
                  if (bootstrap.canWrite) ...[
                    const PopupMenuItem(value: 'vault', child: Text('Tulisan saya')),
                    const PopupMenuItem(value: 'profile', child: Text('Profil penulis saya')),
                  ] else PopupMenuItem(value: 'request', enabled: !pending,
                      child: Text(pending ? 'Permohonan sedang ditinjau' : 'Ajukan akses penulis')),
                  const PopupMenuItem(enabled: false, child: Text('Fakultas dan prodi dikunci')),
                ],
              );
            }),
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

  Widget _feedView(LibBootstrap bootstrap) {
    _feed ??= _requestFeed();
    return RefreshIndicator(
        onRefresh: _refresh,
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            SliverToBoxAdapter(child: _welcome(bootstrap)),
            if (!bootstrap.canWrite)
              SliverToBoxAdapter(child: _writerAccessCard(bootstrap)),
            SliverPersistentHeader(pinned: true, delegate: _FeedControls(
              height: 138 + (MediaQuery.textScalerOf(context).scale(14) - 14).clamp(0, 40).toDouble(),
              child: Column(children: [_searchField(), _feedHeader(bootstrap)]),
            )),
            FutureBuilder<List<LibArticle>>(
              future: _feed,
              builder: (context, snapshot) {
                if (snapshot.connectionState != ConnectionState.done) {
                  return const SliverFillRemaining(child: Center(child: CircularProgressIndicator()));
                }
                if (snapshot.hasError) {
                  return SliverFillRemaining(child: ErrorState(message: friendlyError(snapshot.error!), onRetry: _refresh));
                }
                final articles = snapshot.data!;
                if (articles.isEmpty) {
                  return SliverFillRemaining(
                    child: EmptyState(
                      title: _searchQuery.isEmpty ? 'Belum ada artikel' : 'Artikel tidak ditemukan',
                      message: _searchQuery.isEmpty
                          ? 'Saat ada tulisan baru dari prodimu, artikel itu akan muncul di sini.'
                          : 'Tidak ada judul yang cocok di program studimu. Coba kata kunci lain.',
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
                      viewPeriodLabel: _sort == 'trending_7d' ? '7 hari' : _sort == 'trending_30d' ? '30 hari' : null,
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
  }

  Widget _welcome(LibBootstrap bootstrap) {
    final names = bootstrap.programs.where((p) => p.id == bootstrap.profile!.programId);
    final program = names.isEmpty ? 'Program studimu' : names.first.name;
    return Padding(padding: const EdgeInsets.fromLTRB(20, 14, 20, 12),
      child: SectionHeading(title: program, subtitle: 'Tulisan dan pengalaman dari teman satu prodi.'),
    );
  }

  Widget _writerAccessCard(LibBootstrap bootstrap) {
    final request = bootstrap.latestRequest;
    final status = request?['status'];
    if (status == null) {
      return Padding(padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
        child: Card(child: ListTile(
          leading: const Icon(Icons.edit_note_rounded, color: KarsaColors.orange),
          title: const Text('Ingin berbagi tulisan?'),
          subtitle: const Text('Ajukan akses penulis Karsa Lib.'),
          trailing: const Icon(Icons.chevron_right_rounded),
          onTap: _authorRequest,
        )));
    }
    return Padding(padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
      child: InfoNotice(
        icon: status == 'PENDING' ? Icons.hourglass_top_rounded : Icons.info_outline_rounded,
        title: status == 'PENDING' ? 'Permohonan sedang ditinjau' : 'Permohonan belum disetujui',
        message: status == 'PENDING'
          ? 'Kamu tetap bisa membaca dan berdiskusi. Tarik layar untuk memperbarui status akses.'
          : (request?['decision_note'] as String?) ?? 'Lihat kembali permohonanmu. Kamu bisa mengajukan ulang lewat menu Karsa Lib.',
      ),
    );
  }

  Widget _feedHeader(LibBootstrap bootstrap) => Padding(
    padding: const EdgeInsets.symmetric(horizontal: 18),
    child: SingleChildScrollView(scrollDirection: Axis.horizontal,
      child: Row(children: [
        _sortChip('Terbaru', 'latest'),
        _sortChip('Trending 7 hari', 'trending_7d'),
        _sortChip('Trending 30 hari', 'trending_30d'),
      ]),
    ),
  );

  Widget _searchField() => Padding(
        padding: const EdgeInsets.fromLTRB(18, 2, 18, 12),
        child: TextField(
          controller: _searchController,
          autofocus: false,
          maxLength: 100,
          onChanged: (value) { setState(() {}); _onSearchChanged(value); },
          onSubmitted: (value) {
            _searchDebounce?.cancel();
            _applySearch(value);
          },
          textInputAction: TextInputAction.search,
          decoration: InputDecoration(
            hintText: 'Cari judul artikel di prodimu',
            prefixIcon: const Icon(Icons.search_rounded),
            counterText: '',
            suffixIcon: _searchController.text.isEmpty
                ? null
                : IconButton(
                    tooltip: 'Hapus pencarian',
                    onPressed: () {
                      _searchDebounce?.cancel();
                      _searchController.clear();
                      _applySearch('');
                    },
                    icon: const Icon(Icons.close_rounded),
                  ),
          ),
        ),
      );

  Widget _sortChip(String label, String value) => Padding(
        padding: const EdgeInsets.only(left: 3),
        child: ChoiceChip(
          label: Text(label),
          selected: _sort == value,
          onSelected: (_) => _selectSort(value),
          labelStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
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
    final saved = await Navigator.of(context).push<bool>(MaterialPageRoute(
      builder: (_) => KarsaLibEditorScreen(api: widget.api)));
    if (mounted && saved == true) {
      await _refresh();
      _message('Draf disimpan di Tulisan saya.');
    }
  }

  Future<void> _authorRequest() async {
    final sent = await Navigator.of(context).push<bool>(MaterialPageRoute(
      builder: (_) => KarsaLibAuthorRequestScreen(api: widget.api)));
    if (mounted && sent == true) {
      await _refresh();
      _message('Permohonan terkirim untuk ditinjau.');
    }
  }

  Future<void> _reportArticle(LibArticle article) async {
    final sent = await showLibReportDialog(context, api: widget.api, articleId: article.id);
    if (mounted && sent == true) _message('Laporan terkirim untuk ditinjau.');
  }

  void _message(String text) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)..hideCurrentSnackBar()..showSnackBar(SnackBar(content: Text(text), behavior: SnackBarBehavior.floating));
  }
}

class _FeedControls extends SliverPersistentHeaderDelegate {
  const _FeedControls({required this.child, required this.height});
  final Widget child;
  final double height;
  @override
  double get minExtent => height;
  @override
  double get maxExtent => height;
  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) => ClipRect(
    child: BackdropFilter(filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
      child: Container(color: KarsaColors.background.withValues(alpha: .94),
        padding: const EdgeInsets.only(top: 8), child: child)),
  );
  @override
  bool shouldRebuild(covariant _FeedControls oldDelegate) => true;
}

class _ArticleCard extends StatelessWidget {
  const _ArticleCard({required this.article, required this.onOpen, required this.onAuthor, required this.onReport, this.viewPeriodLabel});
  final LibArticle article;
  final VoidCallback onOpen;
  final VoidCallback onAuthor;
  final VoidCallback onReport;
  final String? viewPeriodLabel;
  @override
  Widget build(BuildContext context) => Card(
    clipBehavior: Clip.antiAlias,
    child: Padding(padding: const EdgeInsets.all(18), child: Column(
      crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Expanded(child: InkWell(onTap: onAuthor, borderRadius: BorderRadius.circular(12),
            child: Padding(padding: const EdgeInsets.symmetric(vertical: 6), child: Row(children: [
              InitialAvatar(name: article.authorName, radius: 18),
              const SizedBox(width: 10),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(article.authorName, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                Text(article.publishedAt == null ? article.authorProgramName ?? 'Satu prodi'
                  : formatRelativeTime(article.publishedAt!), style: const TextStyle(fontSize: 12, color: KarsaColors.muted)),
              ])),
            ])),
          )),
          PopupMenuButton<String>(tooltip: 'Opsi artikel', onSelected: (_) => onReport(),
            itemBuilder: (_) => [const PopupMenuItem(value: 'report', child: Text('Laporkan artikel'))]),
        ]),
        const SizedBox(height: 12),
        InkWell(onTap: onOpen, borderRadius: BorderRadius.circular(8),
          child: Padding(padding: const EdgeInsets.symmetric(vertical: 4), child: Column(
            crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(article.title, style: const TextStyle(fontSize: 20, height: 1.35, fontWeight: FontWeight.w700)),
              const SizedBox(height: 8),
              Text(article.body, maxLines: 3, overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 14, height: 1.65, color: KarsaColors.muted)),
            ])),
        ),
        const Divider(height: 28),
        InkWell(onTap: onOpen, child: Padding(padding: const EdgeInsets.symmetric(vertical: 6),
          child: Wrap(spacing: 18, runSpacing: 8, crossAxisAlignment: WrapCrossAlignment.center, children: [
            Row(mainAxisSize: MainAxisSize.min, children: [
              const Icon(Icons.visibility_outlined, size: 17, color: KarsaColors.muted),
              const SizedBox(width: 6),
              Text(viewPeriodLabel == null ? '${article.views} pembaca' : '${article.periodViews ?? 0} pembaca / $viewPeriodLabel',
                style: const TextStyle(fontSize: 12, color: KarsaColors.muted)),
            ]),
            Row(mainAxisSize: MainAxisSize.min, children: [
              const Icon(Icons.mode_comment_outlined, size: 17, color: KarsaColors.muted),
              const SizedBox(width: 6),
              Text('${article.commentsCount} komentar', style: const TextStyle(fontSize: 12, color: KarsaColors.muted)),
            ]),
          ]),
        )),
      ],
    )),
  );
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
        const Text('Pilih identitas program studi agar feed Karsa Lib menampilkan artikel yang tepat untukmu.', textAlign: TextAlign.center, style: TextStyle(color: Colors.black54, fontSize: 14, height: 1.5)),
        const SizedBox(height: 22),
        TextField(enabled: !_saving, controller: _name, textCapitalization: TextCapitalization.words, maxLength: 80, onChanged: (_) => setState(() {}), decoration: const InputDecoration(labelText: 'Nama yang ditampilkan', prefixIcon: Icon(Icons.person_outline))),
        const SizedBox(height: 12),
        DropdownButtonFormField<String>(initialValue: _facultyId, isExpanded: true, decoration: const InputDecoration(labelText: 'Fakultas'), items: widget.bootstrap.faculties.map((faculty) => DropdownMenuItem(value: faculty.id, child: Text(faculty.name, overflow: TextOverflow.ellipsis))).toList(), onChanged: _saving ? null : (value) => setState(() { _facultyId = value; _programId = null; _classId = null; })),
        const SizedBox(height: 12),
        DropdownButtonFormField<String>(key: ValueKey('program-$_facultyId'), initialValue: _programId, isExpanded: true, decoration: const InputDecoration(labelText: 'Program studi'), items: widget.bootstrap.programs.where((program) => program.facultyId == _facultyId).map((program) => DropdownMenuItem(value: program.id, child: Text(program.name, overflow: TextOverflow.ellipsis))).toList(), onChanged: _saving || _facultyId == null ? null : (value) => setState(() { _programId = value; _classId = null; })),
        if (widget.bootstrap.faculties.isEmpty || (_facultyId != null && widget.bootstrap.programs.where((program) => program.facultyId == _facultyId).isEmpty))
          const Padding(padding: EdgeInsets.only(top: 7), child: Text('Pilihan fakultas/prodi belum tersedia. Admin Karsa perlu mengatur Fakultas dan menghubungkan Prodi terlebih dahulu.', style: TextStyle(fontSize: 13, color: Colors.black54, height: 1.4))),
        const SizedBox(height: 12),
        DropdownButtonFormField<String>(key: ValueKey('class-$_programId'), initialValue: _classId, isExpanded: true, decoration: const InputDecoration(labelText: 'Kelas (opsional)'), items: [const DropdownMenuItem<String>(value: null, child: Text('Tidak memilih kelas')), ...widget.bootstrap.classes.where((item) => item.programId == _programId).map((item) => DropdownMenuItem(value: item.id, child: Text('${item.name}${item.semesterName == null ? '' : ' · ${item.semesterName}'}', overflow: TextOverflow.ellipsis)))], onChanged: _saving || _programId == null ? null : (value) => setState(() => _classId = value)),
        const SizedBox(height: 15),
        Container(padding: const EdgeInsets.all(13), decoration: BoxDecoration(color: const Color(0xFFFFF4E9), borderRadius: BorderRadius.circular(13), border: Border.all(color: const Color(0xFFF1DFCE))), child: const Row(crossAxisAlignment: CrossAxisAlignment.start, children: [Icon(Icons.lock_outline, size: 17, color: Color(0xFF9B4B18)), SizedBox(width: 9), Expanded(child: Text('Fakultas dan program studimu tidak dapat diubah setelah disimpan. Pilihan prodi menentukan artikel yang bisa kamu lihat.', style: TextStyle(fontSize: 11, height: 1.5, color: Color(0xFF735C49))))])),
        const SizedBox(height: 18),
        FilledButton(onPressed: _saving || _facultyId == null || _programId == null || _name.text.trim().length < 2 ? null : _save, child: Padding(padding: const EdgeInsets.symmetric(vertical: 13), child: Text(_saving ? 'Menyimpan…' : 'Simpan profil'))),
      ]);

  Future<void> _save() async {
    if (_saving) return;
    final faculty = widget.bootstrap.faculties.firstWhere((f) => f.id == _facultyId).name;
    final program = widget.bootstrap.programs.firstWhere((p) => p.id == _programId).name;
    final confirmed = await showDialog<bool>(context: context, builder: (context) => AlertDialog(
      title: const Text('Identitasmu sudah benar?'),
      content: Text('${_name.text.trim()}\n$faculty\n$program\n\nFakultas dan prodi tidak dapat diganti setelah disimpan.'),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Periksa kembali')),
        FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Ya, simpan')),
      ],
    ));
    if (!mounted || confirmed != true) return;
    setState(() => _saving = true);
    try {
      await widget.api.createLibProfile(displayName: _name.text.trim(), facultyId: _facultyId!, programId: _programId!, classId: _classId);
      await widget.onSaved();
    } catch (error) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(friendlyError(error))));
    } finally { if (mounted) setState(() => _saving = false); }
  }
}
