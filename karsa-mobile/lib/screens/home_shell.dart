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
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    final user = widget.controller.user!;
    final isPj = user.capabilities.recordPoints;
    final pages = <Widget>[];
    final destinations = <NavigationDestination>[];

    if (user.capabilities.viewKarsaLib) {
      pages.add(KarsaLibScreen(api: widget.controller.api, user: user));
      destinations.add(const NavigationDestination(icon: Icon(Icons.auto_stories_outlined), selectedIcon: Icon(Icons.auto_stories), label: 'Lib'));
    }
    if (user.classId != null) {
      pages.add(GroupListScreen(api: widget.controller.api));
      destinations.add(const NavigationDestination(icon: Icon(Icons.forum_outlined), selectedIcon: Icon(Icons.forum), label: 'Grup'));
    }
    if (isPj) {
      pages.add(PointFormScreen(api: widget.controller.api));
      destinations.add(
        const NavigationDestination(icon: Icon(Icons.add_circle_outline), selectedIcon: Icon(Icons.add_circle), label: 'Poin'),
      );
      pages.add(ActivityScreen(api: widget.controller.api));
      destinations.add(
        const NavigationDestination(icon: Icon(Icons.insights_outlined), selectedIcon: Icon(Icons.insights), label: 'Aktivitas'),
      );
    } else {
      if (user.capabilities.viewReport) {
        pages.add(ReportScreen(api: widget.controller.api));
        destinations.add(const NavigationDestination(icon: Icon(Icons.assessment_outlined), selectedIcon: Icon(Icons.assessment), label: 'Laporan'));
        pages.add(LeaderboardScreen(api: widget.controller.api));
        destinations.add(const NavigationDestination(icon: Icon(Icons.emoji_events_outlined), selectedIcon: Icon(Icons.emoji_events), label: 'Peringkat'));
      }
    }
    pages.add(AccountScreen(controller: widget.controller));
    destinations.add(const NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person), label: 'Akun'));

    if (_index >= pages.length) {
      _index = 0;
    }
    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: IndexedStack(index: _index, children: pages),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (value) => setState(() => _index = value),
        destinations: destinations,
      ),
    );
  }
}
