import 'package:flutter/material.dart';

import '../../data/models.dart';
import '../../l10n/strings.dart';
import '../../state/app_state.dart';
import '../../theme/theme.dart';
import '../entry/entry_screen.dart';
import '../settings/settings_screen.dart';

/// A raised, bordered panel used instead of Material cards.
class Panel extends StatelessWidget {
  const Panel({super.key, required this.child, this.padding = const EdgeInsets.all(18), this.onTap, this.semanticLabel});

  final Widget child;
  final EdgeInsetsGeometry padding;
  final VoidCallback? onTap;
  final String? semanticLabel;

  @override
  Widget build(BuildContext context) {
    final c = PPColors.of(context);
    final shape = RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(14),
      side: BorderSide(color: c.rule),
    );
    final content = Padding(padding: padding, child: child);
    return Semantics(
      label: semanticLabel,
      button: onTap != null,
      child: Material(
        color: c.paperRaised,
        shape: shape,
        clipBehavior: Clip.antiAlias,
        child: onTap == null ? content : InkWell(onTap: onTap, child: content),
      ),
    );
  }
}

class SectionHeader extends StatelessWidget {
  const SectionHeader(this.text, {super.key, this.trailing});
  final String text;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final c = PPColors.of(context);
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 28, 20, 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Semantics(
                  header: true,
                  child: Text(text, style: Theme.of(context).textTheme.titleLarge),
                ),
                const SizedBox(height: 6),
                Container(width: 28, height: 2, color: c.saffron),
              ],
            ),
          ),
          if (trailing != null) trailing!,
        ],
      ),
    );
  }
}

class StatusBadge extends StatelessWidget {
  const StatusBadge(this.status, {super.key, this.dense = false});
  final EntryStatus status;
  final bool dense;

  @override
  Widget build(BuildContext context) {
    final s = S.of(context);
    final c = PPColors.of(context);
    final color = c.forStatus(status);
    final label = switch (status) {
      EntryStatus.verified => s.t('statusVerified'),
      EntryStatus.disputed => s.t('statusDisputed'),
      EntryStatus.researchLead => s.t('statusResearchLead'),
    };
    final icon = switch (status) {
      EntryStatus.verified => Icons.task_alt,
      EntryStatus.disputed => Icons.compare_arrows,
      EntryStatus.researchLead => Icons.help_outline,
    };
    return Semantics(
      label: label,
      excludeSemantics: true,
      child: Container(
        padding: EdgeInsets.symmetric(horizontal: dense ? 8 : 10, vertical: dense ? 2 : 4),
        decoration: BoxDecoration(
          border: Border.all(color: color),
          borderRadius: BorderRadius.circular(99),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: dense ? 13 : 15, color: color),
            const SizedBox(width: 5),
            Text(label, style: Theme.of(context).textTheme.labelMedium?.copyWith(color: color)),
          ],
        ),
      ),
    );
  }
}

class FixtureBanner extends StatelessWidget {
  const FixtureBanner({super.key});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Container(
      width: double.infinity,
      color: cs.error,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      child: Text(
        S.of(context).t('fixtureBanner'),
        style: Theme.of(context).textTheme.labelLarge?.copyWith(color: cs.onError),
      ),
    );
  }
}

class EmptyState extends StatelessWidget {
  const EmptyState({super.key, required this.icon, required this.message});
  final IconData icon;
  final String message;

  @override
  Widget build(BuildContext context) {
    final c = PPColors.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 40),
      child: Column(
        children: [
          Icon(icon, size: 36, color: c.inkMuted),
          const SizedBox(height: 14),
          Text(message, textAlign: TextAlign.center, style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: c.inkMuted)),
        ],
      ),
    );
  }
}

/// One line in any list of entries: date, title, summary, status.
class EntryTile extends StatelessWidget {
  const EntryTile({super.key, required this.entry, this.showDate = true, this.showSummary = true});
  final Entry entry;
  final bool showDate;
  final bool showSummary;

  @override
  Widget build(BuildContext context) {
    final tt = Theme.of(context).textTheme;
    final c = PPColors.of(context);
    final date = entry.date?.label;
    final s = S.of(context);
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
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 14, 20, 14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (entry.isFixture)
                Padding(
                  padding: const EdgeInsets.only(bottom: 6),
                  child: Text(s.t('fixtureBanner'), style: tt.labelSmall?.copyWith(color: Theme.of(context).colorScheme.error)),
                ),
              Row(
                children: [
                  if (showDate && date != null)
                    Expanded(child: Text(date, style: tt.labelMedium?.copyWith(color: c.saffron)))
                  else
                    const Spacer(),
                  if (entry.freeSample && !AppScope.of(context).unlock.unlocked) _FreeChip(label: s.t('freeChip')),
                  if (entry.status != EntryStatus.verified) StatusBadge(entry.status, dense: true),
                ],
              ),
              if ((showDate && date != null) || entry.status != EntryStatus.verified) const SizedBox(height: 4),
              Text(entry.title, style: tt.titleLarge?.copyWith(fontSize: 19)),
              if (showSummary && entry.summary.isNotEmpty) ...[
                const SizedBox(height: 4),
                Text(entry.summary, style: tt.bodyMedium?.copyWith(color: c.inkMuted), maxLines: 3, overflow: TextOverflow.ellipsis),
              ],
            ],
          ),
        ),
      ),
      ),
    );
  }
}

/// Marks entries that can be read without the unlock.
class _FreeChip extends StatelessWidget {
  const _FreeChip({required this.label});
  final String label;

  @override
  Widget build(BuildContext context) {
    final c = PPColors.of(context);
    return Container(
      margin: const EdgeInsetsDirectional.only(end: 6),
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 1),
      decoration: BoxDecoration(color: c.saffron.withAlpha(30), borderRadius: BorderRadius.circular(999)),
      child: Text(label, style: Theme.of(context).textTheme.labelSmall?.copyWith(color: c.saffron)),
    );
  }
}

void openEntry(BuildContext context, String id) {
  Navigator.of(context).push(MaterialPageRoute(builder: (_) => EntryScreen(entryId: id)));
}

/// Settings, shown in every top-level app bar.
List<Widget> commonActions(BuildContext context) {
  final s = S.of(context);
  return [
    IconButton(
      tooltip: s.t('settings'),
      icon: const Icon(Icons.tune),
      onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const SettingsScreen())),
    ),
    const SizedBox(width: 4),
  ];
}
