// Data model for the PunePedia library. Content is authored as JSON in
// content/ and compiled to assets/content/library.json by tools/content.py.
// Screens only read these classes; they never contain content themselves.

/// Reads authored text. Content files store text as {"en": "..."}; the
/// library is English-only. Missing or blank text reads as ''.
String _text(Object? json) {
  final v = json is Map<String, dynamic> ? json['en'] : null;
  return (v is String && v.trim().isNotEmpty) ? v : '';
}

enum EntryStatus { verified, disputed, researchLead }

EntryStatus _status(String? s) => switch (s) {
      'verified' => EntryStatus.verified,
      'disputed' => EntryStatus.disputed,
      _ => EntryStatus.researchLead,
    };

enum SegmentKind { evidence, tradition, disputed, context, note }

SegmentKind _kind(String? s) => switch (s) {
      'evidence' => SegmentKind.evidence,
      'tradition' => SegmentKind.tradition,
      'disputed' => SegmentKind.disputed,
      'context' => SegmentKind.context,
      _ => SegmentKind.note,
    };

class Cite {
  const Cite({required this.sourceId, this.pages});
  final String sourceId;
  final String? pages;

  factory Cite.fromJson(Map<String, dynamic> j) =>
      Cite(sourceId: j['source'] as String, pages: j['pages'] as String?);
}

class Segment {
  const Segment({required this.kind, required this.text, required this.cites});
  final SegmentKind kind;
  final String text;
  final List<Cite> cites;

  factory Segment.fromJson(Map<String, dynamic> j) => Segment(
        kind: _kind(j['kind'] as String?),
        text: j['text'] as String? ?? '',
        cites: ((j['cites'] as List?) ?? const [])
            .map((c) => Cite.fromJson(c as Map<String, dynamic>))
            .toList(),
      );
}

enum DatePrecision { day, month, year, decade, century }

class EntryDate {
  const EntryDate({
    required this.start,
    this.end,
    required this.precision,
    required this.label,
  });

  final String start;
  final String? end;
  final DatePrecision precision;
  /// Authored label, e.g. "Built 1730–1732"; may be empty.
  final String label;

  factory EntryDate.fromJson(Map<String, dynamic> j) => EntryDate(
        start: j['start'] as String,
        end: j['end'] as String?,
        precision: switch (j['precision']) {
          'day' => DatePrecision.day,
          'month' => DatePrecision.month,
          'decade' => DatePrecision.decade,
          'century' => DatePrecision.century,
          _ => DatePrecision.year,
        },
        label: _text(j['label']),
      );

  /// Sortable key, e.g. "1730-01-10" -> 17300110, "1630" -> 16300000.
  int get sortKey {
    final parts = start.split('-');
    final y = int.tryParse(parts[0]) ?? 0;
    final m = parts.length > 1 ? int.tryParse(parts[1]) ?? 0 : 0;
    final d = parts.length > 2 ? int.tryParse(parts[2]) ?? 0 : 0;
    return y * 10000 + m * 100 + d;
  }

  int get startYear => int.tryParse(start.split('-').first) ?? 0;
}

enum LocationStatus { sourced, verified }

class GeoLocation {
  const GeoLocation({
    required this.lat,
    required this.lng,
    required this.status,
    required this.sourceId,
    this.note,
  });

  final double lat;
  final double lng;
  final LocationStatus status;
  final String sourceId;
  final String? note;

  factory GeoLocation.fromJson(Map<String, dynamic> j) => GeoLocation(
        lat: (j['lat'] as num).toDouble(),
        lng: (j['lng'] as num).toDouble(),
        status: j['status'] == 'verified'
            ? LocationStatus.verified
            : LocationStatus.sourced,
        sourceId: j['source'] as String,
        note: j['note'] as String?,
      );
}

class MediaItem {
  const MediaItem({
    this.asset,
    this.placeholder,
    required this.caption,
    required this.credit,
    required this.license,
    this.sourceUrl,
  });

  final String? asset;
  final String? placeholder;
  final String caption;
  final String credit;
  final String license;
  final String? sourceUrl;

