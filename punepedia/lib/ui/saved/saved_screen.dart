import 'package:flutter/material.dart';

import '../../l10n/strings.dart';
import '../../state/app_state.dart';
import '../../theme/theme.dart';
import '../widgets/common.dart';

class SavedScreen extends StatelessWidget {
  const SavedScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final state = AppScope.of(context);
    final lib = state.library;
    final s = S.of(context);
    final tt = Theme.of(context).textTheme;
    final c = PPColors.of(context);
    final saved = [for (final id in state.bookmarks) if (lib.entry(id) != null) lib.entry(id)!];
    return Scaffold(
      appBar: AppBar(title: Text(s.t('navSaved')), actions: commonActions(context)),
      body: ListView(
        padding: const EdgeInsets.only(bottom: 32),
        children: [
          if (saved.isEmpty)
            EmptyState(icon: Icons.bookmark_border, message: s.t('savedEmpty'))
          else
            for (final e in saved) ...[EntryTile(entry: e), const Divider(indent: 20, endIndent: 20)],
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 24, 16, 0),
            child: Panel(
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(Icons.offline_pin_outlined, color: c.verified),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(s.t('offlineTitle'), style: tt.titleMedium),
                        const SizedBox(height: 4),
                        Text(
                          s.t('offlineBody', {
                            'n': lib.entries.where((e) => !e.isFixture).length,
                            's': lib.sources.length,
                          }),
                          style: tt.bodySmall,
                        ),
                        const SizedBox(height: 4),
                        Text(s.t('contentVersion', {'v': lib.contentVersion, 'date': lib.contentDate}), style: tt.labelSmall),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
