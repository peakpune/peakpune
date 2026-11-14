import 'dart:convert';
import 'dart:io';

import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:peakpune/data/honesty.dart';
import 'package:peakpune/data/library.dart';
import 'package:peakpune/data/models.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  late Library lib;
  setUpAll(() async => lib = await Library.load(rootBundle));

  group('publication audit (public/lib/publication.js)', () {
    test('only rows marked publish appear', () {
      expect(lib.places.length, 28);
      expect(lib.outdoors.length, 28);
      expect(lib.events.length, 9);
      expect(lib.meetups.length, 7);
      expect(lib.events.any((e) => e.id == 'event-karawaan-geminid-experience-2026-12-12'), isFalse);
      expect(lib.meetups.any((m) => m.id == 'meetup-pythonpune'), isFalse);
    });

    test('overrides apply and checked_at is the audit date', () {
      final joshi = lib.place('place-joshis-museum-of-miniature-railways')!;
      expect(joshi.priceNote, startsWith('Rs. 120 per head above 3 years'));
      expect(lib.places.every((p) => p.checkedAt == lib.auditCheckedAt), isTrue);
    });

    test('unknown ids stay unpublished', () {
      final rows = <Map<String, dynamic>>[{'id': 'not-in-audit', 'checked_at': '2026-01-01'}];
      expect(publishAudited(rows, {'checked_at': '2026-11-13', 'records': {}}), isEmpty);
    });

    test('bundled data matches ../data (run tool/sync_data.sh after editing data)', () {
      const map = {
        'publication-audit.json': '../data/publication-audit.json',
        'places.json': '../data/batch-1-places/places.json',
        'outdoors.json': '../data/batch-2-outdoors/outdoors.json',
        'events.json': '../data/batch-3-events/events.json',
        'meetups.json': '../data/batch-4-meetups/meetups.json',
        'metro.json': '../data/metro/metro.json',
        'areas.json': '../data/metro/areas.json',
      };
      map.forEach((asset, src) {
        expect(File('assets/data/$asset').readAsStringSync(), File(src).readAsStringSync(), reason: '$asset is stale');
      });
    });
  });

  group('honesty rules', () {
    test('an unknown price is never Free', () {
      expect(priceText(null), 'Price not confirmed');
      expect(priceText('UNKNOWN'), 'Price not confirmed');
      expect(costText(null), 'Cost not confirmed');
      expect(priceText('Rs. 140'), 'Rs. 140');
    });

    test('entries checked over 90 days ago need a re-check', () {
      final checked = DateTime.utc(2026, 11, 13);
      expect(needsRecheck(checked, DateTime.utc(2027, 2, 11, 6)), isFalse); // day 90
      expect(needsRecheck(checked, DateTime.utc(2027, 2, 12, 6)), isTrue); // day 91
    });

    test('expired listings hide; recurring ones stay', () {
      final now = DateTime.parse('2026-11-16T09:00:00+05:30');
      final live = currentEvents(lib.events, now);
      expect(live.any((e) => e.id == 'event-cme-soldierathon-pune-2026-11-15'), isFalse);
      expect(live.any((e) => e.id == 'event-karawaan-kamshet-paragliding-2026-11-21'), isTrue);
      expect(live.where((e) => e.isRecurring).length, 3);
      expect(live.last.isRecurring, isTrue);
    });

    test('this weekend runs from today to Sunday in Pune', () {
      final sat = DateTime.parse('2026-11-14T08:00:00+05:30');
      final ids = thisWeekend(lib.events, sat).map((e) => e.id).toSet();
      expect(ids, containsAll(['event-cme-soldierathon-pune-2026-11-15', 'event-doolally-childrens-day-little-hands-2026-11-14']));
      expect(ids.contains('event-karawaan-kamshet-paragliding-2026-11-21'), isFalse);
    });

    test('calendar entries follow scripts/calendar.mjs: no invented times', () {
      EventListing ev(Map<String, Object?> extra) => EventListing({
            'id': 'x', 'name': 'Run', 'checked_at': '2026-11-13', 'status': 'verified', ...extra,
          });
      final timed = calendarSlot(ev({'start_date': '2026-11-14', 'start': '2026-11-14T11:00:00+05:30'}))!;
      expect(timed.timed, isTrue);
      expect(timed.start, DateTime.utc(2026, 11, 14, 5, 30));
      expect(timed.hasStatedEnd, isFalse);
      final allDay = calendarSlot(ev({'start_date': '2026-11-30'}))!;
      expect((allDay.timed, allDay.start, allDay.end), (false, DateTime.utc(2026, 11, 30), DateTime.utc(2026, 12, 1)));
      final multi = calendarSlot(ev({'start_date': '2026-12-12', 'end': '2026-12-13T23:59:00+05:30'}))!;
      expect(multi.end, DateTime.utc(2026, 12, 14));
      expect(calendarSlot(ev({'recurrence': 'Daily'})), isNull);
    });

    test('dates read the way the site writes them', () {
      expect(longDateIso('2026-11-13'), '13 November 2026');
      expect(eventDay('2026-11-14'), 'Sat 14 Nov 2026');
      expect(puneTime(DateTime.parse('2026-11-14T16:00:00+05:30')), '4:00 PM');
    });
  });

  group('history and shopping (schema from the brief)', () {
    test('entries without sources never ship; both source shapes parse', () {
      final h = parseHistory(jsonDecode('''[
        {"id":"a","era":"Peshwa","year":1730,"date_label":"1730","title_en":"Shaniwar Wada founded","title_mr":"शनिवारवाड्याची पायाभरणी","summary_en":"s","summary_mr":"स","sources":[{"label":"Gazetteer","url":"https://example.org/g"}],"checked_at":"2026-11-14"},
        {"id":"b","era":"Peshwa","year":1731,"title_en":"No source","summary_en":"s","sources":[],"checked_at":"2026-11-14"},
        {"id":"c","era":"British","year":1885,"title_en":"Plain URL source","summary_en":"s","sources":["https://example.org/p"],"checked_at":"2026-11-14"}
      ]'''));
      expect(h.map((e) => e.id), ['a', 'c']);
      expect(h.first.sources.single.title, 'Gazetteer');
      expect(h.last.sources.single.title, 'example.org');
    });

    test('shops keep since only when given; sourceless rows are dropped', () {
      final (areas, shops) = parseShopping(jsonDecode('''{
        "areas":[{"id":"tulshibaug","name":"Tulshibaug","area":"Budhwar Peth","known_for":["utensils","fabric"],"best_for":"household shopping","notes":null,"sources":["https://example.org/t"]},
                 {"id":"x","name":"No source","sources":[]}],
        "shops":[{"id":"s1","name":"Old Shop","area":"Laxmi Road","known_for":"sarees","since":1925,"note":null,"sources":[{"label":"Site","url":"https://example.org/s"}],"checked_at":"2026-11-14"},
                 {"id":"s2","name":"New Shop","area":"Camp","known_for":"shoes","note":null,"sources":["https://example.org/n"],"checked_at":"2026-11-14"}]
      }'''));
      expect(areas.map((a) => a.id), ['tulshibaug']);
      expect(areas.single.knownFor, 'utensils, fabric');
      expect(shops.first.since, 1925);
      expect(shops.last.since, isNull);
    });

    test('the bundled library loads without history or shopping files', () {
      expect(lib.historyLoaded, File('assets/data/history.json').existsSync());
      expect(lib.shoppingLoaded, File('assets/data/shopping.json').existsSync());
    });
  });
}
