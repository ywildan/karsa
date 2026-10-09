import 'package:flutter/material.dart';

import '../core/api_client.dart';
import '../widgets/common.dart';
import 'leaderboard_screen.dart';
import 'point_history_screen.dart';
import 'report_screen.dart';

/// Hub fitur sekunder PJ agar navbar tetap ringkas.
class ActivityScreen extends StatelessWidget {
  const ActivityScreen({
    required this.api, this.onRecordPoints,
    this.showReport = true, this.showLeaderboard = true, super.key,
  });
  final ApiClient api;
  final VoidCallback? onRecordPoints;
  final bool showReport;
  final bool showLeaderboard;

  void _open(BuildContext context, Widget screen) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => _ActivityRouteShell(child: screen),
      ),
    );
  }

  @override
  Widget build(BuildContext context) => CustomScrollView(
        slivers: [
          const SliverAppBar(
            pinned: true,
            title: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Aktivitas'),
                Text(
                  'Pantau pencatatan dan keaktifan kelas',
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.w400),
                ),
              ],
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
            sliver: SliverList(
              delegate: SliverChildListDelegate([
                const SectionHeading(title: 'Ruang PJ', subtitle: 'Catat kontribusi, lalu pantau perkembangan kelas.'),
                const SizedBox(height: 18),
                if (onRecordPoints != null) ...[
                  FilledButton.icon(onPressed: onRecordPoints,
                    icon: const Icon(Icons.add_rounded), label: const Text('Input poin mahasiswa')),
                  const SizedBox(height: 20),
                ],
                _ActivityCard(
                  icon: Icons.history_rounded,
                  title: 'Riwayat Poin',
                  description: 'Lihat dan kelola poin yang sudah kamu catat.',
                  onTap: () => _open(context, PointHistoryScreen(api: api)),
                ),
                const SizedBox(height: 12),
                if (showReport) _ActivityCard(
                  icon: Icons.assessment_rounded,
                  title: 'Laporan Saya',
                  description: 'Ringkasan poin dan perkembangan keaktifan kelas.',
                  onTap: () => _open(context, ReportScreen(api: api)),
                ),
                const SizedBox(height: 12),
                if (showLeaderboard) _ActivityCard(
                  icon: Icons.emoji_events_rounded,
                  title: 'Peringkat Kelas',
                  description: 'Lihat peringkat keaktifan mahasiswa per mata kuliah.',
                  onTap: () => _open(context, LeaderboardScreen(api: api)),
                ),
              ]),
            ),
          ),
        ],
      );
}

/// Menjadikan screen Aktivitas sebagai route mandiri.
///
/// Screen laporan, peringkat, dan riwayat juga dipakai sebagai body di
/// HomeShell. Saat dibuka dari ActivityScreen, mereka membutuhkan parent
/// Scaffold agar background, safe area, dan surface Material tetap konsisten.
class _ActivityRouteShell extends StatelessWidget {
  const _ActivityRouteShell({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        body: SafeArea(
          bottom: false,
          child: child,
        ),
      );
}

class _ActivityCard extends StatelessWidget {
  const _ActivityCard({required this.icon, required this.title, required this.description, required this.onTap});

  final IconData icon;
  final String title;
  final String description;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Row(
            children: [
              CircleAvatar(
                backgroundColor: colors.primaryContainer,
                foregroundColor: colors.onPrimaryContainer,
                child: Icon(icon),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: const TextStyle(fontWeight: FontWeight.w800)),
                    const SizedBox(height: 4),
                    Text(description, style: TextStyle(color: colors.onSurfaceVariant)),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right_rounded),
            ],
          ),
        ),
      ),
    );
  }
}
