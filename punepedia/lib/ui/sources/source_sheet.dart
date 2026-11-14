import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../l10n/strings.dart';
import '../../state/app_state.dart';
import '../../theme/theme.dart';
import '../widgets/common.dart';

Future<void> showSourceSheet(BuildContext context, String sourceId, {String? pages}) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    builder: (_) => DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.62,
      maxChildSize: 0.95,
      builder: (ctx, controller) => SourceDetail(sourceId: sourceId, pages: pages, controller: controller),
    ),
  );
}

Future<void> openSourceUrl(BuildContext context, String url) async {
  final messenger = ScaffoldMessenger.maybeOf(context);
  final failed = S.of(context).t('linkFailed');
  final uri = Uri.tryParse(url);
  var ok = false;
  if (uri != null && uri.scheme == 'https') {
    try {
      ok = await launchUrl(uri, mode: LaunchMode.externalApplication);
    } catch (_) {
      ok = false;
    }
  }
  if (!ok) messenger?.showSnackBar(SnackBar(content: Text(failed)));
}

class SourceDetail extends StatelessWidget {
  const SourceDetail({super.key, required this.sourceId, this.pages, this.controller});
  final String sourceId;
  final String? pages;
  final ScrollController? controller;

  @override
  Widget build(BuildContext context) {
    final lib = AppScope.of(context).library;
    final src = lib.source(sourceId);
    final s = S.of(context);
    final tt = Theme.of(context).textTheme;
    final c = PPColors.of(context);
    if (src == null) return const SizedBox.shrink();
    final via = src.citedVia == null ? null : lib.source(src.citedVia!);
    final citingEntries = lib.entries.where((e) => e.allCites.any((ci) => ci.sourceId == src.id)).length;

    Widget row(String label, String value) => Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: tt.labelSmall),
              const SizedBox(height: 2),
              Text(value, style: tt.bodyMedium),
            ],
          ),
        );

    return ListView(
      controller: controller,
      padding: const EdgeInsets.fromLTRB(22, 0, 22, 32),
      children: [
        Text(s.t('srcKind_${src.kind}').toUpperCase(), style: tt.labelMedium?.copyWith(color: c.saffron)),
        const SizedBox(height: 6),
        Semantics(header: true, child: Text(src.title, style: tt.headlineSmall)),
        const SizedBox(height: 12),
        Row(children: [
          Icon(src.consulted ? Icons.menu_book : Icons.link, size: 18, color: src.consulted ? c.verified : c.disputed),
          const SizedBox(width: 6),
          Expanded(
            child: Text(
              src.consulted ? s.t('consulted') : s.t('notConsulted'),
              style: tt.titleSmall?.copyWith(color: src.consulted ? c.verified : c.disputed),
            ),
          ),
        ]),
        if (via != null) ...[
          const SizedBox(height: 4),
          InkWell(
            onTap: () {
              final nav = Navigator.of(context);
              nav.pop();
              showSourceSheet(nav.context, via.id);
            },
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: Text(s.t('citedVia', {'title': via.title}),
                  style: tt.bodyMedium?.copyWith(decoration: TextDecoration.underline, decorationColor: c.inkMuted)),
            ),
          ),
        ],
        const SizedBox(height: 16),
        row(s.t('srcAuthor'), src.author),
        row(s.t('srcPublisher'), src.publisher),
        row(s.t('srcYear'), src.year),
        if (pages != null) row(s.t('pages'), pages!),
        row(s.t('reliability'), src.reliability),
        Text(s.t('accessed', {'date': src.accessed}), style: tt.bodySmall),
        Text(s.t('citedIn', {'n': citingEntries}), style: tt.bodySmall),
        const SizedBox(height: 6),
        SelectableText(src.url, style: tt.bodySmall),
        const SizedBox(height: 18),
        Wrap(
          spacing: 10,
          runSpacing: 10,
          children: [
            FilledButton.icon(
              icon: const Icon(Icons.open_in_new),
              label: Text(s.t('openSource')),
              onPressed: () => openSourceUrl(context, src.url),
            ),
            OutlinedButton.icon(
              icon: const Icon(Icons.copy),
              label: Text(s.t('copyCitation')),
              onPressed: () async {
                final messenger = ScaffoldMessenger.maybeOf(context);
                final msg = s.t('citationCopied');
                final text = '${src.citation}${pages != null ? ', ${pages!}' : ''}. ${src.url} (accessed ${src.accessed})';
                await Clipboard.setData(ClipboardData(text: text));
                messenger?.showSnackBar(SnackBar(content: Text(msg)));
              },
            ),
          ],
        ),
      ],
    );
  }

}

/// The full source register: every source, with its evaluation.
class SourcesScreen extends StatefulWidget {
  const SourcesScreen({super.key});

  @override
  State<SourcesScreen> createState() => _SourcesScreenState();
}

class _SourcesScreenState extends State<SourcesScreen> {
  bool? _consulted; // null = all

  @override
  Widget build(BuildContext context) {
    final lib = AppScope.of(context).library;
    final s = S.of(context);
    final tt = Theme.of(context).textTheme;
    final c = PPColors.of(context);
    final list = lib.sources.where((x) => _consulted == null || x.consulted == _consulted).toList()
      ..sort((a, b) => a.title.toLowerCase().compareTo(b.title.toLowerCase()));
    return Scaffold(
      appBar: AppBar(title: Text(s.t('sourceRegister')), actions: commonActions(context)),
      body: ListView(
        padding: const EdgeInsets.only(bottom: 40),
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 4, 20, 12),
            child: Text(s.t('sourceRegisterIntro'), style: tt.bodyMedium?.copyWith(color: c.inkMuted)),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Wrap(spacing: 8, children: [
              ChoiceChip(label: Text(s.t('all')), selected: _consulted == null, onSelected: (_) => setState(() => _consulted = null)),
              ChoiceChip(label: Text(s.t('consulted')), selected: _consulted == true, onSelected: (_) => setState(() => _consulted = true)),
              ChoiceChip(label: Text(s.t('notConsulted')), selected: _consulted == false, onSelected: (_) => setState(() => _consulted = false)),
            ]),
          ),
          const SizedBox(height: 8),
          for (final src in list)
            MergeSemantics(
              child: ListTile(
                title: Text(src.title, style: tt.titleSmall),
                subtitle: Text(
                  '${src.author} · ${src.year}\n${src.consulted ? s.t('consulted') : s.t('notConsulted')}',
                  style: tt.bodySmall,
                ),
                isThreeLine: true,
                trailing: const Icon(Icons.chevron_right),
                onTap: () => showSourceSheet(context, src.id),
              ),
            ),
        ],
      ),
    );
  }
}
