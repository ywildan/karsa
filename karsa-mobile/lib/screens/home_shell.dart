import 'package:flutter/material.dart';

import '../core/app_controller.dart';
import 'account_screen.dart';
import 'activity_screen.dart';
import 'group_list_screen.dart';
import 'karsa_lib_screen.dart';
import 'leaderboard_screen.dart';
import 'point_form_screen.dart';
import 'report_screen.dart';

class HomeShell extends StatefulWidget {
  const HomeShell({required this.controller, super.key});
  final AppController controller;
  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  String _selected = 'lib';
  final Set<String> _visited = {};

  void _select(String id) => setState(() {
    _selected = id;
    _visited.add(id);
  });

  @override
  Widget build(BuildContext context) {
    final user = widget.controller.user!;
    final api = widget.controller.api;
    final tabs = <_HomeDestination>[
      if (user.capabilities.viewKarsaLib)
        _HomeDestination('lib', 'Karsa Lib', Icons.auto_stories_outlined,
            Icons.auto_stories, () => KarsaLibScreen(api: api, user: user)),
      if (user.classId != null)
        _HomeDestination('groups', 'Grup', Icons.forum_outlined,
            Icons.forum, () => GroupListScreen(api: api)),
      if (user.capabilities.recordPoints) ...[
        _HomeDestination('points', 'Input poin', Icons.add_circle_outline,
            Icons.add_circle, () => PointFormScreen(api: api)),
        _HomeDestination('activity', 'Aktivitas', Icons.insights_outlined,
            Icons.insights, () => ActivityScreen(
              api: api, onRecordPoints: () => _select('points'),
              showReport: user.capabilities.viewReport,
              showLeaderboard: user.capabilities.viewLeaderboard,
            )),
      ] else ...[
        if (user.capabilities.viewReport)
          _HomeDestination('report', 'Laporan', Icons.assessment_outlined,
              Icons.assessment, () => ReportScreen(api: api)),
        if (user.capabilities.viewLeaderboard)
          _HomeDestination('ranking', 'Peringkat', Icons.emoji_events_outlined,
              Icons.emoji_events, () => LeaderboardScreen(api: api)),
      ],
      _HomeDestination('account', 'Akun', Icons.person_outline,
          Icons.person, () => AccountScreen(controller: widget.controller)),
    ];
    var index = tabs.indexWhere((tab) => tab.id == _selected);
    if (index < 0) {
      _selected = tabs.first.id;
      index = 0;
    }
    _visited.add(_selected);

    return PopScope(
      canPop: _selected == tabs.first.id,
      onPopInvokedWithResult: (didPop, result) {
        if (!didPop) _select(tabs.first.id);
      },
      child: Scaffold(
        body: SafeArea(
          bottom: false,
          child: IndexedStack(
            index: index,
            children: [
              for (final tab in tabs)
                KeyedSubtree(
                  key: ValueKey(tab.id),
                  child: _visited.contains(tab.id)
                      ? tab.build()
                      : const SizedBox.shrink(),
                ),
            ],
          ),
        ),
        bottomNavigationBar: tabs.length < 2 ? null : NavigationBar(
          selectedIndex: index,
          onDestinationSelected: (value) => _select(tabs[value].id),
          destinations: [
            for (final tab in tabs)
              NavigationDestination(
                icon: Icon(tab.icon), selectedIcon: Icon(tab.selectedIcon),
                label: tab.label,
              ),
          ],
        ),
      ),
    );
  }
}

class _HomeDestination {
  const _HomeDestination(this.id, this.label, this.icon, this.selectedIcon, this.build);
  final String id;
  final String label;
  final IconData icon;
  final IconData selectedIcon;
  final Widget Function() build;
}
