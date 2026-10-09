import 'dart:async';

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
  LibBootstrap? _bootstrap;
  List<LibArticle>? _articles;
  Object? _bootstrapError;
  Object? _feedError;
  bool _loadingBootstrap = true;
  bool _loadingFeed = false;
  int _feedVersion = 0;
  final TextEditingController _searchController = TextEditingController();
  Timer? _searchDebounce;
  String _sort = 'latest';
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _loadBootstrap();
  }

  @override
  void dispose() {
    _searchDebounce?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadBootstrap() async {
    setState(() => _bootstrapError = null);
    try {
      final bootstrap = await widget.api.libBootstrap();
      if (!mounted) return;
      setState(() {
        _bootstrap = bootstrap;
        _loadingBootstrap = false;
      });
      await _loadFeed();
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _bootstrapError = error;
        _loadingBootstrap = false;
      });
    }
  }

  /// Muat feed tanpa membuang daftar lama: posisi scroll dan konten tetap
  /// tampil selama permintaan berjalan.
  Future<void> _loadFeed() async {
    final version = ++_feedVersion;
    setState(() => _loadingFeed = true);
    try {
      final articles = await widget.api.libFeed(
        sort: _sort,
        query: _searchQuery,
      );
      if (!mounted || version != _feedVersion) return;
      setState(() {
        _articles = articles;
        _feedError = null;
        _loadingFeed = false;
      });
    } catch (error) {
      if (!mounted || version != _feedVersion) return;
      setState(() {
        _feedError = error;
        _loadingFeed = false;
      });
    }
  }

  void _selectSort(String sort) {
    if (_sort == sort) return;
    setState(() => _sort = sort);
    _loadFeed();
  }

  void _applySearch(String value) {
    final query = value.trim();
    if (query == _searchQuery) return;
    setState(() => _searchQuery = query);
    _loadFeed();
  }

  void _onSearchChanged(String value) {
    _searchDebounce?.cancel();
    _searchDebounce = Timer(const Duration(milliseconds: 350), () {
      if (mounted) _applySearch(value);
    });
  }

  Future<void> _refresh() => _loadBootstrap();

  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: KarsaColors.background,
        appBar: AppBar(
          titleSpacing: KarsaSpace.lg,
          title: Row(
            children: [
              Container(
                width: 34,
                height: 34,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.primary,
                  borderRadius: BorderRadius.circular(KarsaRadius.md),
                ),
                child: const Text('K', style: TextStyle(color: KarsaColors.onOrange, fontSize: 18, fontWeight: FontWeight.w800)),
              ),
              const SizedBox(width: 10),
              const Text('Karsa ', style: TextStyle(fontWeight: FontWeight.w700)),
              Text('Lib', style: TextStyle(color: Theme.of(context).colorScheme.primary, fontWeight: FontWeight.w700)),
            ],
          ),
          actions: [_authorMenu()],
        ),
        floatingActionButton: _composeFab(),
        body: _body(),
      );

  Widget _authorMenu() {
    final bootstrap = _bootstrap;
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
  }

  Widget? _composeFab() {
    final bootstrap = _bootstrap;
    if (bootstrap == null || !bootstrap.canWrite || bootstrap.profile == null) {
      return null;
    }
    return FloatingActionButton.extended(
      onPressed: () => _compose(context),
      icon: const Icon(Icons.edit_rounded),
      label: const Text('Tulis'),
    );
  }

  Widget _body() {
    if (_loadingBootstrap) {
      return const LoadingState(message: 'Memuat Karsa Lib…');
    }
    if (_bootstrapError != null) {
      return ErrorState(message: friendlyError(_bootstrapError!), onRetry: _refresh);
    }
    final bootstrap = _bootstrap;
    if (bootstrap == null) return const SizedBox.shrink();
    if (bootstrap.profile == null) return _setup(bootstrap);
    return _feedView(bootstrap);
  }

  /// Tinggi tetap header kontrol: dasar terukur + pertumbuhan dari skala teks,
  /// ditambah ruang garis progres saat feed dimuat ulang.
  double _controlsHeight(BuildContext context) {
    final growth =
        (MediaQuery.textScalerOf(context).scale(KarsaType.body) - KarsaType.body)
            .clamp(0, 40)
            .toDouble();
    return 138 + growth + (_loadingFeed ? 4 : 0);
  }

  Widget _feedView(LibBootstrap bootstrap) {
    final articles = _articles;
    final showInitialLoading = _loadingFeed && articles == null;
    final showInitialError = _feedError != null && articles == null;
    return RefreshIndicator(
        onRefresh: _refresh,
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            SliverToBoxAdapter(child: _welcome(bootstrap)),
            if (!bootstrap.canWrite)
              SliverToBoxAdapter(child: _writerAccessCard(bootstrap)),
            SliverPersistentHeader(pinned: true, delegate: _FeedControls(
              height: _controlsHeight(context),
              child: Column(children: [
                _SearchField(
                  controller: _searchController,
                  onChanged: _onSearchChanged,
                  onSubmitted: (value) {
                    _searchDebounce?.cancel();
                    _applySearch(value);
                  },
                  onCleared: () => _applySearch(''),
                ),
                _feedHeader(bootstrap),
                if (_loadingFeed)
                  const LinearProgressIndicator(minHeight: 3, backgroundColor: KarsaColors.tintSoft),
              ]),
            )),
            if (showInitialLoading)
              const SliverFillRemaining(
                hasScrollBody: false,
                child: LoadingState(message: 'Memuat tulisan dari prodimu…'),
              )
            else if (showInitialError)
              SliverFillRemaining(
                hasScrollBody: false,
                child: ErrorState(message: friendlyError(_feedError!), onRetry: _loadFeed),
              )
            else if (articles != null && articles.isEmpty)
              SliverFillRemaining(
                hasScrollBody: false,
                child: EmptyState(
                  title: _searchQuery.isEmpty ? 'Belum ada artikel' : 'Artikel tidak ditemukan',
                  message: _searchQuery.isEmpty
                      ? 'Saat ada tulisan baru dari prodimu, artikel itu akan muncul di sini.'
                      : 'Tidak ada judul yang cocok di program studimu. Coba kata kunci lain.',
                  icon: Icons.auto_stories_outlined,
                ),
              )
            else
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(
                  KarsaSpace.gutter, KarsaSpace.xs, KarsaSpace.gutter, KarsaSpace.scrollBottom,
                ),
                sliver: SliverList.separated(
                  itemCount: articles?.length ?? 0,
                  separatorBuilder: (_, _) => const SizedBox(height: KarsaSpace.md),
                  itemBuilder: (context, index) {
                    final article = articles![index];
                    return _ArticleCard(
                      article: article,
                      viewPeriodLabel: _sort == 'trending_7d' ? '7 hari' : _sort == 'trending_30d' ? '30 hari' : null,
                      onOpen: () => _openArticle(article),
                      onAuthor: () => _openAuthor(article),
                      onReport: () => _reportArticle(article),
                    );
                  },
                ),
              ),
          ],
        ),
      );
  }

  Widget _welcome(LibBootstrap bootstrap) {
    final names = bootstrap.programs.where((p) => p.id == bootstrap.profile!.programId);
    final program = names.isEmpty ? 'Program studimu' : names.first.name;
    return Padding(padding: const EdgeInsets.fromLTRB(KarsaSpace.gutter, 14, KarsaSpace.gutter, KarsaSpace.md),
      child: SectionHeading(title: program, subtitle: 'Tulisan dan pengalaman dari teman satu prodi.'),
    );
  }

  Widget _writerAccessCard(LibBootstrap bootstrap) {
    final request = bootstrap.latestRequest;
    final status = request?['status'];
    if (status == null) {
      return Padding(padding: const EdgeInsets.fromLTRB(KarsaSpace.gutter, 0, KarsaSpace.gutter, KarsaSpace.md),
        child: Card(child: ListTile(
          leading: const Icon(Icons.edit_note_rounded, color: KarsaColors.orange),
          title: const Text('Ingin berbagi tulisan?'),
          subtitle: const Text('Ajukan akses penulis Karsa Lib.'),
          trailing: const Icon(Icons.chevron_right_rounded),
          onTap: _authorRequest,
        )));
    }
    return Padding(padding: const EdgeInsets.fromLTRB(KarsaSpace.gutter, 0, KarsaSpace.gutter, KarsaSpace.md),
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
    padding: const EdgeInsets.symmetric(horizontal: KarsaSpace.gutter),
    child: SingleChildScrollView(scrollDirection: Axis.horizontal,
      child: Row(children: [
        _sortChip('Terbaru', 'latest'),
        _sortChip('Trending 7 hari', 'trending_7d'),
        _sortChip('Trending 30 hari', 'trending_30d'),
      ]),
    ),
  );

  Widget _sortChip(String label, String value) => Padding(
        padding: const EdgeInsets.only(right: KarsaSpace.sm),
        child: ChoiceChip(
          label: Text(label),
          selected: _sort == value,
          onSelected: (_) => _selectSort(value),
          labelStyle: const TextStyle(fontSize: KarsaType.caption, fontWeight: FontWeight.w600),
          visualDensity: VisualDensity.compact,
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
    showKarsaSnack(context, text);
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

  // Permukaan solid dengan garis tetap, bukan blur: BackdropFilter pada header
  // yang menempel ikut digambar ulang setiap frame scroll dan menjatuhkan
  // framerate. Garis tetap juga membuat header tidak perlu dibangun ulang
  // saat scroll, karena tidak bergantung pada posisi konten.
  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) => Container(
    decoration: const BoxDecoration(
      color: KarsaColors.background,
      border: Border(bottom: BorderSide(color: KarsaColors.border)),
    ),
    padding: const EdgeInsets.only(top: KarsaSpace.sm),
    child: child,
  );

  @override
  bool shouldRebuild(covariant _FeedControls oldDelegate) =>
      oldDelegate.height != height || oldDelegate.child != child;
}

/// Kolom pencarian berdiri sendiri agar ketikan hanya membangun ulang
/// subtree ini, bukan seluruh feed.
class _SearchField extends StatefulWidget {
  const _SearchField({
    required this.controller,
    required this.onChanged,
    required this.onSubmitted,
    required this.onCleared,
  });
  final TextEditingController controller;
  final ValueChanged<String> onChanged;
  final ValueChanged<String> onSubmitted;
  final VoidCallback onCleared;

  @override
  State<_SearchField> createState() => _SearchFieldState();
}

class _SearchFieldState extends State<_SearchField> {
  @override
  void initState() {
    super.initState();
    widget.controller.addListener(_onTextChanged);
  }

  @override
  void dispose() {
    widget.controller.removeListener(_onTextChanged);
    super.dispose();
  }

  void _onTextChanged() => setState(() {});

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.fromLTRB(
          KarsaSpace.gutter, KarsaSpace.xs, KarsaSpace.gutter, KarsaSpace.md,
        ),
        child: TextField(
          controller: widget.controller,
          maxLength: 100,
          onChanged: widget.onChanged,
          onSubmitted: widget.onSubmitted,
          textInputAction: TextInputAction.search,
          decoration: InputDecoration(
            hintText: 'Cari judul artikel di prodimu',
            prefixIcon: const Icon(Icons.search_rounded),
            counterText: '',
            suffixIcon: widget.controller.text.isEmpty
                ? null
                : IconButton(
                    tooltip: 'Hapus pencarian',
                    onPressed: () {
                      widget.controller.clear();
                      widget.onCleared();
                    },
                    icon: const Icon(Icons.close_rounded),
                  ),
          ),
        ),
      );
}

