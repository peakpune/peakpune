// Typed models for the bundled data. Field names follow the JSON in ../data exactly.
// Screens read these classes; they never contain content themselves.

/// 'UNKNOWN', empty strings and null all mean "not known".
String? known(Object? v) {
  if (v is! String) return null;
  final s = v.trim();
  return s.isEmpty || s == 'UNKNOWN' ? null : s;
}

double? _num(Object? v) => v is num ? v.toDouble() : null;
List<String> _strings(Object? v) => v is List ? v.whereType<String>().toList() : const [];

/// A cited source. The places/outdoors/events/meetups files store plain URLs;
/// history and shopping use {label, url}. Both are accepted.
class SourceLink {
  const SourceLink({required this.url, this.label});
  final String url;
  final String? label;

  /// Readable name: the label, else the host name.
  String get title => label ?? (Uri.tryParse(url)?.host.replaceFirst('www.', '') ?? url);

  static List<SourceLink> list(Object? v) {
    if (v is! List) return const [];
    return [
      for (final s in v)
        if (s is String && s.trim().isNotEmpty)
          SourceLink(url: s.trim())
        else if (s is Map && known(s['url']) != null)
          SourceLink(url: known(s['url'])!, label: known(s['label']))
    ];
  }
}

enum Verification { verified, partial, unverified }

Verification _verification(Object? v) => switch (v) {
      'verified' => Verification.verified,
      'partial' => Verification.partial,
      _ => Verification.unverified,
    };

/// Fields shared by places, outdoors, events and meetups.
abstract class Listing {
  Listing(Map<String, dynamic> j)
      : id = j['id'] as String,
        name = (j['name'] as String? ?? '').trim(),
        type = j['type'] as String? ?? '',
        tags = _strings(j['tags']),
        scope = j['scope'] as String? ?? '',
        neighbourhood = known(j['neighbourhood']),
        address = known(j['address']),
        lat = _num(j['lat']),
        lon = _num(j['lon']),
        urlOfficial = known(j['url_official']),
        urlDeep = known(j['url_deep']),
        summary = (j['summary'] as String? ?? '').trim(),
        status = _verification(j['status']),
        sources = SourceLink.list(j['sources']),
        checkedAt = DateTime.parse(j['checked_at'] as String),
        sourceStale = j['stale_over_90_days'] == true,
        notes = known(j['notes']);

  final String id;
  final String name;
  final String type;
  final List<String> tags;
  final String scope;
  final String? neighbourhood;
  final String? address;
  final double? lat;
  final double? lon;
  final String? urlOfficial;
  final String? urlDeep;
  final String summary;
  final Verification status;
  final List<SourceLink> sources;

  /// When Peak Pune last checked the listing against its sources.
  final DateTime checkedAt;

  /// The source itself says it is more than 90 days old (`stale_over_90_days`).
  final bool sourceStale;
  final String? notes;

  bool get hasCoordinates => lat != null && lon != null;

  /// The page on peakpune.com for this listing.
  String get webUrl;
}

class Place extends Listing {
  Place(super.j)
      : hours = known(j['hours']),
        priceNote = known(j['price_note']),
        goodFor = _strings(j['good_for']);

  final String? hours;
  final String? priceNote;
  final List<String> goodFor;

  @override
  String get webUrl => 'https://peakpune.com/places/${id.replaceFirst(RegExp(r'^place-'), '')}/';
}

class Outdoor extends Listing {
  Outdoor(super.j)
      : distanceKm = _num(j['distance_km']),
        difficulty = known(j['difficulty']),
        litAtNight = known(j['lit_at_night']),
        distanceFromPuneKm = _num(j['distance_from_pune_km']),
        travelTimeText = known(j['travel_time_text']),
        trekTimeText = known(j['trek_time_text']),
        startPoint = known(j['start_point']),
        bestMonths = known(j['best_months']);

  final double? distanceKm;
  final String? difficulty;

  /// "no" or null (the source did not check lighting).
  final String? litAtNight;
  final double? distanceFromPuneKm;
  final String? travelTimeText;
  final String? trekTimeText;
  final String? startPoint;
  final String? bestMonths;

  bool get isTrek => type == 'trek';
  bool get isRun => type == 'run-route';

  @override
  String get webUrl => 'https://peakpune.com/outdoors/${id.replaceFirst(RegExp(r'^run-(trek-)?'), '')}/';
}

