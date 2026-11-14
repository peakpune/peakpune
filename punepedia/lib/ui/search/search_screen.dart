import 'package:flutter/material.dart';

import '../../data/models.dart';
import '../../data/queries.dart';
import '../../l10n/strings.dart';
import '../../state/app_state.dart';
import '../../theme/theme.dart';
import '../widgets/common.dart';

/// Full-text search with topic, era and status filters. Results are
/// announced to screen readers as the count changes.
class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key, this.initialQuery = ''});
  final String initialQuery;

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  late final TextEditingController _q = TextEditingController(text: widget.initialQuery);
  Set<String> _cats = {};
  Set<String> _eras = {};
  Set<EntryStatus>? _statuses;

  @override
  void dispose() {
    _q.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = AppScope.of(context);
    final lib = state.library;
    final s = S.of(context);
    final tt = Theme.of(context).textTheme;
    final c = PPColors.of(context);
    final statuses = _statuses ??
        {EntryStatus.verified, EntryStatus.disputed, if (state.showResearchLeads) EntryStatus.researchLead};
    final filter = EntryFilter(categories: _cats, eras: _eras, statuses: statuses);
    final hits = state.search.search(_q.text, filter);
    final hasQuery = _q.text.trim().isNotEmpty;
    final filtered = _cats.isNotEmpty || _eras.isNotEmpty || _statuses != null;

    String statusLabel(EntryStatus st) => switch (st) {
          EntryStatus.verified => s.t('statusVerified'),
          EntryStatus.disputed => s.t('statusDisputed'),
          EntryStatus.researchLead => s.t('statusResearchLead'),
        };

    return Scaffold(
      appBar: AppBar(
        titleSpacing: 0,
        title: Padding(
          padding: const EdgeInsets.only(right: 8),
          child: TextField(
            controller: _q,
            autofocus: widget.initialQuery.isEmpty,
            textInputAction: TextInputAction.search,
            style: tt.bodyLarge,
            decoration: InputDecoration(
              hintText: s.t('searchHint'),
              isDense: true,
              prefixIcon: const Icon(Icons.search),
              suffixIcon: hasQuery
                  ? IconButton(
                      tooltip: s.t('close'),
                      icon: const Icon(Icons.close),
                      onPressed: () => setState(_q.clear),
                    )
                  : null,
            ),
            onChanged: (_) => setState(() {}),
          ),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.only(bottom: 32),
        children: [
          _FilterRow(
            label: s.t('filterCategory'),
            children: [
              for (final cat in lib.categories)
                FilterChip(
                  label: Text(cat.label),
                  selected: _cats.contains(cat.id),
                  onSelected: (v) => setState(() => _cats = {..._cats}..toggle(cat.id, v)),
                ),
            ],
          ),
          _FilterRow(
            label: s.t('filterEra'),
            children: [
              for (final era in lib.eras)
                FilterChip(
                  label: Text(era.label),
                  selected: _eras.contains(era.id),
                  onSelected: (v) => setState(() => _eras = {..._eras}..toggle(era.id, v)),
                ),
            ],
          ),
          _FilterRow(
            label: s.t('filterStatus'),
            children: [
              for (final st in EntryStatus.values)
                FilterChip(
                  label: Text(statusLabel(st)),
                  selected: statuses.contains(st),
                  onSelected: (v) => setState(() => _statuses = {...statuses}..toggle(st, v)),
                ),
            ],
          ),
          if (filtered)
            Align(
              alignment: Alignment.centerLeft,
              child: Padding(
                padding: const EdgeInsets.only(left: 8),
                child: TextButton(
                  onPressed: () => setState(() {
                    _cats = {};
                    _eras = {};
                    _statuses = null;
                  }),
                  child: Text(s.t('clearFilters')),
                ),
              ),
            ),
          const Divider(),
          if (!hasQuery)
            Padding(
              padding: const EdgeInsets.all(20),
              child: Text(s.t('searchPrompt'), style: tt.bodyMedium?.copyWith(color: c.inkMuted)),
            )
          else ...[
            Semantics(
              liveRegion: true,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 12, 20, 4),
                child: Text(s.t('results', {'n': hits.length}), style: tt.labelLarge),
              ),
            ),
            if (hits.isEmpty) EmptyState(icon: Icons.search_off, message: s.t('noResults')),
            for (final h in hits) ...[EntryTile(entry: h.entry), const Divider(indent: 20, endIndent: 20)],
          ],
        ],
      ),
    );
  }
}

extension on Set<String> {
  void toggle(String v, bool on) => on ? add(v) : remove(v);
}

extension on Set<EntryStatus> {
  void toggle(EntryStatus v, bool on) => on ? add(v) : remove(v);
}

class _FilterRow extends StatelessWidget {
  const _FilterRow({required this.label, required this.children});
  final String label;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Text(label, style: Theme.of(context).textTheme.labelSmall),
          ),
          const SizedBox(height: 4),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(children: [for (final ch in children) Padding(padding: const EdgeInsets.only(right: 8), child: ch)]),
          ),
        ],
      ),
    );
  }
}
