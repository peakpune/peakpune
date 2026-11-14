import 'package:flutter/material.dart';

import '../data/honesty.dart';
import '../data/models.dart';
import '../metro/network.dart';
import '../metro/planner.dart';
import '../shared/actions.dart';
import '../shared/detail.dart';
import '../state/app_state.dart';
import '../theme/theme.dart';
import '../theme/tokens.dart';
import '../theme/widgets.dart';

String _stops(int n) => n == 1 ? '1 stop' : '$n stops';
String _systemName(FareSystem s) => s == FareSystem.maha ? 'Maha Metro (Lines 1 and 2)' : 'Line 3 (Pink)';

/// The offline journey planner, ported from the repository's Gleam planner.
class MetroScreen extends StatefulWidget {
  const MetroScreen({super.key});

  @override
  State<MetroScreen> createState() => _MetroScreenState();
}

class _MetroScreenState extends State<MetroScreen> {
  String? _from;
  String? _to;
  String? _area;

  @override
  Widget build(BuildContext context) {
    final net = AppScope.of(context).library.metro;
    final planner = Planner(net);
    final t = Theme.of(context).textTheme;
    String name(String id) => net.stations[id]?.name.replaceAll(RegExp(r', Pune$'), '') ?? id;
    final result = _from != null && _to != null ? planner.plan(_from!, _to!) : null;

    return ListView(
      key: const PageStorageKey('metro'),
      padding: const EdgeInsets.fromLTRB(PP.s4, PP.s6, PP.s4, PP.s12),
      children: [
        const Eyebrow('Pune Metro'),
        const SizedBox(height: PP.s2),
        Semantics(header: true, child: Text('Journey planner', style: t.headlineMedium)),
        const SizedBox(height: PP.s2),
        Text('Works offline. Fares and stations last verified on ${longDateIso(net.verifiedOn)}.', style: t.bodySmall),
        const SizedBox(height: PP.s5),
        InkCard(
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            _StationField(label: 'Boarding station', value: _from == null ? null : name(_from!), onTap: () => _pick(context, net, planner, true)),
            Align(
              alignment: Alignment.centerRight,
              child: IconButton(
                tooltip: 'Swap boarding and destination',
                icon: const Icon(Icons.swap_vert),
                onPressed: _from == null && _to == null
                    ? null
                    : () => setState(() {
                          final f = _from;
                          _from = _to;
                          _to = f;
                        }),
              ),
            ),
            _StationField(label: 'Destination station', value: _to == null ? null : name(_to!), onTap: () => _pick(context, net, planner, false)),
            const SizedBox(height: PP.s3),
            Text('Greyed-out stations cannot be chosen yet: they are not open, or the operator has not confirmed they are. Timetable information only.', style: t.bodySmall),
          ]),
        ),
        const SizedBox(height: PP.s5),
        AnimatedSwitcher(
          duration: PP.medium,
          switchInCurve: Curves.easeOut,
          child: KeyedSubtree(
            key: ValueKey('$_from>$_to'),
            child: result == null
                ? Text('Choose where you board and where you get off.', style: t.bodyLarge)
                : result.route != null
                    ? _RouteView(route: result.route!, net: net, name: name)
                    : FlagNote(switch (result.error!) {
                        SameStation() => 'You picked the same station twice. Choose a different destination.',
                        NotSelectable(:final station) => '${name(station)} is not open yet.',
                        NoRoute() => 'No route between these stations in the saved data. Check the official fare chart or ask the operator.',
                      }, icon: Icons.info_outline),
          ),
        ),
        const SizedBox(height: PP.s8),
        Semantics(header: true, child: Text('Not sure which station? Pick an area', style: t.headlineSmall)),
        const SizedBox(height: PP.s3),
        Wrap(spacing: PP.s2, runSpacing: PP.s2, children: [
          for (final a in net.areas)
            ChoiceChip(
              label: Text(a.name, style: inter(14, 600, color: _area == a.id ? PP.white : PP.ink)),
              selected: _area == a.id,
              onSelected: (_) => setState(() => _area = _area == a.id ? null : a.id),
            ),
        ]),
        if (net.areas.where((a) => a.id == _area).firstOrNull case final area?) ...[
          const SizedBox(height: PP.s4),
          InkCard(
            color: PP.sage,
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(area.name, style: t.titleLarge),
              const SizedBox(height: PP.s2),
              Text('${area.hasStation ? 'Has a station. ' : 'No station in the area. '}${area.note}', style: t.bodyMedium),
              const SizedBox(height: PP.s3),
              Text('Closest stations, by straight line:', style: inter(14, 600)),
              for (final s in area.stations)
                Padding(
                  padding: const EdgeInsets.only(top: PP.s2),
                  child: Wrap(spacing: PP.s2, runSpacing: PP.s2, crossAxisAlignment: WrapCrossAlignment.center, children: [
                    Text(name(s.id), style: inter(16, 600)),
                    OutlinedButton(onPressed: planner.selectable(s.id) ? () => setState(() => _from = s.id) : null, child: const Text('Board here')),
                    OutlinedButton(onPressed: planner.selectable(s.id) ? () => setState(() => _to = s.id) : null, child: const Text('Get off here')),
                  ]),
                ),
            ]),
          ),
        ],
        const SizedBox(height: PP.s8),
        _Practical(net: net),
      ],
    );
  }

  Future<void> _pick(BuildContext context, MetroNetwork net, Planner planner, bool from) async {
    final id = await Navigator.of(context).push<String>(MaterialPageRoute(builder: (_) => StationPicker(net: net, planner: planner, title: from ? 'Boarding station' : 'Destination station')));
    if (id != null) setState(() => from ? _from = id : _to = id);
  }
}

