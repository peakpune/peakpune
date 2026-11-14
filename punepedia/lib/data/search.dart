import 'models.dart';
import 'queries.dart';

/// Small in-memory search over titles, summaries, body text and source
/// titles. The library is small enough that a
/// linear scan is instant; swap in an index if it grows into thousands.
class SearchIndex {
  SearchIndex(this.library)
      : _docs = [for (final e in library.entries) _Doc.from(e, library)];

  final Library library;
  final List<_Doc> _docs;

  /// Lowercases text, strips common diacritics, and collapses spaces.
  static String normalize(String s) {
    const map = {
      'ā': 'a', 'á': 'a', 'à': 'a', 'ī': 'i', 'í': 'i', 'ū': 'u', 'ú': 'u',
      'ē': 'e', 'é': 'e', 'ō': 'o', 'ó': 'o', 'ṭ': 't', 'ḍ': 'd', 'ṇ': 'n',
      'ṣ': 's', 'ś': 's', 'ṛ': 'r', 'ḥ': 'h', 'ṃ': 'm', 'ñ': 'n', '’': "'",
    };
    final lower = s.toLowerCase();
    final buf = StringBuffer();
    for (final ch in lower.split('')) {
      buf.write(map[ch] ?? ch);
    }
    return buf.toString().replaceAll(RegExp(r'\s+'), ' ').trim();
  }

  List<SearchHit> search(String query, EntryFilter filter) {
    final q = normalize(query);
    if (q.isEmpty) return const [];
    final terms = q.split(' ').where((t) => t.isNotEmpty).toList();
    final hits = <SearchHit>[];
    for (final d in _docs) {
      if (!filter.matches(d.entry)) continue;
      var score = 0;
      var allFound = true;
      for (final t in terms) {
        var s = 0;
        if (d.title.contains(t)) s += d.title.startsWith(t) ? 12 : 8;
        if (d.summary.contains(t)) s += 4;
        if (d.body.contains(t)) s += 2;
        if (d.sources.contains(t)) s += 1;
        if (s == 0) {
          allFound = false;
          break;
        }
        score += s;
      }
      if (allFound) hits.add(SearchHit(d.entry, score));
    }
    hits.sort((a, b) {
      final c = b.score.compareTo(a.score);
      return c != 0 ? c : (a.entry.title).compareTo(b.entry.title);
    });
    return hits;
  }
}

class SearchHit {
  const SearchHit(this.entry, this.score);
  final Entry entry;
  final int score;
}

class _Doc {
  _Doc(this.entry, this.title, this.summary, this.body, this.sources);

  final Entry entry;
  final String title;
  final String summary;
  final String body;
  final String sources;

  factory _Doc.from(Entry e, Library lib) {
    String n(Iterable<String?> parts) =>
        SearchIndex.normalize(parts.whereType<String>().join(' '));
    return _Doc(
      e,
      n([e.title]),
      n([e.summary]),
      n(e.body.map((s) => s.text)),
      n(e.allCites.map((c) => lib.source(c.sourceId)?.title)),
    );
  }
}
