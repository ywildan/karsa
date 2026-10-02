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
    widget.api.pointsRevision.addListener(_invalidate);
  }
  @override
  void dispose() {
    widget.api.pointsRevision.removeListener(_invalidate);
    super.dispose();
  }
  void _invalidate() {
    if (mounted) setState(() => _future = widget.api.report());
  }
  Future<void> _reload() async {
    _invalidate();
    try { await _future; } catch (_) { /* Rendered by FutureBuilder. */ }
  }

  @override
  Widget build(BuildContext context) => RefreshIndicator(
    onRefresh: _reload,
    child: FutureBuilder<StudentReport>(
      future: _future,
      builder: (context, snapshot) => CustomScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        slivers: [
          const SliverAppBar(title: Text('Laporan saya')),
          if (snapshot.connectionState != ConnectionState.done)
            const SliverFillRemaining(hasScrollBody: false, child: LoadingState())
          else if (snapshot.hasError)
            SliverFillRemaining(hasScrollBody: false, child: ErrorState(message: friendlyError(snapshot.error!), onRetry: _reload))
          else if (snapshot.data!.isEmpty)
            const SliverFillRemaining(hasScrollBody: false, child: EmptyState(title: 'Belum ada laporan', message: 'Kelas atau semester aktif belum tersedia untuk akunmu.', icon: Icons.assessment_outlined))
          else
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 28),
              sliver: SliverList(delegate: SliverChildListDelegate([
                _SummaryCard(report: snapshot.data!),
                const SizedBox(height: 24),
                const SectionHeading(title: 'Per mata kuliah', subtitle: 'Buka mata kuliah untuk melihat riwayat kontribusimu.'),
                const SizedBox(height: 14),
                for (final course in snapshot.data!.courses) ...[
                  _CourseCard(course: course, total: snapshot.data!.totalPoints),
                  const SizedBox(height: 12),
                ],
                if (snapshot.data!.courses.isEmpty)
                  const InfoNotice(message: 'Belum ada mata kuliah di semester ini.'),
              ])),
            ),
        ],
      ),
    ),
  );
}

class _SummaryCard extends StatelessWidget {
  const _SummaryCard({required this.report});
  final StudentReport report;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(24),
    decoration: BoxDecoration(
      color: KarsaColors.orange, borderRadius: BorderRadius.circular(24),
    ),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const Text('Total poin keaktifan', style: TextStyle(color: Colors.white, fontSize: 14)),
      const SizedBox(height: 6),
      Text('${report.totalPoints}', style: const TextStyle(fontSize: 44, fontWeight: FontWeight.w800, color: Colors.white)),
      const SizedBox(height: 14),
      Text([report.className, report.programName, report.semesterName].whereType<String>().where((v) => v.isNotEmpty).join(' · '),
        style: const TextStyle(color: Colors.white, fontSize: 14, height: 1.5)),
    ]),
  );
}

class _CourseCard extends StatelessWidget {
  const _CourseCard({required this.course, required this.total});
  final ReportCourse course;
  final int total;
  @override
  Widget build(BuildContext context) => Card(
    clipBehavior: Clip.antiAlias,
    child: ExpansionTile(
      shape: const Border(), collapsedShape: const Border(),
      title: Text(course.name, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
      subtitle: Padding(
        padding: const EdgeInsets.only(top: 8, bottom: 4),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(['${course.totalPoints} poin', if (course.code.isNotEmpty) course.code, if (course.pjName != null) 'PJ ${course.pjName}'].join(' · ')),
          if (total > 0) ...[
            const SizedBox(height: 10),
            ClipRRect(borderRadius: BorderRadius.circular(8), child: LinearProgressIndicator(
              value: (course.totalPoints / total).clamp(0.0, 1.0).toDouble(),
              minHeight: 5, backgroundColor: KarsaColors.border,
              semanticsLabel: 'Kontribusi poin ${course.name} terhadap total',
            )),
          ],
        ]),
      ),
      children: course.history.isEmpty
        ? const [Padding(padding: EdgeInsets.all(20), child: Text('Belum ada poin untuk mata kuliah ini.'))]
        : [for (final item in course.history) ListTile(
            leading: StatusBadge(label: '+${item.points}'),
            title: Text(item.category, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
            subtitle: Text([formatDate(item.createdAt), if (item.note?.isNotEmpty == true) item.note!].join('\n')),
          )],
    ),
  );
}