  factory MediaItem.fromJson(Map<String, dynamic> j) => MediaItem(
        asset: j['asset'] as String?,
        placeholder: j['placeholder'] as String?,
        caption: _text(j['caption']),
        credit: j['credit'] as String? ?? '',
        license: j['license'] as String? ?? '',
        sourceUrl: j['sourceUrl'] as String?,
      );
}

enum ReviewState { draft, reviewed, fixture }

class Review {
  const Review({
    required this.state,
    this.draftedOn,
    this.draftedWith,
    this.lastReviewed,
    this.reviewer,
  });

  final ReviewState state;
  final String? draftedOn;
  final String? draftedWith;
  final String? lastReviewed;
  final String? reviewer;

  factory Review.fromJson(Map<String, dynamic>? j) {
    j ??= const {};
    return Review(
      state: switch (j['state']) {
        'reviewed' => ReviewState.reviewed,
        'fixture' => ReviewState.fixture,
        _ => ReviewState.draft,
      },
      draftedOn: j['draftedOn'] as String?,
      draftedWith: j['draftedWith'] as String?,
      lastReviewed: j['lastReviewed'] as String?,
      reviewer: j['reviewer'] as String?,
    );
  }
}

class Entry {
  const Entry({
    required this.id,
    required this.type,
    required this.categories,
    required this.status,
    required this.era,
    required this.onTimeline,
    required this.date,
    required this.title,
    required this.summary,
    required this.body,
    required this.location,
    required this.locationNote,
    required this.media,
    required this.related,
    required this.review,
    required this.featured,
    required this.isFixture,
    this.freeSample = false,
  });

  final String id;
  final String type;
  final List<String> categories;
  final EntryStatus status;
  final String? era;
  final bool onTimeline;
  final EntryDate? date;
  final String title;
  final String summary;
  final List<Segment> body;
  final GeoLocation? location;

  /// Why a place has no map location yet; may be empty.
  final String locationNote;
  final List<MediaItem> media;
  final List<String> related;
  final Review review;
  final bool featured;
  final bool isFixture;

  /// Readable in full without the unlock.
  final bool freeSample;

  bool get isPublic => status != EntryStatus.researchLead;
  bool get isPlace => type == 'place' || categories.contains('place');

  Iterable<Cite> get allCites sync* {
    for (final s in body) {
      yield* s.cites;
    }
  }

  factory Entry.fromJson(Map<String, dynamic> j) {
    final body = (j['body'] as Map<String, dynamic>?) ?? const {};
    List<Segment>? seg(Object? list) => list is List
        ? list.map((s) => Segment.fromJson(s as Map<String, dynamic>)).toList()
        : null;
    return Entry(
      id: j['id'] as String,
      type: j['type'] as String? ?? 'event',
      categories: ((j['categories'] as List?) ?? const []).cast<String>(),
      status: _status(j['status'] as String?),
      era: j['era'] as String?,
      onTimeline: j['timeline'] == true,
      date: j['date'] == null
          ? null
          : EntryDate.fromJson(j['date'] as Map<String, dynamic>),
      title: _text(j['title']),
      summary: _text(j['summary']),
      body: seg(body['en']) ?? const [],
      location: j['location'] == null
          ? null
          : GeoLocation.fromJson(j['location'] as Map<String, dynamic>),
      locationNote: _text(j['locationNote']),
      media: ((j['media'] as List?) ?? const [])
          .map((m) => MediaItem.fromJson(m as Map<String, dynamic>))
          .toList(),
      related: ((j['related'] as List?) ?? const []).cast<String>(),
      review: Review.fromJson(j['review'] as Map<String, dynamic>?),
      featured: j['featured'] == true,
      isFixture: j['fixture'] == true,
      freeSample: j['freeSample'] == true,
    );
  }
}

class Source {
  const Source({
    required this.id,
    required this.kind,
    required this.title,
    required this.author,
    required this.publisher,
    required this.year,
    required this.url,
    required this.accessed,
    required this.consulted,
    required this.reliability,
    this.citedVia,
    this.role,
  });

  final String id;
  final String kind;
  final String title;
  final String author;
  final String publisher;
  final String year;
  final String url;
  final String accessed;
  final bool consulted;
  final String reliability;
  final String? citedVia;
  final String? role;

