import 'package:flutter/material.dart';

import '../core/api_client.dart';
import '../core/models.dart';
import '../widgets/common.dart';

class LeaderboardScreen extends StatefulWidget {
  const LeaderboardScreen({required this.api, super.key});
  final ApiClient api;

  @override
  State<LeaderboardScreen> createState() => _LeaderboardScreenState();
}

class _LeaderboardScreenState extends State<LeaderboardScreen> {
  List<LeaderboardOption>? _options;
  List<LeaderboardEntry>? _rows;
  LeaderboardOption? _selected;
  Object? _error;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadOptions();
  }

  Future<void> _loadOptions() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final options = await widget.api.leaderboardOptions();
      _options = options;
      _selected = options.isEmpty ? null : options.first;
      _rows = _selected == null ? [] : await widget.api.leaderboard(_selected!.id);
    } catch (error) {
      _error = error;
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _select(LeaderboardOption? option) async {
    if (option == null) {
      return;
    }
    setState(() {
      _selected = option;
      _loading = true;
      _error = null;
    });
    try {
      _rows = await widget.api.leaderboard(option.id);
    } catch (error) {
      _error = error;
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) => CustomScrollView(
        slivers: [
          const SliverAppBar(title: Text('Peringkat kelas')),
          SliverFillRemaining(
            hasScrollBody: true,
            child: _body(context),
          ),
        ],
      );

  Widget _body(BuildContext context) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_error != null) {
      return ErrorState(message: friendlyError(_error!), onRetry: _loadOptions);
    }
    if (_options?.isEmpty ?? true) {
      return const EmptyState(
        title: 'Belum ada mata kuliah',
        message: 'Peringkat akan tersedia setelah mata kuliah ditambahkan ke kelasmu.',
        icon: Icons.emoji_events_outlined,
      );
    }
    return RefreshIndicator(
      onRefresh: () => _select(_selected),
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
        children: [
          DropdownButtonFormField<LeaderboardOption>(
            initialValue: _selected,
            decoration: const InputDecoration(labelText: 'Mata kuliah'),
            items: _options!
                .map(
                  (item) => DropdownMenuItem(
                    value: item,
                    child: Text(item.code.isEmpty ? item.name : '${item.code} · ${item.name}'),
                  ),
                )
                .toList(),
            onChanged: _select,
          ),
          const SizedBox(height: 18),
          ...?_rows?.map((row) => _RankTile(entry: row)),
        ],
      ),
    );
  }
}

class _RankTile extends StatelessWidget {
  const _RankTile({required this.entry});
  final LeaderboardEntry entry;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return Card(
      color: entry.isCurrentUser ? colors.primaryContainer : Colors.white,
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: entry.rank <= 3 ? colors.primary : colors.surfaceContainerHighest,
          foregroundColor: entry.rank <= 3 ? colors.onPrimary : colors.onSurface,
          child: Text('${entry.rank}', style: const TextStyle(fontWeight: FontWeight.w700)),
        ),
        title: Text(
          entry.isCurrentUser ? '${entry.name} (Kamu)' : entry.name,
          style: const TextStyle(fontWeight: FontWeight.w700),
        ),
        subtitle: entry.nim == null ? null : Text(entry.nim!),
        trailing: Text('${entry.points} poin', style: const TextStyle(fontWeight: FontWeight.w700)),
      ),
    );
  }
}
