import 'package:flutter/material.dart';

import '../data/honesty.dart';
import '../data/models.dart';
import '../shared/detail.dart';
import '../state/app_state.dart';
import '../theme/theme.dart';
import '../theme/tokens.dart';
import '../theme/widgets.dart';

/// Text in the chosen language. Missing Marathi falls back to English and says so;
/// nothing is machine-translated.
({String text, bool isMarathi, bool fellBack}) pick(HistoryLang lang, String en, String? mr) =>
    lang == HistoryLang.mr && mr != null ? (text: mr, isMarathi: true, fellBack: false) : (text: en, isMarathi: false, fellBack: lang == HistoryLang.mr);

TextStyle _styled(TextStyle base, bool isMarathi) => isMarathi ? marathi(base) : base;

String historyWhen(HistoryEntry e) => e.dateLabel ?? (e.year?.toString() ?? 'Undated');

/// The verified timeline grouped by era, with an English/Marathi toggle.
class HistoryScreen extends StatelessWidget {
  const HistoryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final state = AppScope.of(context);
    final lib = state.library;
    final lang = state.historyLang;
    final eras = <String, List<HistoryEntry>>{};
    for (final e in lib.history) {
      (eras[e.era] ??= []).add(e); // history is sorted by year, so eras come in time order
    }
    return Scaffold(
      appBar: AppBar(title: Text(lang == HistoryLang.mr ? 'पुण्याचा इतिहास' : 'Pune history', style: _styled(fraunces(22, 800), lang == HistoryLang.mr))),
      body: ListView(
        key: const PageStorageKey('history'),
        padding: const EdgeInsets.fromLTRB(PP.s4, PP.s5, PP.s4, PP.s12),
        children: [
          Semantics(
            label: 'Language for history entries',
            child: SegmentedButton<HistoryLang>(
              segments: [
                const ButtonSegment(value: HistoryLang.en, label: Text('English')),
                ButtonSegment(value: HistoryLang.mr, label: Text('मराठी', style: marathi(inter(15, 700)))),
              ],
              selected: {lang},
              showSelectedIcon: false,
              onSelectionChanged: (v) {
                Feedback.forTap(context);
                state.setHistoryLang(v.first);
              },
            ),
          ),
          const SizedBox(height: PP.s3),
          Text('A verified timeline: every entry links to its sources.', style: Theme.of(context).textTheme.bodySmall),
          if (lib.history.isEmpty)
            EmptyState(
              icon: Icons.menu_book_outlined,
              title: lib.historyLoaded ? 'No verified entries yet.' : 'The timeline is still being checked.',
              message: 'Entries appear here only once each one has a source. Pune has waited a few centuries; a few more days is fine.',
              actions: [DetailAction('Explore places', Icons.place_outlined, () {
                state.goTab(1);
                Navigator.of(context).popUntil((r) => r.isFirst);
              }, primary: true)],
            ),
          for (final era in eras.keys) ...[
            Padding(
              padding: const EdgeInsets.only(top: PP.s8, bottom: PP.s3),
              child: Semantics(header: true, child: Text(era, style: Theme.of(context).textTheme.headlineSmall)),
            ),
            for (final e in eras[era]!) Padding(padding: const EdgeInsets.only(bottom: PP.s4), child: _HistoryCard(e: e, lang: lang)),
          ],
        ],
      ),
    );
  }
}

class _HistoryCard extends StatelessWidget {
  const _HistoryCard({required this.e, required this.lang});
  final HistoryEntry e;
  final HistoryLang lang;

  @override
  Widget build(BuildContext context) {
    final title = pick(lang, e.titleEn, e.titleMr);
    final summary = pick(lang, e.summaryEn, e.summaryMr);
    return EntryCard(
      eyebrow: historyWhen(e),
      title: title.text,
      titleStyle: _styled(Theme.of(context).textTheme.titleLarge!, title.isMarathi),
      summary: summary.text,
      summaryStyle: _styled(inter(16, 400, height: 1.5, color: PP.inkSoft), summary.isMarathi),
      meta: [MetaText('${e.sources.length} ${e.sources.length == 1 ? 'source' : 'sources'}')],
      footer: title.fellBack ? 'Marathi text not available yet; shown in English.' : null,
      onTap: () => openPage(context, HistoryDetail(e: e)),
    );
  }
}

class HistoryDetail extends StatelessWidget {
  const HistoryDetail({super.key, required this.e});
  final HistoryEntry e;

  @override
  Widget build(BuildContext context) {
    final lang = AppScope.of(context).historyLang;
    final title = pick(lang, e.titleEn, e.titleMr);
    final summary = pick(lang, e.summaryEn, e.summaryMr);
    return DetailPage(
      eyebrow: e.era,
      title: title.text,
      titleStyle: _styled(Theme.of(context).textTheme.headlineMedium!, title.isMarathi),
      summary: summary.text,
      summaryStyle: _styled(Theme.of(context).textTheme.bodyLarge!, summary.isMarathi),
      sources: e.sources,
      checkedAt: e.checkedAt,
      shareUrl: PP.siteUrl,
      shareLine: '${historyWhen(e)} · ${e.era}',
      badges: [TagPill(historyWhen(e), color: PP.haldi)],
      flags: [if (title.fellBack || summary.fellBack) 'Marathi text is not available for this entry yet, so it is shown in English.'],
      facts: [
        Fact('When', historyWhen(e)),
        Fact('Era', e.era),
        if (lang == HistoryLang.mr && e.titleMr != null) Fact('In English', e.titleEn),
      ],
      provenance: 'Read the sources for the full record. Checked on ${longDate(e.checkedAt)}.',
    );
  }
}
