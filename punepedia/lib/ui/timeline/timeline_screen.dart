import 'package:flutter/material.dart';

import '../../data/models.dart';
import '../../data/queries.dart';
import '../../l10n/strings.dart';
import '../../state/app_state.dart';
import '../../theme/theme.dart';
import '../explore/explore_screen.dart';
import '../widgets/common.dart';

/// Browse by era, then by date. Research leads stay hidden unless the reader
/// switches them on, and are labelled when shown.
class TimelineScreen extends StatefulWidget {
  const TimelineScreen({super.key});

  @override
  State<TimelineScreen> createState() => _TimelineScreenState();
}

class _TimelineScreenState extends State<TimelineScreen> {
  String? _era; // null = all eras

  @override
  Widget build(BuildContext context) {
    final state = AppScope.of(context);
    final lib = state.library;
    final s = S.of(context);
    final tt = Theme.of(context).textTheme;
    final c = PPColors.of(context);
    final filter = defaultFilter(state).copyWith(eras: _era == null ? {} : {_era!});
    final groups = timelineByEra(lib, filter);

    return Scaffold(
      appBar: AppBar(title: Text(s.t('navTimeline')), actions: commonActions(context)),
      body: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.fromLTRB(16, 4, 16, 4),
              child: Row(
                children: [
                  _EraChip(label: s.t('allEras'), selected: _era == null, onTap: () => setState(() => _era = null)),
                  for (final era in lib.eras)
                    _EraChip(
                      label: era.label,
                      selected: _era == era.id,
                      onTap: () => setState(() => _era = era.id),
                    ),
                ],
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: MergeSemantics(
              child: SwitchListTile(
                title: Text(s.t('showResearchLeads'), style: tt.titleSmall),
                subtitle: Text(state.showResearchLeads ? s.t('leadsShown') : s.t('leadsHidden'), style: tt.bodySmall),
                value: state.showResearchLeads,
                onChanged: state.setShowResearchLeads,
              ),
            ),
          ),
          for (final (era, rows) in groups) ...[
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 24, 20, 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Semantics(header: true, child: Text(era.label, style: tt.headlineSmall)),
                    Text(era.range, style: tt.labelMedium?.copyWith(color: c.saffron)),
                  ],
                ),
              ),
            ),
            if (rows.isEmpty)
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
                  child: Text(s.t('eraEmpty'), style: tt.bodySmall),
                ),
              )
            else
              SliverList.builder(
                itemCount: rows.length,
                itemBuilder: (context, i) => _TimelineRow(entry: rows[i], isLast: i == rows.length - 1),
              ),
          ],
          const SliverToBoxAdapter(child: SizedBox(height: 40)),
        ],
      ),
    );
  }
}

class _EraChip extends StatelessWidget {
  const _EraChip({required this.label, required this.selected, required this.onTap});
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(right: 8),
        child: ChoiceChip(label: Text(label), selected: selected, onSelected: (_) => onTap()),
      );
}

/// A row with a vertical rule and a marker, like a printed chronology.
class _TimelineRow extends StatelessWidget {
  const _TimelineRow({required this.entry, required this.isLast});
  final Entry entry;
  final bool isLast;

  @override
  Widget build(BuildContext context) {
    final tt = Theme.of(context).textTheme;
    final c = PPColors.of(context);
    final s = S.of(context);
    final date = entry.date?.label;
    final markerColor = c.forStatus(entry.status);
    final statusLabel = switch (entry.status) {
      EntryStatus.verified => s.t('statusVerified'),
      EntryStatus.disputed => s.t('statusDisputed'),
      EntryStatus.researchLead => s.t('statusResearchLead'),
    };
    return MergeSemantics(
      child: Semantics(
        value: statusLabel,
        child: InkWell(
          onTap: () => openEntry(context, entry.id),
          child: IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                SizedBox(
                  width: 44,
                  child: Stack(
                    alignment: Alignment.topCenter,
                    children: [
                      Positioned.fill(
                        child: Align(
                          alignment: Alignment.topCenter,
                          child: Container(width: 1.5, color: c.rule, margin: EdgeInsets.only(bottom: isLast ? 0 : 0)),
                        ),
                      ),
                      Padding(
                        padding: const EdgeInsets.only(top: 18),
                        child: Container(
                          width: 11,
                          height: 11,
                          decoration: BoxDecoration(
                            color: entry.status == EntryStatus.verified ? markerColor : c.paper,
                            border: Border.all(color: markerColor, width: 2),
                            shape: entry.status == EntryStatus.disputed ? BoxShape.rectangle : BoxShape.circle,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(0, 12, 20, 14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(date ?? s.t('undated'), style: tt.labelLarge?.copyWith(color: c.saffron)),
                        const SizedBox(height: 2),
                        Text(entry.title, style: tt.titleMedium),
                        if (entry.status != EntryStatus.verified) ...[
                          const SizedBox(height: 6),
                          StatusBadge(entry.status, dense: true),
                        ],
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
