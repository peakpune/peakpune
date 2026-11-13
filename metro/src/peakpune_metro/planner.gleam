//// Route and fare logic. Everything here is derived from the `Network` data:
//// no station, interchange, fare or status is mentioned by name in this file.
//// Nothing in it needs a network connection.

import gleam/int
import gleam/list
import gleam/order
import gleam/result
import peakpune_metro/ids.{type LineId, type StationId}
import peakpune_metro/types.{
  type FareSystem, type FareTable, type Line, type Network, type Operator,
  type Stop, MahaFares, MahaMetro, Open, PinkFares, PitCmrl,
}

/// Whether a station may be chosen for boarding or getting off.
/// `Available`: some line lists the station as open and the operator confirmed that.
/// `ReportedOpen`: listed as open, but only by media reports. It can be chosen, and is labelled as such.
/// `NotOpenYet`: not open on any line (including stations the operator lists without an Open tag).
pub type Availability {
  Available
  ReportedOpen
  NotOpenYet
}

pub type PlanError {
  SameStation
  NotSelectable(station: StationId, why: Availability)
  NoRoute
}

pub type Leg {
  Leg(
    line: LineId,
    line_name: String,
    operator: Operator,
    from: StationId,
    to: StationId,
    // The terminus the train is heading towards.
    toward: String,
    // Open stops passed, counting the one you get off at.
    stops: Int,
  )
}

pub type ChartReason {
  /// The operator's own chart prints different fares for the two directions of this pair.
  Disputed
  /// The saved fare table has no entry for this pair.
  Missing
}

pub type FareResult {
  Exact(rupees: Int)
  CheckChart(why: ChartReason)
}

/// One ticket covers consecutive legs on the same fare system. Fares from different systems are never added up.
pub type Ticket {
  Ticket(
    system: FareSystem,
    from: StationId,
    to: StationId,
    legs: List(Leg),
    fare: FareResult,
  )
}

pub type Route {
  Route(legs: List(Leg), changes: List(StationId), tickets: List(Ticket))
}

// ---------- availability ----------

fn stops_of(network: Network, station: StationId) -> List(Stop) {
  list.flat_map(network.lines, fn(line) {
    list.filter(line.stops, fn(stop) { stop.station == station })
  })
}

/// A stop can be used for a journey only when the data says it is open.
pub fn usable(stop: Stop) -> Bool {
  stop.status.state == Open
}

fn confirmed(stop: Stop) -> Bool {
  stop.status.state == Open && stop.status.verified
}

pub fn availability(network: Network, station: StationId) -> Availability {
  let stops = stops_of(network, station)
  case list.any(stops, confirmed), list.any(stops, usable) {
    True, _ -> Available
    False, True -> ReportedOpen
    False, False -> NotOpenYet
  }
}

pub fn selectable(network: Network, station: StationId) -> Bool {
  availability(network, station) != NotOpenYet
}

/// Stations that appear on more than one line, derived from the line data.
pub fn interchanges(network: Network) -> List(StationId) {
  let all =
    list.flat_map(network.lines, fn(line) {
      list.map(line.stops, fn(stop) { stop.station })
    })
  all
  |> list.unique
  |> list.filter(fn(id) { list.count(all, fn(other) { other == id }) > 1 })
}

// ---------- routing ----------

fn usable_on(line: Line, station: StationId) -> Bool {
  list.any(line.stops, fn(stop) { stop.station == station && usable(stop) })
}

