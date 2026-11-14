import 'package:flutter/material.dart';

import '../../config/app_config.dart';
import '../../l10n/strings.dart';
import '../../state/app_state.dart';
import '../sources/source_sheet.dart';
import '../unlock/unlock_panel.dart';
import '../widgets/common.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final state = AppScope.of(context);
    final s = S.of(context);
    final tt = Theme.of(context).textTheme;
    final lib = state.library;

    String purchaseText() => switch (AppConfig.purchaseModel) {
          PurchaseModel.undecided => s.t('purchaseUndecided'),
          PurchaseModel.paidUpfront => s.t('purchasePaid'),
          PurchaseModel.freeWithUnlock => s.t('purchaseUnlock', {'price': state.unlock.price ?? AppConfig.plannedPriceInr}),
          PurchaseModel.free => s.t('purchaseFree'),
        };

    return Scaffold(
      appBar: AppBar(title: Text(s.t('settings'))),
      body: ListView(
        padding: const EdgeInsets.only(bottom: 40),
        children: [
          SectionHeader(s.t('unlockSection')),
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 20),
            child: UnlockPanel(showIntro: false),
          ),
          SectionHeader(s.t('appearance')),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: SegmentedButton<ThemeMode>(
              segments: [
                ButtonSegment(value: ThemeMode.system, label: Text(s.t('themeSystem'))),
                ButtonSegment(value: ThemeMode.light, label: Text(s.t('themeLight'))),
                ButtonSegment(value: ThemeMode.dark, label: Text(s.t('themeDark'))),
              ],
              selected: {state.themeMode},
              onSelectionChanged: (v) => state.setThemeMode(v.first),
              showSelectedIcon: false,
            ),
          ),
          const SizedBox(height: 18),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Text(s.t('textSize'), style: tt.titleSmall),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8),
            child: Row(children: [
              const ExcludeSemantics(child: Text('A', style: TextStyle(fontSize: 14))),
              Expanded(
                child: Slider(
                  value: state.textScale,
                  min: AppState.minScale,
                  max: AppState.maxScale,
                  divisions: 15,
                  label: '${(state.textScale * 100).round()}%',
                  semanticFormatterCallback: (v) => '${s.t('textSize')} ${(v * 100).round()}%',
                  onChanged: state.setTextScale,
                ),
              ),
              const ExcludeSemantics(child: Text('A', style: TextStyle(fontSize: 24))),
            ]),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 0),
            child: Text(s.t('textSizeSample'), style: tt.bodyLarge),
          ),
          SectionHeader(s.t('howWeSource')),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Text(s.t('howWeSourceBody'), style: tt.bodyMedium),
          ),
          ListTile(
            leading: const Icon(Icons.library_books_outlined),
            title: Text(s.t('sourceRegister')),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const SourcesScreen())),
          ),
          ListTile(
            leading: const Icon(Icons.privacy_tip_outlined),
            title: Text(s.t('privacy')),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const PrivacyScreen())),
          ),
          SectionHeader(s.t('about')),
          _KV(label: s.t('publisher'), value: AppConfig.publisher),
          _KV(label: s.t('version'), value: AppConfig.appVersion),
          _KV(label: s.t('contentVersion', {'v': lib.contentVersion, 'date': lib.contentDate}), value: ''),
          _KV(label: s.t('price'), value: purchaseText()),
          if (!AppConfig.nameCleared)
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 6, 20, 0),
              child: Text(s.t('nameNotice'), style: tt.bodySmall),
            ),
          if (lib.hasFixtures)
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 6, 20, 0),
              child: Text(s.t('fixturesLoaded'), style: tt.bodySmall?.copyWith(color: Theme.of(context).colorScheme.error)),
            ),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 10, 20, 0),
            child: Text(s.t('fonts'), style: tt.bodySmall),
          ),
          ListTile(
            leading: const Icon(Icons.gavel_outlined),
            title: Text(s.t('licences')),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => showLicensePage(
              context: context,
              applicationName: AppConfig.appName,
              applicationLegalese: AppConfig.publisher,
            ),
          ),
        ],
      ),
    );
  }
}

class _KV extends StatelessWidget {
  const _KV({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final tt = Theme.of(context).textTheme;
    return MergeSemantics(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 6, 20, 6),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: value.isEmpty ? tt.bodyMedium : tt.labelSmall),
            if (value.isNotEmpty) Text(value, style: tt.bodyMedium),
          ],
        ),
      ),
    );
  }
}

class PrivacyScreen extends StatelessWidget {
  const PrivacyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final s = S.of(context);
    final tt = Theme.of(context).textTheme;
    return Scaffold(
      appBar: AppBar(title: Text(s.t('privacy')), actions: commonActions(context)),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 40),
        children: [
          for (final k in ['privacyBody1', 'privacyBody2', 'privacyBody3', 'privacyBody5'])
            Padding(padding: const EdgeInsets.only(bottom: 16), child: Text(s.t(k), style: tt.bodyLarge)),
          Text(s.t('privacyBody4', {'contact': AppConfig.privacyContact}), style: tt.bodyMedium),
        ],
      ),
    );
  }
}