class EventListing extends Listing {
  EventListing(super.j)
      : start = _instant(j['start']),
        end = _instant(j['end']),
        startDate = known(j['start_date']),
        endRaw = known(j['end']),
        recurrence = known(j['recurrence']),
        ticketUrl = known(j['ticket_url']),
        eventStatus = known(j['event_status']),
        expiresAt = _instant(j['expires_at']),
        organiser = known(j['organiser']),
        priceNote = known(j['price_note']),
        linkedId = known(j['linked_id']);

  /// Exact start, only when the source gives a time.
  final DateTime? start;
  final DateTime? end;

  /// YYYY-MM-DD; null for recurring listings.
  final String? startDate;

  /// The raw `end` string (its date part is used for all-day spans).
  final String? endRaw;
  final String? recurrence;
  final String? ticketUrl;
  final String? eventStatus;
  final DateTime? expiresAt;
  final String? organiser;
  final String? priceNote;
  final String? linkedId;

  bool get isRecurring => startDate == null;

  static DateTime? _instant(Object? v) => known(v) == null ? null : DateTime.tryParse(v as String);

  @override
  String get webUrl => 'https://peakpune.com/events/';
}

enum Activity { active, dormant, unknown }

class Meetup extends Listing {
  Meetup(super.j)
      : scheduleText = known(j['schedule_text']),
        joinUrl = known(j['join_url']),
        lastPublicActivity = known(j['last_public_activity']),
        activity = switch (j['activity_state']) {
          'active' => Activity.active,
          'DORMANT' => Activity.dormant,
          _ => Activity.unknown,
        },
        costNote = known(j['cost_note']),
        linkedId = known(j['linked_id']);

  final String? scheduleText;
  final String? joinUrl;
  final String? lastPublicActivity;
  final Activity activity;
  final String? costNote;
  final String? linkedId;

  @override
  String get webUrl => 'https://peakpune.com/meetups/';
}

/// history.json: [{ id, era, year, date_label, title_en, title_mr, summary_en, summary_mr, sources: [{label, url}], checked_at }]
class HistoryEntry {
  HistoryEntry(Map<String, dynamic> j)
      : id = j['id'] as String,
        era = (known(j['era']) ?? 'Undated'),
        year = j['year'] is num ? (j['year'] as num).toInt() : int.tryParse('${j['year']}'),
        dateLabel = known(j['date_label']),
        titleEn = known(j['title_en']) ?? '',
        titleMr = known(j['title_mr']),
        summaryEn = known(j['summary_en']) ?? '',
        summaryMr = known(j['summary_mr']),
        sources = SourceLink.list(j['sources']),
        checkedAt = DateTime.parse(j['checked_at'] as String);

  final String id;
  final String era;
  final int? year;
  final String? dateLabel;
  final String titleEn;
  final String? titleMr;
  final String summaryEn;
  final String? summaryMr;
  final List<SourceLink> sources;
  final DateTime checkedAt;
}

/// shopping.json areas: { id, name, area, known_for, best_for, notes, sources }
class ShoppingArea {
  ShoppingArea(Map<String, dynamic> j, {required this.checkedAt})
      : id = j['id'] as String,
        name = known(j['name']) ?? '',
        area = known(j['area']),
        knownFor = _textOrList(j['known_for']),
        bestFor = _textOrList(j['best_for']),
        notes = known(j['notes']),
        sources = SourceLink.list(j['sources']);

  final String id;
  final String name;
  final String? area;
  final String? knownFor;
  final String? bestFor;
  final String? notes;
  final List<SourceLink> sources;

  /// Areas carry no checked_at in the schema; the newest shop check date (or null) is used.
  final DateTime? checkedAt;
}

/// shopping.json shops: { id, name, area, known_for, since, note, sources, checked_at }
class Shop {
  Shop(Map<String, dynamic> j)
      : id = j['id'] as String,
        name = known(j['name']) ?? '',
        area = known(j['area']),
        knownFor = _textOrList(j['known_for']),
        since = j['since'] is num ? (j['since'] as num).toInt() : int.tryParse('${j['since'] ?? ''}'),
        note = known(j['note']),
        sources = SourceLink.list(j['sources']),
        checkedAt = DateTime.parse(j['checked_at'] as String);

  final String id;
  final String name;
  final String? area;
  final String? knownFor;

  /// A verified founding year, only where the source gives one.
  final int? since;
  final String? note;
  final List<SourceLink> sources;
  final DateTime checkedAt;
}

String? _textOrList(Object? v) => v is List ? (v.whereType<String>().isEmpty ? null : v.whereType<String>().join(', ')) : known(v);
