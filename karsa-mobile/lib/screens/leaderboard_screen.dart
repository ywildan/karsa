import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';

import '../core/api_client.dart';
import '../core/models.dart';
import '../widgets/common.dart';

const _karsaOrange = KarsaColors.orange;
const _warmBorder = KarsaColors.border;
const _rowExtent = 84.0;

double _rowHeight(BuildContext context) {
  final scaler = MediaQuery.textScalerOf(context);
  final extra = scaler.scale(13) + scaler.scale(10) - 23;
  return _rowExtent + extra.clamp(0.0, double.infinity).toDouble();
}

class LeaderboardScreen extends StatefulWidget {
  const LeaderboardScreen({required this.api, super.key});
  final ApiClient api;

  @override
  State<LeaderboardScreen> createState() => _LeaderboardScreenState();
}

class _LeaderboardScreenState extends State<LeaderboardScreen> {
  final _scrollController = ScrollController();
  final _listHeadingKey = GlobalKey();
  List<LeaderboardOption> _options = [];
  List<LeaderboardEntry> _rows = [];
  LeaderboardOption? _selected;
  Object? _error;
  bool _loading = true;
  int _request = 0;

  LeaderboardEntry? get _currentUser {
    for (final row in _rows) {
      if (row.isCurrentUser) {
        return row;
      }
    }
    return null;
  }

  @override
  void initState() {
    super.initState();
    _loadOptions();
    widget.api.pointsRevision.addListener(_pointsChanged);
  }

  @override
  void dispose() {
    _request++;
    widget.api.pointsRevision.removeListener(_pointsChanged);
    _scrollController.dispose();
    super.dispose();
  }

  void _pointsChanged() {
    if (_selected == null) { _loadOptions(); } else { _select(_selected); }
  }