class _ArticleCard extends StatelessWidget {
  const _ArticleCard({required this.article, required this.onOpen, required this.onAuthor, required this.onReport, this.viewPeriodLabel});
  final LibArticle article;
  final VoidCallback onOpen;
  final VoidCallback onAuthor;
  final VoidCallback onReport;
  final String? viewPeriodLabel;
  @override
  Widget build(BuildContext context) => InkWell(
    onTap: onOpen,
    borderRadius: BorderRadius.circular(20),
    child: Card(
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
    ),
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
        const Text('Pilih identitas program studi agar feed Karsa Lib menampilkan artikel yang tepat untukmu.', textAlign: TextAlign.center, style: TextStyle(color: KarsaColors.muted, fontSize: KarsaType.body, height: 1.5)),
        const SizedBox(height: 22),
        TextField(enabled: !_saving, controller: _name, textCapitalization: TextCapitalization.words, maxLength: 80, onChanged: (_) => setState(() {}), decoration: const InputDecoration(labelText: 'Nama yang ditampilkan', prefixIcon: Icon(Icons.person_outline))),
        const SizedBox(height: 12),
        DropdownButtonFormField<String>(initialValue: _facultyId, isExpanded: true, decoration: const InputDecoration(labelText: 'Fakultas'), items: widget.bootstrap.faculties.map((faculty) => DropdownMenuItem(value: faculty.id, child: Text(faculty.name, overflow: TextOverflow.ellipsis))).toList(), onChanged: _saving ? null : (value) { // DropdownButton tetap memanggil onChanged walau item yang sama diketuk; tanpa guard, prodi dan kelas ke-reset sendiri.
        if (value == _facultyId) return;
        setState(() { _facultyId = value; _programId = null; _classId = null; });
      }),
        const SizedBox(height: 12),
        DropdownButtonFormField<String>(key: ValueKey('program-$_facultyId'), initialValue: _programId, isExpanded: true, decoration: const InputDecoration(labelText: 'Program studi'), items: widget.bootstrap.programs.where((program) => program.facultyId == _facultyId).map((program) => DropdownMenuItem(value: program.id, child: Text(program.name, overflow: TextOverflow.ellipsis))).toList(), onChanged: _saving || _facultyId == null ? null : (value) {
        // Mengetuk prodi yang sama tidak boleh menghapus kelas pilihan.
        if (value == _programId) return;
        setState(() { _programId = value; _classId = null; });
      }),
        if (widget.bootstrap.faculties.isEmpty || (_facultyId != null && widget.bootstrap.programs.where((program) => program.facultyId == _facultyId).isEmpty))
          const Padding(padding: EdgeInsets.only(top: 7), child: Text('Pilihan fakultas/prodi belum tersedia. Admin Karsa perlu mengatur Fakultas dan menghubungkan Prodi terlebih dahulu.', style: TextStyle(fontSize: KarsaType.body, color: KarsaColors.muted, height: 1.4))),
        const SizedBox(height: 12),
        DropdownButtonFormField<String>(key: ValueKey('class-$_programId'), initialValue: _classId, isExpanded: true, decoration: const InputDecoration(labelText: 'Kelas (opsional)'), items: [const DropdownMenuItem<String>(value: null, child: Text('Tidak memilih kelas')), ...widget.bootstrap.classes.where((item) => item.programId == _programId).map((item) => DropdownMenuItem(value: item.id, child: Text('${item.name}${item.semesterName == null ? '' : ' · ${item.semesterName}'}', overflow: TextOverflow.ellipsis)))], onChanged: _saving || _programId == null ? null : (value) => setState(() => _classId = value)),
        const SizedBox(height: 15),
        const InfoNotice(
          icon: Icons.lock_outline_rounded,
          message: 'Fakultas dan program studimu tidak dapat diubah setelah disimpan. Pilihan prodi menentukan artikel yang bisa kamu lihat.',
        ),
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
