import 'package:flutter/material.dart';

import '../core/api_client.dart';
import '../core/models.dart';
import '../widgets/common.dart';
import 'group_chat_screen.dart';

class GroupListScreen extends StatefulWidget {
  const GroupListScreen({required this.api, super.key});
  final ApiClient api;

  @override
  State<GroupListScreen> createState() => _GroupListScreenState();
}

class _GroupListScreenState extends State<GroupListScreen> {
  late Future<List<GroupSummary>> _future;

  @override
  void initState() {
    super.initState();
    _future = widget.api.groups();
  }

  Future<void> _reload() async {
    setState(() => _future = widget.api.groups());
    await _future;
  }

  Future<void> _open(GroupSummary group) async {
    await Navigator.of(context).push<void>(
      MaterialPageRoute(
        builder: (_) => GroupChatScreen(api: widget.api, group: group),
      ),
    );
    if (mounted) {
      await _reload();
    }
  }

  @override
  Widget build(BuildContext context) => CustomScrollView(
        slivers: [
          const SliverAppBar(
            title: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Grup kelas'),
                Text(
                  'Diskusi per mata kuliah',
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.w400),
                ),
              ],
            ),
          ),
          SliverFillRemaining(
            hasScrollBody: true,
            child: FutureBuilder<List<GroupSummary>>(
              future: _future,
              builder: (context, snapshot) {
                if (snapshot.connectionState != ConnectionState.done) {
                  return const Center(child: CircularProgressIndicator());
                }
                if (snapshot.hasError) {
                  return ErrorState(
                    message: friendlyError(snapshot.error!),
                    onRetry: _reload,
                  );
                }
                final groups = snapshot.data!;
                if (groups.isEmpty) {
                  return const EmptyState(
                    title: 'Belum ada grup',
                    message:
                        'Grup otomatis tersedia setelah mata kuliah ditambahkan ke kelasmu.',
                    icon: Icons.forum_outlined,
                  );
                }
                return RefreshIndicator(
                  onRefresh: _reload,
                  child: ListView.separated(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                    itemCount: groups.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 10),
                    itemBuilder: (context, index) {
                      final group = groups[index];
                      return _GroupCard(group: group, onTap: () => _open(group));
                    },
                  ),
                );
              },
            ),
          ),
        ],
      );
}

class _GroupCard extends StatelessWidget {
  const _GroupCard({required this.group, required this.onTap});
  final GroupSummary group;
  final VoidCallback onTap;

  String get _preview {
    final message = group.lastMessage;
    if (message == null) return 'Belum ada percakapan.';
    return switch (message.state) {
      'deleted' => 'Pesan telah dihapus',
      'hidden' => 'Pesan disembunyikan oleh PJ',
      'blocked' => 'Pesan dari pengguna yang diblokir',
      _ => '${message.authorName}: ${message.text ?? ''}',
    };
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              CircleAvatar(
                radius: 24,
                backgroundColor: colors.primaryContainer,
                foregroundColor: colors.onPrimaryContainer,
                child: const Icon(Icons.forum_rounded),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            group.courseName,
                            style: const TextStyle(fontWeight: FontWeight.w800),
                          ),
                        ),
                        if (group.isLocked)
                          const Padding(
                            padding: EdgeInsets.only(left: 8),
                            child: Icon(Icons.lock_rounded, size: 16),
                          ),
                      ],
                    ),
                    const SizedBox(height: 3),
                    Text(
                      '${group.className} · PJ ${group.manager.name} · ${group.memberCount} anggota',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      _preview,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(color: colors.onSurfaceVariant),
                    ),
                    if (group.isManager) ...[
                      const SizedBox(height: 8),
                      Align(
                        alignment: Alignment.centerLeft,
                        child: Chip(
                          visualDensity: VisualDensity.compact,
                          avatar: const Icon(Icons.admin_panel_settings_outlined, size: 16),
                          label: const Text('Kamu PJ grup ini'),
                        ),
                      ),
                    ],
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