  Future<void> _loadOptions() async {
    final request = ++_request;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final options = await widget.api.leaderboardOptions();
      if (!mounted || request != _request) {
        return;
      }
      LeaderboardOption? selected;
      for (final option in options) {
        if (option.id == _selected?.id) {
          selected = option;
          break;
        }
      }
      selected ??= options.isEmpty ? null : options.first;
      setState(() {
        _options = options;
        _selected = selected;
        _rows = [];
        _loading = selected != null;
      });
      if (selected != null) {
        await _select(selected);
      }
    } catch (error) {
      if (mounted && request == _request) {
        setState(() {
          _error = error;
          _loading = false;
        });
      }
    }
  }

  Future<void> _select(
    LeaderboardOption? option, {
    bool resetScroll = false,
  }) async {
    if (option == null || !mounted) {
      return;
    }
    final request = ++_request;
    setState(() {
      _selected = option;
      _rows = [];
      _loading = true;
      _error = null;
    });
    if (resetScroll && _scrollController.hasClients) {
      _scrollController.jumpTo(0);
    }
    try {
      final rows = await widget.api.leaderboard(option.id);
      if (mounted && request == _request) {
        setState(() {
          _rows = rows;
          _loading = false;
        });
      }
    } catch (error) {
      if (mounted && request == _request) {
        setState(() {
          _error = error;
          _loading = false;
        });
      }
    }
  }

  Future<void> _refresh() =>
      _selected == null ? _loadOptions() : _select(_selected);

  double _filterHeight(BuildContext context) {
    final scale = MediaQuery.textScalerOf(context).scale(14) / 14;
    return 112 + ((scale - 1) * 36).clamp(0, 100).toDouble();
  }

  void _showMyPosition() {
    final index = _rows.indexWhere((entry) => entry.isCurrentUser);
    final heading = _listHeadingKey.currentContext?.findRenderObject();
    if (index < 0 ||
        heading is! RenderBox ||
        !_scrollController.hasClients) {
      return;
    }
    final viewport = RenderAbstractViewport.of(heading);
    final start = viewport.getOffsetToReveal(heading, 0).offset;
    final target = (start +
            heading.size.height +
            index * _rowHeight(context) -
            _filterHeight(context) -
            8)
        .clamp(0.0, _scrollController.position.maxScrollExtent)
        .toDouble();
    if (MediaQuery.disableAnimationsOf(context)) {
      _scrollController.jumpTo(target);
    } else {
      _scrollController.animateTo(
        target,
        duration: const Duration(milliseconds: 280),
        curve: const Cubic(0.23, 1, 0.32, 1),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      color: _karsaOrange,
      onRefresh: _refresh,
      child: CustomScrollView(
        controller: _scrollController,
        physics: const AlwaysScrollableScrollPhysics(),
        slivers: [
          const SliverAppBar(
            pinned: true,
            title: Text('Peringkat'),
          ),
          if (_options.isNotEmpty)
            SliverPersistentHeader(
              pinned: true,
              delegate: _CourseFilter(
                height: _filterHeight(context),
                options: _options,
                selected: _selected,
                onChanged: (option) => _select(option, resetScroll: true),
              ),
            ),
          ..._contentSlivers(context),
        ],
      ),
    );
  }

  List<Widget> _contentSlivers(BuildContext context) {
    if (_loading) {
      return [
        const SliverFillRemaining(
          hasScrollBody: false,
          child: Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                CircularProgressIndicator(color: _karsaOrange),
                SizedBox(height: 16),
                Text('Memuat peringkat kelas...'),
              ],
            ),
          ),
        ),
      ];
    }
    if (_error != null) {
      return [
        SliverFillRemaining(
          hasScrollBody: false,
          child: ErrorState(
            message: friendlyError(_error!),
            onRetry: _refresh,
          ),
        ),
      ];
    }
    if (_options.isEmpty) {
      return [
        const SliverFillRemaining(
          hasScrollBody: false,
          child: EmptyState(
            title: 'Belum ada mata kuliah',
            message:
                'Peringkat akan tersedia setelah mata kuliah ditambahkan ke kelasmu.',
            icon: Icons.emoji_events_outlined,
          ),
        ),
      ];
    }
    if (_rows.isEmpty) {
      return [
        const SliverFillRemaining(
          hasScrollBody: false,
          child: EmptyState(
            title: 'Peringkat belum tersedia',
            message: 'Belum ada data partisipasi untuk mata kuliah ini.',
            icon: Icons.emoji_events_outlined,
          ),
        ),
      ];
    }
    final currentUser = _currentUser;
    return [
      SliverToBoxAdapter(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
          child: _PositionCard(
            entry: currentUser,
            participants: _rows.length,
            onShowPosition: _showMyPosition,
          ),
        ),
      ),
      SliverToBoxAdapter(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 28, 16, 0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const _SectionTitle(
                title: 'Partisipasi teratas',
                subtitle: 'Apresiasi untuk keaktifan di kelas.',
              ),
              const SizedBox(height: 22),
              if (_rows.any((entry) => entry.points > 0))
                _Podium(entries: _rows.take(3).toList())
              else const InfoNotice(message: 'Belum ada poin tercatat. Peringkat akan terlihat setelah kontribusi pertama.'),
            ],
          ),
        ),
      ),
      SliverToBoxAdapter(
        child: Padding(
          key: _listHeadingKey,
          padding: const EdgeInsets.fromLTRB(16, 28, 16, 14),
          child: Row(
            children: [
              const Expanded(
                child: Text(
                  'Peringkat lengkap',
                  style: TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              Text(
                '${_rows.length} mahasiswa',
                style: TextStyle(
                  fontSize: 12,
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
        ),
      ),
      SliverPadding(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        sliver: SliverFixedExtentList(
          itemExtent: _rowHeight(context),
          delegate: SliverChildBuilderDelegate(
            (context, index) => _RankRow(
              entry: _rows[index],
              first: index == 0,
              last: index == _rows.length - 1,
            ),
            childCount: _rows.length,
          ),
        ),
      ),
      const SliverToBoxAdapter(child: SizedBox(height: 32)),
    ];
  }
}

class _CourseFilter extends SliverPersistentHeaderDelegate {
  const _CourseFilter({
    required this.height,
    required this.options,
    required this.selected,
    required this.onChanged,
  });

  final double height;
  final List<LeaderboardOption> options;
  final LeaderboardOption? selected;
  final ValueChanged<LeaderboardOption?> onChanged;

  @override
  double get minExtent => height;

  @override
  double get maxExtent => height;

  String _label(LeaderboardOption item) =>
      item.code.isEmpty ? item.name : '${item.code} · ${item.name}';

  @override
  Widget build(
    BuildContext context,
    double shrinkOffset,
    bool overlapsContent,
  ) {
    return ClipRect(
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 14, sigmaY: 14),
        child: Container(
          decoration: BoxDecoration(
            color: KarsaColors.background.withValues(alpha: 0.88),
            border: const Border(
              bottom: BorderSide(color: _warmBorder),
            ),
          ),
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'MATA KULIAH',
                style: TextStyle(
                  color: KarsaColors.accentInk,
                  fontSize: KarsaType.caption,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 1.3,
                ),
              ),
              const SizedBox(height: 8),
              Expanded(
                child: Align(
                  alignment: Alignment.center,
                  child: DropdownButtonFormField<LeaderboardOption>(
                    key: ValueKey(selected?.id),
                    initialValue: selected,
                    isExpanded: true,
                    menuMaxHeight: 360,
                    dropdownColor: KarsaColors.card,
                    borderRadius: BorderRadius.circular(14),
                    icon: const Icon(
                      Icons.keyboard_arrow_down_rounded,
                      color: KarsaColors.muted,
                    ),
                    decoration: const InputDecoration(
                      prefixIcon: Icon(
                        Icons.menu_book_rounded,
                        size: 20,
                        color: _karsaOrange,
                      ),
                      contentPadding: EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 12,
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.all(Radius.circular(14)),
                        borderSide: BorderSide(color: _warmBorder),
                      ),
                    ),
                    selectedItemBuilder: (context) => options
                        .map(
                          (item) => Align(
                            alignment: Alignment.centerLeft,
                            child: Text(
                              _label(item),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontSize: KarsaType.caption,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                        )
                        .toList(),
                    items: options
                        .map(
                          (item) => DropdownMenuItem(
                            value: item,
                            child: Text(
                              _label(item),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        )
                        .toList(),
                    onChanged: onChanged,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  bool shouldRebuild(covariant _CourseFilter oldDelegate) =>
      height != oldDelegate.height ||
      selected != oldDelegate.selected ||
      options != oldDelegate.options;
}

class _PositionCard extends StatelessWidget {
  const _PositionCard({
    required this.entry,
    required this.participants,
    required this.onShowPosition,
  });

  final LeaderboardEntry? entry;
  final int participants;
  final VoidCallback onShowPosition;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    final user = entry;
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [KarsaColors.tintSoft, KarsaColors.background],
        ),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: KarsaColors.tintStrong),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(
                Icons.insights_rounded,
                size: 18,
                color: _karsaOrange,
              ),
              SizedBox(width: 8),
              Text(
                'POSISIMU DI KELAS',
                style: TextStyle(
                  fontSize: KarsaType.caption,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 1.2,
                  color: KarsaColors.accentInk,
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),
          if (user == null)
            Text(
              'Posisimu belum tersedia',
              style: TextStyle(
                color: colors.onSurfaceVariant,
                fontWeight: FontWeight.w600,
              ),
            )
          else
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: _PositionMetric(
                    value: '#${user.rank}',
                    label: 'dari $participants mahasiswa',
                  ),
                ),
                const SizedBox(width: 20),
                Expanded(
                  child: _PositionMetric(
                    value: '${user.points}',
                    label: 'poin partisipasi',
                  ),
                ),
              ],
            ),
          if (user != null) ...[
            const SizedBox(height: 16),
            const Divider(color: KarsaColors.tintStrong, height: 1),
            const SizedBox(height: 6),
            Align(
              alignment: Alignment.centerLeft,
              child: TextButton.icon(
                onPressed: onShowPosition,
                style: TextButton.styleFrom(
                  foregroundColor: _karsaOrange,
                  padding: const EdgeInsets.symmetric(horizontal: 0),
                ),
                iconAlignment: IconAlignment.end,
                icon: const Icon(Icons.arrow_downward_rounded, size: 16),
                label: const Text('Lihat posisiku'),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _PositionMetric extends StatelessWidget {
  const _PositionMetric({required this.value, required this.label});

  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        FittedBox(
          fit: BoxFit.scaleDown,
          alignment: Alignment.centerLeft,
          child: Text(
            value,
            style: const TextStyle(
              fontSize: 38,
              height: 1.1,
              fontWeight: FontWeight.w800,
              letterSpacing: -1.4,
              color: KarsaColors.ink,
            ),
          ),
        ),
        const SizedBox(height: 6),
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
        ),
      ],
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle({required this.title, required this.subtitle});

  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 4),
        Text(
          subtitle,
          style: TextStyle(
            fontSize: 12,
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
        ),
      ],
    );
  }
}

class _Podium extends StatelessWidget {
  const _Podium({required this.entries});

  final List<LeaderboardEntry> entries;

  @override
  Widget build(BuildContext context) {
    final reduceMotion = MediaQuery.disableAnimationsOf(context);
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: 1),
      duration: reduceMotion
          ? Duration.zero
          : const Duration(milliseconds: 420),
      curve: const Cubic(0.23, 1, 0.32, 1),
      builder: (context, value, child) => Opacity(
        opacity: value,
        child: Transform.translate(
          offset: Offset(0, reduceMotion ? 0 : 10 * (1 - value)),
          child: child,
        ),
      ),
      child: entries.length == 1
          ? Center(
              child: SizedBox(
                width: 160,
                child: _PodiumPerson(entry: entries.first, primary: true),
              ),
            )
          : Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Expanded(child: _PodiumPerson(entry: entries[1])),
                const SizedBox(width: 8),
                Expanded(
                  child: _PodiumPerson(entry: entries.first, primary: true),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: entries.length > 2
                      ? _PodiumPerson(entry: entries[2])
                      : const SizedBox.shrink(),
                ),
              ],
            ),
    );
  }
}

class _PodiumPerson extends StatelessWidget {
  const _PodiumPerson({required this.entry, this.primary = false});

  final LeaderboardEntry entry;
  final bool primary;

  @override
  Widget build(BuildContext context) {
    final foreground = primary ? _karsaOrange : KarsaColors.muted;
    return Semantics(
      label:
          'Peringkat ${entry.rank}, ${entry.name}, ${entry.points} poin',
      excludeSemantics: true,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (primary) ...[
            const Icon(
              Icons.emoji_events_rounded,
              color: _karsaOrange,
              size: 24,
            ),
            const SizedBox(height: 8),
          ],
          Container(
            padding: const EdgeInsets.all(3),
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(
                color: primary
                    ? KarsaColors.tintStrong
                    : KarsaColors.tintStrong,
                width: 2,
              ),
            ),
            child: CircleAvatar(
              radius: primary ? 28 : 23,
              backgroundColor: primary
                  ? KarsaColors.tintStrong
                  : KarsaColors.tintSoft,
              child: Text(
                _initials(entry.name),
                style: TextStyle(
                  color: foreground,
                  fontSize: primary ? 18 : 15,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ),
          const SizedBox(height: 10),
          SizedBox(
            height: 42,
            child: Text(
              entry.name,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                height: 1.4,
              ),
            ),
          ),
          if (entry.isCurrentUser)
            const Text(
              'Kamu',
              style: TextStyle(
                fontSize: KarsaType.caption,
                fontWeight: FontWeight.w700,
                color: KarsaColors.accentInk,
              ),
            )
          else
            const SizedBox(height: 14),
          const SizedBox(height: 8),
          Container(
            width: double.infinity,
            constraints: BoxConstraints(minHeight: primary ? 96 : 68),
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
            decoration: BoxDecoration(
              gradient: primary
                  ? const LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [_karsaOrange, KarsaColors.orangeDeep],
                    )
                  : null,
              color: primary ? null : KarsaColors.tintSoft,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  '#${entry.rank}',
                  style: TextStyle(
                    fontSize: primary ? 24 : 19,
                    fontWeight: FontWeight.w800,
                    color: primary ? KarsaColors.onOrange : foreground,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  '${entry.points} poin',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: KarsaType.caption,
                    fontWeight: FontWeight.w600,
                    color: primary ? KarsaColors.onOrange : foreground,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

String _initials(String name) {
  final parts = name.trim().split(RegExp(r'\s+'));
  if (parts.first.isEmpty) {
    return '?';
  }
  final first = parts.first.characters.first;
  final last = parts.length > 1 ? parts.last.characters.first : '';
  return '$first$last'.toUpperCase();
}

class _RankRow extends StatelessWidget {
  const _RankRow({
    required this.entry,
    required this.first,
    required this.last,
  });

  final LeaderboardEntry entry;
  final bool first;
  final bool last;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return Container(
      decoration: BoxDecoration(
        color: entry.isCurrentUser
            ? KarsaColors.tintSoft
            : KarsaColors.card,
        borderRadius: BorderRadius.vertical(
          top: first ? const Radius.circular(20) : Radius.zero,
          bottom: last ? const Radius.circular(20) : Radius.zero,
        ),
        border: Border.all(color: _warmBorder, width: 0.5),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      child: Row(
        children: [
          SizedBox(
            width: 28,
            child: Text(
              '${entry.rank}',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w800,
                color: entry.isCurrentUser
                    ? KarsaColors.orange
                    : colors.onSurfaceVariant,
              ),
            ),
          ),
          const SizedBox(width: 10),
          CircleAvatar(
            radius: 18,
            backgroundColor: entry.isCurrentUser
                ? KarsaColors.tintStrong
                : KarsaColors.tintSoft,
            child: Text(
              _initials(entry.name),
              style: const TextStyle(
                color: KarsaColors.muted,
                fontSize: KarsaType.caption,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  entry.name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: KarsaType.body,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  [
                    if (entry.isCurrentUser) 'Kamu',
                    if (entry.nim != null) maskNim(entry.nim),
                  ].join(' · '),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: KarsaType.caption,
                    color: entry.isCurrentUser
                        ? KarsaColors.accentInk
                        : colors.onSurfaceVariant,
                    fontWeight: entry.isCurrentUser
                        ? FontWeight.w700
                        : FontWeight.w400,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 78),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                FittedBox(
                  fit: BoxFit.scaleDown,
                  child: Text(
                    '${entry.points}',
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                      color: KarsaColors.ink,
                    ),
                  ),
                ),
                const Text(
                  'poin',
                  style: TextStyle(fontSize: KarsaType.caption, color: KarsaColors.muted),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