class _StationField extends StatelessWidget {
  const _StationField({required this.label, required this.value, required this.onTap});
  final String label;
  final String? value;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Semantics(
        button: true,
        label: '$label: ${value ?? 'not chosen'}',
        excludeSemantics: true,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(PP.rInput),
          child: InputDecorator(
            decoration: InputDecoration(labelText: label, suffixIcon: const Icon(Icons.expand_more)),
            child: Text(value ?? 'Choose a station', style: inter(17, value == null ? 400 : 600, color: value == null ? PP.inkSoft : PP.ink)),
          ),
        ),
      );
}

class _RouteView extends StatelessWidget {
  const _RouteView({required this.route, required this.net, required this.name});
  final MetroRoute route;
  final MetroNetwork net;
  final String Function(String) name;

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;
    final usesPink = route.legs.any((l) => l.operator == MetroOperator.pitCmrl);
    final usesMaha = route.legs.any((l) => l.operator == MetroOperator.mahaMetro);
    final mahaChange = route.tickets.any((tk) => tk.system == FareSystem.maha && tk.legs.length > 1);
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      for (final leg in route.legs)
        Padding(
          padding: const EdgeInsets.only(bottom: PP.s3),
          child: Container(
            decoration: BoxDecoration(color: PP.white, borderRadius: BorderRadius.circular(PP.rCard), border: Border.all(color: PP.ink, width: 2)),
            clipBehavior: Clip.antiAlias,
            child: IntrinsicHeight(
              child: Row(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                Container(width: 10, color: Color(net.lines.firstWhere((l) => l.id == leg.line).colour)),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.all(PP.s4),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(leg.lineName, style: inter(16, 800)),
                      const SizedBox(height: PP.s1),
                      Text('Board at ${name(leg.from)}, towards ${leg.toward}. Get off at ${name(leg.to)} after ${_stops(leg.stops)}.', style: t.bodyMedium),
                    ]),
                  ),
                ),
              ]),
            ),
          ),
        ),
      Text(route.changes.isEmpty ? 'No change needed.' : 'Change at ${route.changes.map(name).join(', ')}.', style: inter(16, 700)),
      const SizedBox(height: PP.s5),
      Semantics(header: true, child: Text('Tickets and fares', style: t.titleLarge)),
      const SizedBox(height: PP.s2),
      for (final tk in route.tickets) _TicketView(ticket: tk, net: net, name: name),
      if (route.tickets.length > 1)
        _note('This trip crosses two separate fare systems and operators. Each ticket\'s fare is shown on its own. No combined fare is published, so none is shown.'),
      if (mahaChange) _note('Both lines are one fare system: one ticket covers the change.'),
      if (usesPink) ...[
        _note('Line 3 tickets: buy at the station counter or a ticket vending machine, or use the Line 3 app. A Line 3 WhatsApp number is not confirmed, so none is shown.'),
        const SizedBox(height: PP.s2),
        const FlagNote('Line 3 is reported open by the media. The operator\'s website does not say which stations are open, so check at the station or on punerimetro.in before you travel.', color: PP.haldi, icon: Icons.campaign_outlined),
      ],
      if (usesMaha && net.mahaWhatsapp != null) ...[
        const SizedBox(height: PP.s3),
        Align(
          alignment: Alignment.centerLeft,
          child: OutlinedButton.icon(onPressed: () => openLink(context, net.mahaWhatsapp!), icon: const Icon(Icons.chat_outlined, size: 20), label: const Text('Book on WhatsApp (Lines 1 and 2 only)')),
        ),
      ],
    ]);
  }

  Widget _note(String s) => Padding(padding: const EdgeInsets.only(top: PP.s2), child: Text(s, style: inter(15, 400, height: 1.45, color: PP.inkSoft)));
}

