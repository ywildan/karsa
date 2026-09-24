import 'package:flutter/material.dart';

import '../core/api_client.dart';
import '../core/models.dart';
import '../widgets/common.dart';

class GroupReportsScreen extends StatefulWidget {
  const GroupReportsScreen({
    required this.api,
    required this.assignmentId,
    super.key,
  });
  final ApiClient api;
  final String assignmentId;

  @override
  State<GroupReportsScreen> createState() => _GroupReportsScreenState();
}

class _GroupReportsScreenState extends State<GroupReportsScreen> {
  late Future<List<GroupReportItem>> _future;

  @override
  void initState() {
    super.initState();
    _future = widget.api.groupReports(widget.assignmentId);
  }

  Future<void> _reload() async {
    setState(() => _future = widget.api.groupReports(widget.assignmentId));
    await _future;
  }

  Future<void> _resolve(GroupReportItem report, String action) async {
    try {
      await widget.api.resolveGroupReport(widget.assignmentId, report.id, action);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(action == 'HIDE'
              ? 'Pesan disembunyikan.'
              : 'Laporan ditutup.'),
        ),
      );
      await _reload();
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(friendlyError(error))),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Laporan grup')),
        body: FutureBuilder<List<GroupReportItem>>(
          future: _future,
          builder: (context, snapshot) {
            if (snapshot.connectionState != ConnectionState.done) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snapshot.hasError) {
              return ErrorState(message: friendlyError(snapshot.error!), onRetry: _reload);
            }
            final reports = snapshot.data!;
            if (reports.isEmpty) {
              return const EmptyState(
                title: 'Tidak ada laporan terbuka',
                message: 'Laporan anggota yang dapat kamu tangani akan muncul di sini.',
                icon: Icons.verified_outlined,
              );
            }
            return RefreshIndicator(
              onRefresh: _reload,
              child: ListView.separated(
                padding: const EdgeInsets.all(16),
                itemCount: reports.length,
                separatorBuilder: (_, _) => const SizedBox(height: 10),
                itemBuilder: (context, index) {
                  final report = reports[index];
                  return Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '${report.reason} · ${report.authorName}',
                            style: const TextStyle(fontWeight: FontWeight.w800),
                          ),
                          const SizedBox(height: 6),
                          Text(report.messageText ?? 'Pesan tidak lagi tersedia.'),
                          if (report.details?.isNotEmpty == true) ...[
                            const SizedBox(height: 8),
                            Text('Catatan: ${report.details}'),
                          ],
                          const SizedBox(height: 8),
                          Text(
                            'Dilaporkan ${report.reporterName} · ${formatDate(report.createdAt)}',
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                          const SizedBox(height: 12),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.end,
                            children: [
                              TextButton(
                                onPressed: () => _resolve(report, 'DISMISS'),
                                child: const Text('Tutup laporan'),
                              ),
                              const SizedBox(width: 8),
                              FilledButton.tonalIcon(
                                onPressed: () => _resolve(report, 'HIDE'),
                                icon: const Icon(Icons.visibility_off_outlined),
                                label: const Text('Sembunyikan'),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            );
          },
        ),
      );
}
