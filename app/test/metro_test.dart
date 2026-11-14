// Ports the metro checks in tests/metro.test.js and adds planner tests (the repo's
// Gleam planner has none). Data comes straight from assets/data.
import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:peakpune/metro/network.dart';
import 'package:peakpune/metro/planner.dart';
import 'package:peakpune/metro/validator.dart';

Map<String, dynamic> _read(String f) => jsonDecode(File('assets/data/$f').readAsStringSync()) as Map<String, dynamic>;
Map<String, dynamic> _clone(Map<String, dynamic> m) => jsonDecode(jsonEncode(m)) as Map<String, dynamic>;

void main() {
  final data = _read('metro.json');
  final areas = _read('areas.json');
  final net = MetroNetwork.fromJson(data, areas);
  final planner = Planner(net);
  String id(String name) => net.stations.values.firstWhere((s) => s.names.contains(name)).id;

  group('data (from tests/metro.test.js)', () {
    test('metro datasets are self-consistent', () {
      expect(validateMetro(data, areas), isEmpty);
      expect(validateAreas(areas, data), isEmpty);
    });

    test('validator catches the mistakes it exists for', () {
      final bad = _clone(data);
      ((bad['fares'] as Map)['maha_metro'] as Map)['matrix'][3][25] = 25; // an unlisted asymmetric pair
      expect(validateMetro(bad, areas).any((e) => e.contains('asymmetric')), isTrue);

      final unknown = _clone(data);
      ((unknown['lines'] as List)[1]['station_codes'] as Map)['Ghost Station'] = 'XXX';
      expect(validateMetro(unknown, areas).any((e) => e.contains('unknown station')), isTrue);

      final media = _clone(data);
      ((media['lines'] as List)[2]['station_status'] as Map)['verified'] = true; // media can never be operator-verified
      expect(validateMetro(media, areas), isNotEmpty);

      final ext = _clone(data);
      ((ext['lines'] as List)[0]['station_order'] as List).add('Nigdi'); // approved-but-unbuilt stations never routable
      expect(validateMetro(ext, areas), isNotEmpty);
    });

    test('District Court is one station and Shivaji Nagar is two', () {
      expect([...net.stations['district-court']!.lines]..sort(), ['aqua', 'pink_line3', 'purple']);
      expect(net.stations.keys.where((k) => k.startsWith('shivaji-nagar')).length, 2);
      expect(metroSlug('R.T.O., Pune'), 'rto-pune');
    });

    test('Range Hill is listed but not open; every Line 3 status is media and unverified', () {
      expect(net.statusOn('purple', 'range-hill')!.state, StopState.notOpen);
      for (final s in net.lines.firstWhere((l) => l.id == 'pink_line3').stops) {
        expect(s.status.source, StatusSource.media);
        expect(s.status.verified, isFalse);
      }
    });

    test('the fare correction and the remaining disputed pairs are recorded', () {
      expect(((data['fares'] as Map)['maha_metro'] as Map)['corrections'][0]['now'], 30);
      expect(net.disputed.length, 11);
      expect(net.disputed.any((p) => {p.a, p.b}.containsAll({'kasarwadi', 'bund-garden'})), isFalse);
    });

    test('the Line 3 WhatsApp number is never invented', () {
      expect(net.pinkWhatsapp, isNull);
      expect(net.mahaWhatsapp, 'https://wa.me/9420101990');
    });
  });

  group('planner (port of planner.gleam)', () {
    test('same station is refused', () {
      expect(planner.plan('swargate', 'swargate').error, isA<SameStation>());
    });

    test('a one-line trip has one leg, one ticket and an exact fare from the chart', () {
      final r = planner.plan(id('PCMC'), id('Swargate')).route!;
      expect(r.legs.length, 1);
      expect(r.changes, isEmpty);
      expect(r.legs.single.toward, 'Swargate');
      expect(r.tickets.single.fare, isA<ExactFare>());
      // Range Hill (not open) is not counted as a stop.
      final order = net.lines.firstWhere((l) => l.id == 'purple').stops;
      expect(r.legs.single.stops, order.where((s) => s.status.state == StopState.open).length - 1);
    });

    test('Purple to Aqua changes at District Court on one Maha Metro ticket', () {
      final r = planner.plan(id('Swargate'), id('Vanaz')).route!;
      expect(r.legs.length, 2);
      expect(r.changes, ['district-court']);
      expect(r.tickets.length, 1);
      expect(r.tickets.single.system, FareSystem.maha);
    });

    test('a disputed pair is "check the chart", never a number, in both directions', () {
      final p = net.disputed.first;
      expect((planner.lookupFare(FareSystem.maha, p.a, p.b) as CheckChart).why, ChartReason.disputed);
      expect((planner.lookupFare(FareSystem.maha, p.b, p.a) as CheckChart).why, ChartReason.disputed);
    });

    test('Kasarwadi to Bund Garden uses the corrected fare of 30', () {
      expect((planner.lookupFare(FareSystem.maha, 'kasarwadi', 'bund-garden') as ExactFare).rupees, 30);
      expect((planner.lookupFare(FareSystem.maha, 'bund-garden', 'kasarwadi') as ExactFare).rupees, 30);
    });

    test('Range Hill and closed Line 3 stations cannot be chosen', () {
      expect(planner.availability('range-hill'), Availability.notOpenYet);
      expect(planner.plan('range-hill', 'swargate').error, isA<NotSelectable>());
      final closed = net.lines.firstWhere((l) => l.id == 'pink_line3').stops.firstWhere((s) => s.status.state == StopState.closed);
      expect(planner.selectable(closed.station), isFalse);
    });

    test('open Line 3 stations are selectable but only media-reported', () {
      expect(planner.availability(id('Maan')), Availability.reportedOpen);
      expect(planner.availability(id('Swargate')), Availability.available);
      expect(planner.availability('district-court'), Availability.available);
    });

    test('Line 3 to Maha Metro changes at District Court with separate tickets that are never added up', () {
      final r = planner.plan(id('Maan'), id('Swargate')).route!;
      expect(r.changes, ['district-court']);
      expect(r.tickets.map((t) => t.system), [FareSystem.pink, FareSystem.maha]);
      expect(r.tickets.first.fare, isA<ExactFare>());
    });

    test('the only interchange is District Court', () {
      expect(planner.interchanges(), ['district-court']);
    });

    test('every pair of selectable stations has a route', () {
      final ids = net.stations.keys.where(planner.selectable).toList();
      for (final a in ids) {
        for (final b in ids) {
          if (a != b) expect(planner.plan(a, b).route, isNotNull, reason: '$a -> $b');
        }
      }
    });
  });
}