class _TicketView extends StatelessWidget {
  const _TicketView({required this.ticket, required this.net, required this.name});
  final Ticket ticket;
  final MetroNetwork net;
  final String Function(String) name;

  @override
  Widget build(BuildContext context) {
    final chart = ticket.system == FareSystem.maha ? net.mahaFareChartUrl : net.pinkFareChartUrl;
    return Container(
      margin: const EdgeInsets.only(bottom: PP.s3),
      padding: const EdgeInsets.all(PP.s4),
      decoration: BoxDecoration(color: ticket.fare is ExactFare ? PP.sage : PP.clay, borderRadius: BorderRadius.circular(PP.rCard)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('${_systemName(ticket.system)}: ${name(ticket.from)} to ${name(ticket.to)}', style: inter(15, 700)),
        const SizedBox(height: PP.s2),
        switch (ticket.fare) {
          ExactFare(:final rupees) => Text('₹$rupees', style: fraunces(32, 800), semanticsLabel: '$rupees rupees'),
          CheckChart(:final why) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(
                'Check the official fare chart. ${why == ChartReason.disputed ? "The operator's own chart prints a different fare for each direction of this pair, so no exact fare is shown." : 'The saved fare table has no fare for this pair.'}',
                style: inter(15, 500, height: 1.45),
              ),
              const SizedBox(height: PP.s2),
              OutlinedButton.icon(onPressed: () => openLink(context, chart), icon: const Icon(Icons.north_east, size: 18), label: const Text('Official fare chart')),
            ]),
        },
      ]),
    );
  }
}

/// Full-page station chooser: search, line colours, not-open stations greyed out,
/// Line 3 stations labelled as media-reported.
class StationPicker extends StatefulWidget {
  const StationPicker({super.key, required this.net, required this.planner, required this.title});
  final MetroNetwork net;
  final Planner planner;
  final String title;

  @override
  State<StationPicker> createState() => _StationPickerState();
}

class _StationPickerState extends State<StationPicker> {
  final _q = TextEditingController();

