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
  String _query = '';
  @override
  void initState() { super.initState(); _future = widget.api.groups(); }
  Future<void> _reload() async {
    setState(() => _future = widget.api.groups());
    try { await _future; } catch (_) { /* Rendered by FutureBuilder. */ }
  }
  Future<void> _open(GroupSummary group) async {
    await Navigator.of(context).push<void>(MaterialPageRoute(
      builder: (_) => GroupChatScreen(api: widget.api, group: group)));
    if (mounted) await _reload();
  }
  @override
  Widget build(BuildContext context) => RefreshIndicator(
    onRefresh: _reload,
    child: FutureBuilder<List<GroupSummary>>(future: _future, builder: (context, snapshot) {
      final groups = snapshot.data?.where((group) =>
        _query.isEmpty || group.courseName.toLowerCase().contains(_query) ||
        group.className.toLowerCase().contains(_query)).toList() ?? [];
      return CustomScrollView(physics: const AlwaysScrollableScrollPhysics(), slivers: [
        const SliverAppBar(pinned: true, title: Text('Grup kelas')),
        SliverToBoxAdapter(child: Padding(padding: const EdgeInsets.fromLTRB(20, 12, 20, 14),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const SectionHeading(title: 'Diskusi mata kuliah', subtitle: 'Percakapan untuk kelas yang kamu ikuti.'),
            const SizedBox(height: 18),
            TextField(onChanged: (v) => setState(() => _query = v.trim().toLowerCase()),
              decoration: const InputDecoration(hintText: 'Cari mata kuliah atau kelas', prefixIcon: Icon(Icons.search_rounded))),
          ]),
        )),
        if (snapshot.connectionState != ConnectionState.done)
          const SliverFillRemaining(hasScrollBody: false, child: LoadingState())
        else if (snapshot.hasError)
          SliverFillRemaining(hasScrollBody: false, child: ErrorState(message: friendlyError(snapshot.error!), onRetry: _reload))
        else if (groups.isEmpty)
          SliverFillRemaining(hasScrollBody: false, child: EmptyState(
            title: snapshot.data!.isEmpty ? 'Belum ada grup' : 'Grup tidak ditemukan',
            message: snapshot.data!.isEmpty ? 'Grup tersedia setelah mata kuliah ditambahkan ke kelasmu.' : 'Coba kata kunci lain.',
            icon: Icons.forum_outlined))
        else SliverPadding(padding: const EdgeInsets.fromLTRB(20, 0, 20, 28),
          sliver: SliverList.separated(
            itemCount: groups.length, separatorBuilder: (_, _) => const SizedBox(height: 10),
            itemBuilder: (_, index) => _GroupCard(group: groups[index], onTap: () => _open(groups[index])),
          )),
      ]);
    }),
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
  Widget build(BuildContext context) => Card(
    clipBehavior: Clip.antiAlias,
    child: InkWell(onTap: onTap, child: Padding(padding: const EdgeInsets.all(16),
      child: Row(children: [
        CircleAvatar(radius: 24, backgroundColor: Theme.of(context).colorScheme.primaryContainer,
          child: const Icon(Icons.forum_rounded)),
        const SizedBox(width: 14),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Expanded(child: Text(group.courseName, maxLines: 1, overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700))),
            if (group.isLocked) const Icon(Icons.lock_rounded, size: 16),
          ]),
          const SizedBox(height: 3),
          Text('${group.className} · ${group.isManager ? 'Kamu PJ' : 'PJ ${group.manager.name}'} · ${group.memberCount} anggota',
            maxLines: 1, overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontSize: 12, color: KarsaColors.muted)),
          const SizedBox(height: 10),
          Row(children: [
            Expanded(child: Text(_preview, maxLines: 1, overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: KarsaType.caption, color: KarsaColors.muted))),
            if (group.lastMessage != null) ...[
              const SizedBox(width: 8),
              Text(formatRelativeTime(group.lastMessage!.createdAt),
                style: const TextStyle(fontSize: 12, color: KarsaColors.muted)),
            ],
          ]),
        ])),
        const SizedBox(width: 4),
        const Icon(Icons.chevron_right_rounded, color: KarsaColors.muted),
      ]),
    )),
  );
}
