// Dart port of metro/src/peakpune_metro/planner.gleam. Route and fare logic only:
// no station, interchange, fare or status is mentioned by name here, and nothing
// needs a network connection.
import 'network.dart';

/// Whether a station may be chosen for boarding or getting off.
/// [available]: some line lists it open and the operator confirmed that.
/// [reportedOpen]: listed open only by media reports. Selectable, and labelled.
/// [notOpenYet]: not open on any line (including listed-but-not-open stations).
enum Availability { available, reportedOpen, notOpenYet }

sealed class PlanError {
  const PlanError();
}

class SameStation extends PlanError {
  const SameStation();
}

class NotSelectable extends PlanError {
  const NotSelectable(this.station, this.why);
  final String station;
  final Availability why;
}

class NoRoute extends PlanError {
  const NoRoute();
}

class Leg {
  const Leg({required this.line, required this.lineName, required this.operator, required this.from, required this.to, required this.toward, required this.stops});
  final String line;
  final String lineName;
  final MetroOperator operator;
  final String from;
  final String to;

  /// The terminus the train is heading towards.
  final String toward;

  /// Open stops passed, counting the one you get off at.
  final int stops;
}

enum ChartReason {
  /// The operator's own chart prints different fares for the two directions.
  disputed,

  /// The saved fare table has no entry for this pair.
  missing,
}

sealed class FareResult {
  const FareResult();
}

class ExactFare extends FareResult {
  const ExactFare(this.rupees);
  final int rupees;
}

class CheckChart extends FareResult {
  const CheckChart(this.why);
  final ChartReason why;
}

/// One ticket covers consecutive legs on the same fare system. Fares from
/// different systems are never added up.
class Ticket {
  const Ticket({required this.system, required this.from, required this.to, required this.legs, required this.fare});
  final FareSystem system;
  final String from;
  final String to;
  final List<Leg> legs;
  final FareResult fare;
}

class MetroRoute {
  const MetroRoute({required this.legs, required this.changes, required this.tickets});
  final List<Leg> legs;
  final List<String> changes;
  final List<Ticket> tickets;
}

/// Either a route or the reason there is none.
class PlanResult {
  const PlanResult.ok(MetroRoute this.route) : error = null;
  const PlanResult.err(PlanError this.error) : route = null;
  final MetroRoute? route;
  final PlanError? error;
}

class Planner {
  const Planner(this.network);
  final MetroNetwork network;

  // ---------- availability ----------

  Iterable<Stop> _stopsOf(String station) => network.lines.expand((l) => l.stops.where((s) => s.station == station));

  static bool usable(Stop s) => s.status.state == StopState.open;
  static bool _confirmed(Stop s) => s.status.state == StopState.open && s.status.verified;

  Availability availability(String station) {
    final stops = _stopsOf(station).toList();
    if (stops.any(_confirmed)) return Availability.available;
    if (stops.any(usable)) return Availability.reportedOpen;
    return Availability.notOpenYet;
  }

  bool selectable(String station) => availability(station) != Availability.notOpenYet;

  /// Stations that appear on more than one line, derived from the line data.
  List<String> interchanges() {
    final all = network.lines.expand((l) => l.stops.map((s) => s.station)).toList();
    return all.toSet().where((id) => all.where((o) => o == id).length > 1).toList();
  }

  // ---------- routing ----------

  bool _usableOn(MetroLine line, String station) => line.stops.any((s) => s.station == station && usable(s));

  int? _position(MetroLine line, String station) {
    final i = line.stops.indexWhere((s) => s.station == station);
    return i < 0 ? null : i;
  }

  Leg? _makeLeg(MetroLine line, String from, String to) {
    final a = _position(line, from), b = _position(line, to);
    if (a == null || b == null) return null;
    final low = a < b ? a : b, high = a < b ? b : a;
    final passed = line.stops.skip(low + 1).take(high - low);
    return Leg(
      line: line.id,
      lineName: line.name,
      operator: line.operator,
      from: from,
      to: to,
      toward: b > a ? line.lastTerminus : line.firstTerminus,
      stops: passed.where((s) => s.status.state == StopState.open).length,
    );
  }