  @override
  void dispose() {
    _q.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final q = _q.text.trim().toLowerCase();
    return Scaffold(
      appBar: AppBar(title: Text(widget.title)),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(PP.s4, PP.s4, PP.s4, PP.s12),
        children: [
          TextField(
            controller: _q,
            autofocus: false,
            onChanged: (_) => setState(() {}),
            decoration: const InputDecoration(hintText: 'Search stations', prefixIcon: Icon(Icons.search)),
          ),
          for (final line in widget.net.lines) ...[
            Padding(
              padding: const EdgeInsets.only(top: PP.s6, bottom: PP.s2),
              child: Row(children: [
                Container(width: 14, height: 14, decoration: BoxDecoration(color: Color(line.colour), shape: BoxShape.circle, border: Border.all(color: PP.ink))),
                const SizedBox(width: PP.s2),
                Expanded(child: Semantics(header: true, child: Text(line.name, style: Theme.of(context).textTheme.titleLarge))),
              ]),
            ),
            if (line.operator == MetroOperator.pitCmrl)
              Padding(padding: const EdgeInsets.only(bottom: PP.s2), child: Text('Station status is media-reported; the operator publishes no open list.', style: Theme.of(context).textTheme.bodySmall)),
            for (final stop in line.stops)
              if (q.isEmpty || widget.net.stations[stop.station]!.names.any((n) => n.toLowerCase().contains(q))) _stationTile(context, line, stop),
          ],
        ],
      ),
    );
  }

  Widget _stationTile(BuildContext context, MetroLine line, Stop stop) {
    final s = widget.net.stations[stop.station]!;
    final av = widget.planner.availability(stop.station);
    final open = av != Availability.notOpenYet;
    final sub = switch (stop.status.state) {
      StopState.notOpen => 'Listed, not open',
      StopState.closed => 'Not open yet (media-reported)',
      _ when stop.status.source == StatusSource.media => 'Reported open by the media',
      _ when s.lines.length > 1 => 'Interchange',
      _ => null,
    };
    return ListTile(
      enabled: open,
      minTileHeight: PP.tap,
      contentPadding: const EdgeInsets.symmetric(horizontal: PP.s2),
      title: Text(s.name.replaceAll(RegExp(r', Pune$'), ''), style: inter(16, 600, color: open ? PP.ink : PP.inkSoft)),
      subtitle: sub == null ? null : Text(sub, style: inter(13, 500, color: PP.inkSoft)),
      trailing: open ? const Icon(Icons.chevron_right) : null,
      onTap: open ? () => Navigator.of(context).pop(stop.station) : null,
    );
  }
}

class _Practical extends StatelessWidget {
  const _Practical({required this.net});
  final MetroNetwork net;

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;
    final maha = net.timetables['maha_metro'] as Map<String, dynamic>;
    final pink = net.timetables['line3'] as Map<String, dynamic>;
    final ops = net.operators;
    String windows(Map<String, dynamic> m) => (m['windows'] as List).join(', ');
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Semantics(header: true, child: Text('Timings and help', style: t.headlineSmall)),
      const SizedBox(height: PP.s3),
      InkCard(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Lines 1 and 2 (Maha Metro)', style: t.titleMedium),
          const SizedBox(height: PP.s1),
          Text('${maha['service_hours']}. Every ${(maha['peak'] as Map)['headway_min']} min at peak (${windows(maha['peak'] as Map<String, dynamic>)}), every ${(maha['off_peak'] as Map)['headway_min']} min otherwise.', style: t.bodyMedium),
          const SizedBox(height: PP.s1),
          Text('Helpline ${(ops['maha_metro'] as Map)['helpline']}', style: t.bodySmall),
          const SizedBox(height: PP.s4),
          Text('Line 3 (Pink)', style: t.titleMedium),
          const SizedBox(height: PP.s1),
          Text('First train ${pink['first_train']}. Last train ${pink['last_train']}. ${(pink['peak'] as Map)['headway']} at peak (${windows(pink['peak'] as Map<String, dynamic>)}).', style: t.bodyMedium),
          const SizedBox(height: PP.s1),
          Text('Helpline ${(ops['pitcmrl'] as Map)['helpline']}. ${pink['note'] ?? ''}', style: t.bodySmall),
        ]),
      ),
      const SizedBox(height: PP.s4),
      SourcesBlock(
        sources: [
          SourceLink(url: net.provenance['mahametro_fare_chart_page'] as String, label: 'Maha Metro fare chart'),
          SourceLink(url: net.provenance['mahametro_timetable_page'] as String, label: 'Maha Metro timetable'),
          SourceLink(url: net.provenance['mahametro_project_profile'] as String, label: 'Maha Metro project profile'),
          SourceLink(url: net.provenance['line3_station_list'] as String, label: 'Line 3 station list'),
          SourceLink(url: net.provenance['line3_fare_table_page'] as String, label: 'Line 3 fare table'),
          SourceLink(url: net.provenance['line3_timetable_page'] as String, label: 'Line 3 timetable'),
        ],
        checkedAt: DateTime.parse(net.verifiedOn),
        provenance: 'Fares, timetables and contacts were read from the operator pages. Line 3 station status comes from media reports; disputed fare pairs are never shown as a fare.',
      ),
    ]);
  }
}
