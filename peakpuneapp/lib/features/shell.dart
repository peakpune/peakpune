import 'package:animations/animations.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../state/app_state.dart';
import '../theme/tokens.dart';
import 'about.dart';
import 'explore.dart';
import 'home.dart';
import 'metro.dart';
import 'outdoors.dart';
import 'plans.dart';

/// Five tabs with a Brick pill for the current one. Tab changes fade through
/// (Material motion) with a light haptic; each tab keeps its scroll position.
class Shell extends StatelessWidget {
  const Shell({super.key});

  static const _tabs = <Widget>[HomeScreen(), ExploreScreen(), OutdoorsScreen(), PlansScreen(), MetroScreen()];

  @override
  Widget build(BuildContext context) {
    final state = AppScope.of(context);
    return Scaffold(
      appBar: AppBar(
        title: const Wordmark(),
        actions: [
          IconButton(
            tooltip: 'About Peak Pune',
            icon: const Icon(Icons.info_outline),
            onPressed: () => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => const AboutScreen())),
          ),
        ],
      ),
      body: PageTransitionSwitcher(
        duration: PP.slow,
        transitionBuilder: (child, primary, secondary) => FadeThroughTransition(animation: primary, secondaryAnimation: secondary, fillColor: PP.paper, child: child),
        child: KeyedSubtree(key: ValueKey(state.tab), child: _tabs[state.tab]),
      ),
      bottomNavigationBar: DecoratedBox(
        decoration: const BoxDecoration(border: Border(top: BorderSide(color: PP.ink, width: 2))),
        child: NavigationBar(
          selectedIndex: state.tab,
          animationDuration: PP.medium,
          onDestinationSelected: (i) {
            HapticFeedback.selectionClick();
            state.goTab(i);
          },
          destinations: const [
            NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home), label: 'Home'),
            NavigationDestination(icon: Icon(Icons.place_outlined), selectedIcon: Icon(Icons.place), label: 'Explore'),
            NavigationDestination(icon: Icon(Icons.terrain_outlined), selectedIcon: Icon(Icons.terrain), label: 'Outdoors'),
            NavigationDestination(icon: Icon(Icons.event_outlined), selectedIcon: Icon(Icons.event), label: 'Plans'),
            NavigationDestination(icon: Icon(Icons.tram_outlined), selectedIcon: Icon(Icons.tram), label: 'Metro'),
          ],
        ),
      ),
    );
  }
}
