import 'package:flutter/material.dart';

import '../l10n/strings.dart';
import 'discover/discover_screen.dart';
import 'explore/explore_screen.dart';
import 'saved/saved_screen.dart';
import 'timeline/timeline_screen.dart';

/// Four top-level sections behind a bottom navigation bar. Each tab keeps its
/// own scroll position (IndexedStack).
class RootShell extends StatefulWidget {
  const RootShell({super.key});

  @override
  State<RootShell> createState() => _RootShellState();
}

class _RootShellState extends State<RootShell> {
  int _index = 0;
  // Tabs are built the first time they are opened, then kept alive. This
  // keeps start-up light and avoids touching the map until it is needed.
  final Set<int> _visited = {0};

  static const _tabs = <Widget>[
    DiscoverScreen(),
    TimelineScreen(),
    ExploreScreen(),
    SavedScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    final s = S.of(context);
    return Scaffold(
      body: IndexedStack(
        index: _index,
        children: [
          for (var i = 0; i < _tabs.length; i++)
            _visited.contains(i) ? _tabs[i] : const SizedBox.shrink(),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() {
          _index = i;
          _visited.add(i);
        }),
        destinations: [
          NavigationDestination(icon: const Icon(Icons.auto_stories_outlined), selectedIcon: const Icon(Icons.auto_stories), label: s.t('navDiscover')),
          NavigationDestination(icon: const Icon(Icons.timeline_outlined), selectedIcon: const Icon(Icons.timeline), label: s.t('navTimeline')),
          NavigationDestination(icon: const Icon(Icons.grid_view_outlined), selectedIcon: const Icon(Icons.grid_view), label: s.t('navExplore')),
          NavigationDestination(icon: const Icon(Icons.bookmark_border), selectedIcon: const Icon(Icons.bookmark), label: s.t('navSaved')),
        ],
      ),
    );
  }
}
