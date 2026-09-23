import 'package:flutter/material.dart';

import '../core/api_client.dart';
import '../core/models.dart';
import '../widgets/common.dart';

class ReportScreen extends StatefulWidget {
  const ReportScreen({required this.api, super.key});
  final ApiClient api;

  @override
  State<ReportScreen> createState() => _ReportScreenState();
}

class _ReportScreenState extends State<ReportScreen> {
  late Future<StudentReport> _future;

  @override
  void initState() {
    super.initState();
    _future = widget.api.report();
  }

  Future<void> _reload() async {
    setState(() => _future = widget.api.report());
    await _future;
  }

  @override
  Widget build(BuildContext context) => CustomScrollView(
        slivers: [
          const SliverAppBar(title: Text('Laporan saya')),
          SliverFillRemaining(
            hasScrollBody: true,
            child: FutureBuilder<StudentReport>(
              future: _future,
              builder: (context, snapshot) {
                if (snapshot.connectionState != ConnectionState.done) {
                  return const Center(child: CircularProgressIndicator());
                }
                if (snapshot.hasError) {
                  return ErrorState(message: friendlyError(snapshot.error!), onRetry: _reload);
                }
                final report = snapshot.data!;
                if (report.isEmpty) {
                  return const EmptyState(
                    title: 'Belum ada laporan',
                    message: 'Kelas atau semester aktif belum tersedia untuk akunmu.',
                    icon: Icons.assessment_outlined,
                  );
                }
                return RefreshIndicator(
                  onRefresh: _reload,
                  child: ListView(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                    children: [
                      _SummaryCard(report: report),
                      const SizedBox(height: 22),
                      Text('Per mata kuliah', style: Theme.of(context).textTheme.titleLarge),
                      const SizedBox(height: 12),
                      for (final course in report.courses) ...[
                        _CourseCard(course: course),
                        const SizedBox(height: 12),
                      ],
                    ],
                  ),
                );
              },
            ),
          ),
        ],
      );
}

class _SummaryCard extends StatelessWidget {
  const _SummaryCard({required this.report});
  final StudentReport report;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(22),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [
              Theme.of(context).colorScheme.primary,
              Theme.of(context).colorScheme.tertiary,
            ],
          ),
          borderRadius: BorderRadius.circular(24),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('TOTAL POIN', style: TextStyle(color: Colors.white70, letterSpacing: 1.2)),
            const SizedBox(height: 4),
            Text(
              '${report.totalPoints}',
              style: Theme.of(context).textTheme.displaySmall?.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.w800,
                  ),
            ),
            const SizedBox(height: 14),
            Text(
              [report.className, report.programName, report.semesterName]
                  .whereType<String>()
                  .join(' · '),
              style: const TextStyle(color: Colors.white),
            ),
          ],
        ),
      );
}

class _CourseCard extends StatelessWidget {
  const _CourseCard({required this.course});
  final ReportCourse course;

  @override
  Widget build(BuildContext context) => Card(
        child: ExpansionTile(
          shape: const Border(),
          title: Text(course.name, style: const TextStyle(fontWeight: FontWeight.w700)),
          subtitle: Text([
            if (course.code.isNotEmpty) course.code,
            if (course.pjName != null) 'PJ ${course.pjName}',
          ].join(' · ')),
          trailing: Chip(label: Text('${course.totalPoints} poin')),
          children: course.history.isEmpty
              ? const [Padding(padding: EdgeInsets.all(20), child: Text('Belum ada poin.'))]
              : course.history
                  .map(
                    (item) => ListTile(
                      leading: CircleAvatar(child: Text('${item.points}')),
                      title: Text(item.category),
                      subtitle: Text([
                        formatDate(item.createdAt),
                        if (item.note?.isNotEmpty == true) item.note!,
                      ].join('\n')),
                    ),
                  )
                  .toList(),
        ),
      );
}