fn position(line: Line, station: StationId) -> Result(Int, Nil) {
  line.stops
  |> list.index_map(fn(stop, index) { #(stop.station, index) })
  |> list.find_map(fn(pair) {
    case pair.0 == station {
      True -> Ok(pair.1)
      False -> Error(Nil)
    }
  })
}

fn make_leg(line: Line, from: StationId, to: StationId) -> Result(Leg, Nil) {
  case position(line, from), position(line, to) {
    Ok(a), Ok(b) -> {
      let #(low, high) = case a < b {
        True -> #(a, b)
        False -> #(b, a)
      }
      let passed =
        line.stops
        |> list.drop(low + 1)
        |> list.take(high - low)
      let open_stops =
        list.count(passed, fn(stop) { stop.status.state == Open })
      let toward = case b > a {
        True -> line.last_terminus
        False -> line.first_terminus
      }
      Ok(Leg(
        line: line.id,
        line_name: line.name,
        operator: line.operator,
        from: from,
        to: to,
        toward: toward,
        stops: open_stops,
      ))
    }
    _, _ -> Error(Nil)
  }
}

fn usable_on_unused_line(
  network: Network,
  used: List(LineId),
  station: StationId,
) -> Bool {
  list.any(network.lines, fn(line) {
    !list.contains(used, line.id) && usable_on(line, station)
  })
}

/// All leg sequences from `from` to `to`, using each line at most once and at most `depth` changes.
fn search(
  network: Network,
  from: StationId,
  to: StationId,
  used: List(LineId),
  depth: Int,
) -> List(List(Leg)) {
  list.flat_map(network.lines, fn(line) {
    case list.contains(used, line.id) || !usable_on(line, from) {
      True -> []
      False ->
        case usable_on(line, to) {
          True ->
            case make_leg(line, from, to) {
              Ok(leg) -> [[leg]]
              Error(_) -> []
            }
          False ->
            case depth > 0 {
              False -> []
              True -> {
                let used_now = [line.id, ..used]
                let change_stops =
                  list.filter(line.stops, fn(stop) {
                    usable(stop)
                    && stop.station != from
                    && usable_on_unused_line(network, used_now, stop.station)
                  })
                list.flat_map(change_stops, fn(stop) {
                  case make_leg(line, from, stop.station) {
                    Error(_) -> []
                    Ok(leg) ->
                      search(network, stop.station, to, used_now, depth - 1)
                      |> list.map(fn(rest) { [leg, ..rest] })
                  }
                })
              }
            }
        }
    }
  })
}

fn total_stops(legs: List(Leg)) -> Int {
  list.fold(legs, 0, fn(sum, leg) { sum + leg.stops })
}

/// Fewest legs first, then fewest stops.
fn best(candidates: List(List(Leg))) -> Result(List(Leg), Nil) {
  candidates
  |> list.sort(fn(a, b) {
    case int.compare(list.length(a), list.length(b)) {
      order.Eq -> int.compare(total_stops(a), total_stops(b))
      other -> other
    }
  })
  |> list.first
}

// ---------- fares ----------

fn system_of(operator: Operator) -> FareSystem {
  case operator {
    MahaMetro -> MahaFares
    PitCmrl -> PinkFares
  }
}

fn table_for(network: Network, system: FareSystem) -> FareTable {
  case system {
    MahaFares -> network.maha_fares
    PinkFares -> network.pink_fares
  }
}

fn index_of(order: List(StationId), station: StationId) -> Result(Int, Nil) {
  order
  |> list.index_map(fn(id, index) { #(id, index) })
  |> list.find_map(fn(pair) {
    case pair.0 == station {
      True -> Ok(pair.1)
      False -> Error(Nil)
    }
  })
}

fn cell(rows: List(List(Int)), i: Int, j: Int) -> Result(Int, Nil) {
  rows
  |> list.drop(i)
  |> list.first
  |> result.try(fn(row) { row |> list.drop(j) |> list.first })
}

fn is_disputed(network: Network, a: StationId, b: StationId) -> Bool {
  list.any(network.disputed, fn(pair) {
    { pair.0 == a && pair.1 == b } || { pair.0 == b && pair.1 == a }
  })
}

/// An exact fare only when the saved table has the pair and the operator's chart does not contradict itself.
/// Never interpolates, averages or guesses.
pub fn lookup_fare(
  network: Network,
  system: FareSystem,
  a: StationId,
  b: StationId,
) -> FareResult {
  case system == MahaFares && is_disputed(network, a, b) {
    True -> CheckChart(Disputed)
    False -> {
      let table = table_for(network, system)
      case index_of(table.order, a), index_of(table.order, b) {
        Ok(i), Ok(j) ->
          case cell(table.rows, i, j) {
            Ok(value) if value > 0 -> Exact(value)
            _ -> CheckChart(Missing)
          }
        _, _ -> CheckChart(Missing)
      }
    }
  }
}

fn same_system(group: List(Leg), leg: Leg) -> Bool {
  case list.first(group) {
    Ok(first) -> system_of(first.operator) == system_of(leg.operator)
    Error(_) -> False
  }
}

fn group_by_system(legs: List(Leg)) -> List(List(Leg)) {
  legs
  |> list.fold([], fn(groups, leg) {
    case groups {
      [] -> [[leg]]
      [current, ..older] ->
        case same_system(current, leg) {
          True -> [list.append(current, [leg]), ..older]
          False -> [[leg], current, ..older]
        }
    }
  })
  |> list.reverse
}

fn tickets_for(network: Network, legs: List(Leg)) -> List(Ticket) {
  legs
  |> group_by_system
  |> list.filter_map(fn(group) {
    case list.first(group), list.last(group) {
      Ok(first), Ok(last) -> {
        let system = system_of(first.operator)
        Ok(Ticket(
          system: system,
          from: first.from,
          to: last.to,
          legs: group,
          fare: lookup_fare(network, system, first.from, last.to),
        ))
      }
      _, _ -> Error(Nil)
    }
  })
}

fn change_points(legs: List(Leg)) -> List(StationId) {
  legs
  |> list.take(list.length(legs) - 1)
  |> list.map(fn(leg) { leg.to })
}

// ---------- the planner ----------

pub fn plan(
  network: Network,
  from: StationId,
  to: StationId,
) -> Result(Route, PlanError) {
  case from == to {
    True -> Error(SameStation)
    False ->
      case availability(network, from), availability(network, to) {
        NotOpenYet, _ -> Error(NotSelectable(from, NotOpenYet))
        _, NotOpenYet -> Error(NotSelectable(to, NotOpenYet))
        _, _ ->
          case best(search(network, from, to, [], 2)) {
            Error(_) -> Error(NoRoute)
            Ok(legs) ->
              Ok(Route(
                legs: legs,
                changes: change_points(legs),
                tickets: tickets_for(network, legs),
              ))
          }
      }
  }
}
