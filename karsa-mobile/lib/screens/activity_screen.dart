import 'package:flutter/material.dart';

import '../core/api_client.dart';
import 'leaderboard_screen.dart';
import 'point_history_screen.dart';
import 'report_screen.dart';

/// Hub fitur sekunder PJ agar navbar tetap ringkas.
class ActivityScreen extends StatelessWidget {
  const ActivityScreen({required this.api, super.key});
  final ApiClient api;

  void _open(BuildContext context, Widget screen) {
    Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => screen));
  }

  @override
  Widget build(BuildContext context) => CustomScrollView(
        slivers: [
          const SliverAppBar(
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
                _ActivityCard(
                  icon: Icons.history_rounded,
                  title: 'Riwayat Poin',
                  description: 'Lihat dan kelola poin yang sudah kamu catat.',
                  onTap: () => _open(context, PointHistoryScreen(api: api)),
                ),
                const SizedBox(height: 12),
                _ActivityCard(
                  icon: Icons.assessment_rounded,
                  title: 'Laporan Saya',
                  description: 'Ringkasan poin dan perkembangan keaktifan kelas.',
                  onTap: () => _open(context, ReportScreen(api: api)),
                ),
                const SizedBox(height: 12),
                _ActivityCard(
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
