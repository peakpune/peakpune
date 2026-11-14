import 'package:flutter/material.dart';

import '../data/honesty.dart';
import '../shared/actions.dart';
import '../shared/detail.dart';
import '../state/app_state.dart';
import '../theme/theme.dart';
import '../theme/tokens.dart';
import '../theme/widgets.dart';
import 'home.dart';

/// About and settings: credits, content-checked dates, links, privacy.
class AboutScreen extends StatelessWidget {
  const AboutScreen({super.key});

  static const version = '1.0.0';

  @override
  Widget build(BuildContext context) {
    final state = AppScope.of(context);
    final lib = state.library;
    final t = Theme.of(context).textTheme;
    DateTime? newest(Iterable<DateTime> ds) => ds.isEmpty ? null : ds.reduce((a, b) => a.isAfter(b) ? a : b);
    final historyChecked = newest(lib.history.map((e) => e.checkedAt));
    final shopsChecked = newest(lib.shops.map((e) => e.checkedAt));

    Widget row(String label, String value) => Padding(
          padding: const EdgeInsets.symmetric(vertical: PP.s2),
          child: MergeSemantics(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(label, style: inter(14, 600, color: PP.inkSoft)),
              Text(value, style: t.bodyLarge),
            ]),
          ),
        );

    return Scaffold(
      appBar: AppBar(title: const Text('About')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(PP.s4, PP.s6, PP.s4, PP.s12),
        children: [
          const Wordmark(),
          const SizedBox(height: PP.s4),
          Text('An open-source Pune discovery project: places, outdoors, plans, history, shopping and an offline metro guide. This app is the phone companion to peakpune.com: same data, same rules.', style: t.bodyLarge),
          const SizedBox(height: PP.s5),
          Wrap(spacing: PP.s3, runSpacing: PP.s3, children: [
            FilledButton.icon(onPressed: () => openLink(context, PP.siteUrl), icon: const Icon(Icons.north_east, size: 20), label: const Text('peakpune.com')),
            OutlinedButton.icon(onPressed: () => openLink(context, PP.repoUrl), icon: const Icon(Icons.code, size: 20), label: const Text('Source on GitHub')),
          ]),
          const SizedBox(height: PP.s8),
          Semantics(header: true, child: Text('When content was checked', style: t.headlineSmall)),
          const SizedBox(height: PP.s2),
          row('Places, outdoors, events and meetups', 'Publication audit of ${longDate(lib.auditCheckedAt)}'),
          row('Pune Metro fares and stations', 'Verified ${longDateIso(lib.metro.verifiedOn)}'),
          row('History', historyChecked == null ? 'Not added yet' : 'Latest check ${longDate(historyChecked)}'),
          row('Shopping', shopsChecked == null ? 'Not added yet' : 'Latest check ${longDate(shopsChecked)}'),
          const SizedBox(height: PP.s2),
          Text('Entries checked more than $staleAfterDays days ago are flagged for a re-check. This version of the app carries its data inside it: update the app to get newer listings.', style: t.bodySmall),
          const SizedBox(height: PP.s8),
          Semantics(header: true, child: Text('Privacy', style: t.headlineSmall)),
          const SizedBox(height: PP.s2),
          Text('No accounts, no ads, no analytics and no tracking. The app does not connect to the internet: links, maps, sharing and calendar entries open other apps when you choose. Two settings stay on this phone: that you have seen the welcome screen, and your History language.', style: t.bodyMedium),
          const SizedBox(height: PP.s8),
          Semantics(header: true, child: Text('Credits', style: t.headlineSmall)),
          const SizedBox(height: PP.s2),
          Text('Content and code: Peak Pune, MIT licence. Published by OverTime Labs.\n'
              'Listings: the organiser, venue and operator pages linked on every entry.\n'
              'Map coordinates: © OpenStreetMap contributors, under the Open Database Licence.\n'
              'Fonts: Fraunces and Inter, under the SIL Open Font Licence.',
              style: t.bodyMedium),
          const SizedBox(height: PP.s4),
          Align(
            alignment: Alignment.centerLeft,
            child: OutlinedButton(
              onPressed: () => showLicensePage(context: context, applicationName: 'Peak Pune', applicationVersion: version, applicationLegalese: 'MIT licence. Published by OverTime Labs.'),
              child: const Text('Open-source licences'),
            ),
          ),
          const SizedBox(height: PP.s8),
          Text('Version $version', style: t.bodySmall),
        ],
      ),
    );
  }
}

/// One short welcome, then straight to content. No login, no carousel.
class WelcomeScreen extends StatelessWidget {
  const WelcomeScreen({super.key, required this.onDone});
  final VoidCallback onDone;

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;
    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(PP.s6, PP.s10, PP.s6, PP.s8),
          children: [
            const Align(alignment: Alignment.centerLeft, child: Wordmark()),
            const SizedBox(height: PP.s12),
            const Padding(padding: EdgeInsets.symmetric(horizontal: PP.s2), child: Signboard(text: 'Pune, checked at the source.', small: 'Works offline · No login')),
            const SizedBox(height: PP.s12),
            Text('Places, loops and treks, plans, history, shopping and the metro. Every entry says where it came from and when it was checked.', style: t.bodyLarge),
            const SizedBox(height: PP.s8),
            SizedBox(
              width: double.infinity,
              child: FilledButton(onPressed: onDone, child: const Text('Start exploring')),
            ),
          ],
        ),
      ),
    );
  }
}

/// Shown if the bundled data cannot be read. Offers a retry.
class LoadFailure extends StatelessWidget {
  const LoadFailure({super.key, required this.onRetry});
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) => Scaffold(
        body: Center(
          child: EmptyState(
            icon: Icons.error_outline,
            title: 'That did not load.',
            message: 'The listings ship inside the app, so this should not happen. Try again; if it keeps happening, reinstall the app.',
            actions: [DetailAction('Try again', Icons.refresh, onRetry, primary: true)],
          ),
        ),
      );
}