  bool _usableOnUnusedLine(List<String> used, String station) =>
      network.lines.any((l) => !used.contains(l.id) && _usableOn(l, station));

  /// All leg sequences from [from] to [to], each line used at most once, at most [depth] changes.
  List<List<Leg>> _search(String from, String to, List<String> used, int depth) {
    final out = <List<Leg>>[];
    for (final line in network.lines) {
      if (used.contains(line.id) || !_usableOn(line, from)) continue;
      if (_usableOn(line, to)) {
        final leg = _makeLeg(line, from, to);
        if (leg != null) out.add([leg]);
      } else if (depth > 0) {
        final usedNow = [line.id, ...used];
        final changeStops = line.stops.where((s) => usable(s) && s.station != from && _usableOnUnusedLine(usedNow, s.station));
        for (final stop in changeStops) {
          final leg = _makeLeg(line, from, stop.station);
          if (leg == null) continue;
          for (final rest in _search(stop.station, to, usedNow, depth - 1)) {
            out.add([leg, ...rest]);
          }
        }
      }
    }
    return out;
  }

  static int _totalStops(List<Leg> legs) => legs.fold(0, (s, l) => s + l.stops);

  /// Fewest legs first, then fewest stops. Stable, as Gleam's list.sort.
  static List<Leg>? _best(List<List<Leg>> candidates) {
    if (candidates.isEmpty) return null;
    final indexed = candidates.indexed.toList()
      ..sort((x, y) {
        final c = x.$2.length.compareTo(y.$2.length);
        if (c != 0) return c;
        final d = _totalStops(x.$2).compareTo(_totalStops(y.$2));
        return d != 0 ? d : x.$1.compareTo(y.$1);
      });
    return indexed.first.$2;
  }

  // ---------- fares ----------

  static FareSystem systemOf(MetroOperator op) => op == MetroOperator.mahaMetro ? FareSystem.maha : FareSystem.pink;

  bool _isDisputed(String a, String b) => network.disputed.any((p) => (p.a == a && p.b == b) || (p.a == b && p.b == a));

  /// An exact fare only when the saved table has the pair and the operator's chart
  /// does not contradict itself. Never interpolates, averages or guesses.
  FareResult lookupFare(FareSystem system, String a, String b) {
    if (system == FareSystem.maha && _isDisputed(a, b)) return const CheckChart(ChartReason.disputed);
    final table = system == FareSystem.maha ? network.mahaFares : network.pinkFares;
    final i = table.order.indexOf(a), j = table.order.indexOf(b);
    if (i < 0 || j < 0 || i >= table.rows.length || j >= table.rows[i].length) return const CheckChart(ChartReason.missing);
    final v = table.rows[i][j];
    return v > 0 ? ExactFare(v) : const CheckChart(ChartReason.missing);
  }

  List<Ticket> _ticketsFor(List<Leg> legs) {
    final groups = <List<Leg>>[];
    for (final leg in legs) {
      if (groups.isNotEmpty && systemOf(groups.last.first.operator) == systemOf(leg.operator)) {
        groups.last.add(leg);
      } else {
        groups.add([leg]);
      }
    }
    return [
      for (final g in groups)
        Ticket(system: systemOf(g.first.operator), from: g.first.from, to: g.last.to, legs: g, fare: lookupFare(systemOf(g.first.operator), g.first.from, g.last.to))
    ];
  }

  // ---------- the planner ----------

  PlanResult plan(String from, String to) {
    if (from == to) return const PlanResult.err(SameStation());
    if (availability(from) == Availability.notOpenYet) return PlanResult.err(NotSelectable(from, Availability.notOpenYet));
    if (availability(to) == Availability.notOpenYet) return PlanResult.err(NotSelectable(to, Availability.notOpenYet));
    final legs = _best(_search(from, to, const [], 2));
    if (legs == null) return const PlanResult.err(NoRoute());
    return PlanResult.ok(MetroRoute(
      legs: legs,
      changes: legs.take(legs.length - 1).map((l) => l.to).toList(),
      tickets: _ticketsFor(legs),
    ));
  }
}
