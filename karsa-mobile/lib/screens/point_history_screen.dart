import 'package:flutter/material.dart';

import '../core/api_client.dart';
import '../core/models.dart';
import '../widgets/common.dart';

class PointHistoryScreen extends StatefulWidget {
  const PointHistoryScreen({required this.api, super.key});
  final ApiClient api;
  @override
  State<PointHistoryScreen> createState() => _PointHistoryScreenState();
}

class _PointHistoryScreenState extends State<PointHistoryScreen> {
  late Future<List<PointHistory>> _future;
  String _query = '';
  String? _course;
  final Set<String> _deleting = {};
  @override
  void initState() {
    super.initState();
    _future = widget.api.pointHistory();
    widget.api.pointsRevision.addListener(_invalidate);
  }
  @override
  void dispose() {
    widget.api.pointsRevision.removeListener(_invalidate);
    super.dispose();
  }
  void _invalidate() {
    if (mounted) setState(() => _future = widget.api.pointHistory());
  }
  Future<void> _reload() async {
    _invalidate();
    try { await _future; } catch (_) { /* Rendered by FutureBuilder. */ }
  }

  Future<void> _delete(PointHistory item) async {
    if (_deleting.contains(item.id)) return;
    final approved = await showDialog<bool>(context: context, builder: (context) => AlertDialog(
      title: const Text('Hapus catatan poin?'),
      content: Text('${item.points} poin milik ${item.studentName} untuk ${item.courseName} akan dihapus. Tindakan ini tercatat di audit log.'),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Batal')),
        FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Hapus')),
      ],
    ));
    if (!mounted || approved != true) return;
    setState(() => _deleting.add(item.id));
    try {
      final message = await widget.api.deletePoint(item.id);
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
    } catch (error) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(friendlyError(error))));
    } finally {
      if (mounted) setState(() => _deleting.remove(item.id));
    }
  }

  @override
  Widget build(BuildContext context) => RefreshIndicator(
    onRefresh: _reload,
    child: FutureBuilder<List<PointHistory>>(
      future: _future,
      builder: (context, snapshot) {
        final all = [...?snapshot.data]..sort((a, b) => b.createdAt.compareTo(a.createdAt));
        final courses = all.map((row) => row.courseName).toSet().toList()..sort();
        final activeCourse = courses.contains(_course) ? _course : null;
        final rows = all.where((row) =>
          (activeCourse == null || row.courseName == activeCourse) &&
          (_query.isEmpty || row.studentName.toLowerCase().contains(_query) ||
           (RegExp(r'^[0-9]+$').hasMatch(_query) && (row.studentNim?.endsWith(_query) ?? false)) ||
           row.categoryName.toLowerCase().contains(_query))).toList();
        return CustomScrollView(physics: const AlwaysScrollableScrollPhysics(), slivers: [
          const SliverAppBar(title: Text('Riwayat poin')),
          SliverToBoxAdapter(child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 12),
            child: Column(children: [
              TextField(onChanged: (v) => setState(() => _query = v.trim().toLowerCase()),
                decoration: const InputDecoration(hintText: 'Nama, akhir NIM, atau kategori', prefixIcon: Icon(Icons.search_rounded))),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                key: ValueKey(activeCourse),
                initialValue: activeCourse, isExpanded: true,
                decoration: const InputDecoration(labelText: 'Mata kuliah'),
                items: [const DropdownMenuItem<String>(value: null, child: Text('Semua mata kuliah')),
                  for (final course in courses) DropdownMenuItem(value: course, child: Text(course, overflow: TextOverflow.ellipsis))],
                onChanged: (v) => setState(() => _course = v),
              ),
            ]),
          )),
          if (snapshot.connectionState != ConnectionState.done)
            const SliverFillRemaining(hasScrollBody: false, child: LoadingState())
          else if (snapshot.hasError)
            SliverFillRemaining(hasScrollBody: false, child: ErrorState(message: friendlyError(snapshot.error!), onRetry: _reload))
          else if (rows.isEmpty)
            SliverFillRemaining(hasScrollBody: false, child: EmptyState(
              title: all.isEmpty ? 'Belum ada riwayat' : 'Tidak ada catatan yang cocok',
              message: all.isEmpty ? 'Poin yang kamu catat akan muncul di sini.' : 'Coba kata kunci atau mata kuliah lain.',
              icon: Icons.history_rounded))
          else SliverPadding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 28),
            sliver: SliverList.builder(itemCount: rows.length, itemBuilder: (context, index) {
              final item = rows[index];
              final newDay = index == 0 || formatDay(rows[index - 1].createdAt) != formatDay(item.createdAt);
              return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                if (newDay) Padding(padding: const EdgeInsets.only(top: 16, bottom: 12),
                  child: Text(formatDay(item.createdAt), style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: KarsaColors.muted))),
                Card(child: Padding(padding: const EdgeInsets.fromLTRB(16, 14, 4, 14), child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    StatusBadge(label: '+${item.points}'),
                    const SizedBox(width: 12),
                    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(item.studentName, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                      if (item.studentNim != null) Text(item.studentNim!, style: const TextStyle(fontSize: 12, color: KarsaColors.muted)),
                      const SizedBox(height: 6),
                      Text('${item.categoryName} · ${item.courseName}', style: const TextStyle(fontSize: 14)),
                      const SizedBox(height: 4),
                      Text('${item.className} · ${formatTime(item.createdAt)}', style: const TextStyle(fontSize: 12, color: KarsaColors.muted)),
                      if (item.note?.isNotEmpty == true) Padding(padding: const EdgeInsets.only(top: 8), child: Text(item.note!)),
                    ])),
                    if (_deleting.contains(item.id))
                      const Padding(padding: EdgeInsets.all(12), child: SizedBox.square(dimension: 20, child: CircularProgressIndicator(strokeWidth: 2)))
                    else PopupMenuButton<String>(tooltip: 'Opsi catatan', onSelected: (_) => _delete(item),
                      itemBuilder: (_) => [const PopupMenuItem(value: 'delete', child: Text('Hapus catatan'))]),
                  ],
                ))),
                const SizedBox(height: 8),
              ]);
            }),
          ),
        ]);
      },
    ),
  );
}
