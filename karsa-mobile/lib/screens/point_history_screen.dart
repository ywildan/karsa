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

  @override
  void initState() {
    super.initState();
    _future = widget.api.pointHistory();
  }

  Future<void> _reload() async {
    setState(() => _future = widget.api.pointHistory());
    await _future;
  }

  Future<void> _delete(PointHistory item) async {
    final approved = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Hapus catatan poin?'),
        content: Text('${item.points} poin milik ${item.studentName} akan dihapus. Tindakan ini tercatat di audit log.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Batal')),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Hapus')),
        ],
      ),
    );
    if (approved != true) return;
    try {
      final message = await widget.api.deletePoint(item.id);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
      await _reload();
    } catch (error) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(friendlyError(error))));
    }
  }

  @override
  Widget build(BuildContext context) => CustomScrollView(
        slivers: [
          const SliverAppBar(title: Text('Riwayat poin')),
          SliverFillRemaining(
            hasScrollBody: true,
            child: FutureBuilder<List<PointHistory>>(
              future: _future,
              builder: (context, snapshot) {
                if (snapshot.connectionState != ConnectionState.done) {
                  return const Center(child: CircularProgressIndicator());
                }
                if (snapshot.hasError) {
                  return ErrorState(message: friendlyError(snapshot.error!), onRetry: _reload);
                }
                final rows = snapshot.data!;
                if (rows.isEmpty) {
                  return const EmptyState(
                    title: 'Belum ada riwayat',
                    message: 'Poin yang kamu catat akan muncul di sini.',
                    icon: Icons.history,
                  );
                }
                return RefreshIndicator(
                  onRefresh: _reload,
                  child: ListView.separated(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                    itemCount: rows.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 10),
                    itemBuilder: (context, index) {
                      final item = rows[index];
                      return Card(
                        child: ListTile(
                          contentPadding: const EdgeInsets.fromLTRB(16, 10, 8, 10),
                          leading: CircleAvatar(child: Text('${item.points}')),
                          title: Text(item.studentName, style: const TextStyle(fontWeight: FontWeight.w700)),
                          subtitle: Text([
                            '${item.categoryName} · ${item.courseName}',
                            '${item.className} · ${formatDate(item.createdAt)}',
                            if (item.note?.isNotEmpty == true) item.note!,
                          ].join('\n')),
                          trailing: IconButton(
                            tooltip: 'Hapus',
                            onPressed: () => _delete(item),
                            icon: const Icon(Icons.delete_outline_rounded),
                          ),
                        ),
                      );
                    },
                  ),
                );
              },
            ),
          ),
        ],
      );
}
