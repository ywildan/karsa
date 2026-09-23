import 'package:flutter/material.dart';

import '../core/app_controller.dart';
import 'account_screen.dart';
import 'leaderboard_screen.dart';
import 'point_form_screen.dart';
import 'point_history_screen.dart';
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
    final isPj = widget.controller.user!.capabilities.recordPoints;
    final pages = <Widget>[
      if (isPj) PointFormScreen(api: widget.controller.api),
      if (isPj) PointHistoryScreen(api: widget.controller.api),
      ReportScreen(api: widget.controller.api),
      LeaderboardScreen(api: widget.controller.api),
      AccountScreen(controller: widget.controller),
    ];
    final destinations = <NavigationDestination>[
      if (isPj)
        const NavigationDestination(icon: Icon(Icons.add_circle_outline), selectedIcon: Icon(Icons.add_circle), label: 'Poin'),
      if (isPj)
        const NavigationDestination(icon: Icon(Icons.history_outlined), selectedIcon: Icon(Icons.history), label: 'Riwayat'),
      const NavigationDestination(icon: Icon(Icons.assessment_outlined), selectedIcon: Icon(Icons.assessment), label: 'Laporan'),
      const NavigationDestination(icon: Icon(Icons.emoji_events_outlined), selectedIcon: Icon(Icons.emoji_events), label: 'Peringkat'),
      const NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person), label: 'Akun'),
    ];

    if (_index >= pages.length) _index = 0;
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