  factory Source.fromJson(Map<String, dynamic> j) => Source(
        id: j['id'] as String,
        kind: j['kind'] as String? ?? 'reference',
        title: j['title'] as String? ?? '',
        author: j['author'] as String? ?? '',
        publisher: j['publisher'] as String? ?? '',
        year: j['year'] as String? ?? '',
        url: j['url'] as String? ?? '',
        accessed: j['accessed'] as String? ?? '',
        consulted: j['consulted'] == true,
        reliability: j['reliability'] as String? ?? '',
        citedVia: j['citedVia'] as String?,
        role: j['role'] as String?,
      );

  /// A plain bibliographic line, e.g. "Author. Title. Publisher, Year."
  String get citation => [
        if (author.isNotEmpty) author,
        title,
        [publisher, year].where((s) => s.isNotEmpty).join(', '),
      ].where((s) => s.isNotEmpty).join('. ');
}

class Era {
  const Era({required this.id, required this.order, required this.label, required this.range});
  final String id;
  final int order;
  final String label;
  final String range;

  factory Era.fromJson(Map<String, dynamic> j) => Era(
        id: j['id'] as String,
        order: j['order'] as int? ?? 0,
        label: _text(j['label']),
        range: _text(j['range']),
      );
}

class Category {
  const Category({required this.id, required this.icon, required this.label});
  final String id;
  final String icon;
  final String label;

  factory Category.fromJson(Map<String, dynamic> j) => Category(
        id: j['id'] as String,
        icon: j['icon'] as String? ?? '',
        label: _text(j['label']),
      );
}

class Collection {
  const Collection({required this.id, required this.title, required this.blurb, required this.entryIds});
  final String id;
  final String title;
  final String blurb;
  final List<String> entryIds;

  factory Collection.fromJson(Map<String, dynamic> j) => Collection(
        id: j['id'] as String,
        title: _text(j['title']),
        blurb: _text(j['blurb']),
        entryIds: ((j['entries'] as List?) ?? const []).cast<String>(),
      );
}

class Library {
  Library({
    required this.contentVersion,
    required this.contentDate,
    required this.eras,
    required this.categories,
    required this.collections,
    required this.sources,
    required this.entries,
  })  : _byId = {for (final e in entries) e.id: e},
        _sourceById = {for (final s in sources) s.id: s};

  final String contentVersion;
  final String contentDate;
  final List<Era> eras;
  final List<Category> categories;
  final List<Collection> collections;
  final List<Source> sources;
  final List<Entry> entries;
  final Map<String, Entry> _byId;
  final Map<String, Source> _sourceById;

  Entry? entry(String id) => _byId[id];
  Source? source(String id) => _sourceById[id];
  Era? era(String? id) => id == null ? null : eras.where((e) => e.id == id).firstOrNull;
  Category? category(String id) => categories.where((c) => c.id == id).firstOrNull;

  bool get hasFixtures => entries.any((e) => e.isFixture);

  factory Library.fromJson(Map<String, dynamic> j, {List<dynamic> fixtures = const []}) {
    final entries = [
      ...((j['entries'] as List?) ?? const [])
          .map((e) => Entry.fromJson(e as Map<String, dynamic>)),
      ...fixtures.map((e) => Entry.fromJson(e as Map<String, dynamic>)),
    ];
    return Library(
      contentVersion: j['contentVersion'] as String? ?? '',
      contentDate: j['contentDate'] as String? ?? '',
      eras: ((j['eras'] as List?) ?? const [])
          .map((e) => Era.fromJson(e as Map<String, dynamic>))
          .toList()
        ..sort((a, b) => a.order.compareTo(b.order)),
      categories: ((j['categories'] as List?) ?? const [])
          .map((e) => Category.fromJson(e as Map<String, dynamic>))
          .toList(),
      collections: ((j['collections'] as List?) ?? const [])
          .map((e) => Collection.fromJson(e as Map<String, dynamic>))
          .toList(),
      sources: ((j['sources'] as List?) ?? const [])
          .map((e) => Source.fromJson(e as Map<String, dynamic>))
          .toList(),
      entries: entries,
    );
  }
}
