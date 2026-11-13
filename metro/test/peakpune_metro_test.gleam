import gleam/list
import gleeunit
import peakpune_metro
import peakpune_metro/data
import peakpune_metro/ids.{
  Aqua, BanerGaon, Bopodi, BundGarden, DeccanGymkhana, DistrictCourt,
  HinjawadiPhaseI, KalyaniNagar, Kasarwadi, Maan, PinkLine3, Purple,
  PuneRailwayStation, Ramwadi, RangeHill, ShivajiNagar, ShivajiNagarPink,
  Swargate, Vanaz, Yerwada, Pcmc, Aundh,
}
import peakpune_metro/planner.{
  Available, CheckChart, Disputed, Exact, Missing, NoRoute, NotOpenYet,
  NotSelectable, SameStation, UnconfirmedByOperator,
}
import peakpune_metro/types.{
  type Network, FareTable, Line, MahaFares, Network, PinkFares, Status, Stop,
}

pub fn main() -> Nil {
  gleeunit.main()
}

// A copy of the shipped data in which the operator has confirmed Line 3's statuses (open and closed
// states are left as they are). Proves routing follows the data flags, not hardcoded station lists.
fn with_line3_confirmed(network: Network) -> Network {
  Network(
    ..network,
    lines: list.map(network.lines, fn(line) {
      case line.id {
        PinkLine3 ->
          Line(
            ..line,
            stops: list.map(line.stops, fn(stop) {
              Stop(..stop, status: Status(..stop.status, verified: True))
            }),
          )
        _ -> line
      }
    }),
  )
}

fn lines_of(route: planner.Route) {
  list.map(route.legs, fn(leg) { leg.line })
}

// ---------- routing ----------

pub fn ramwadi_to_swargate_changes_at_district_court_test() {
  let assert Ok(route) = planner.plan(data.network(), Ramwadi, Swargate)
  assert lines_of(route) == [Aqua, Purple]
  assert route.changes == [DistrictCourt]
  assert list.map(route.legs, fn(leg) { leg.toward }) == ["Vanaz", "Swargate"]
  assert list.map(route.legs, fn(leg) { leg.stops }) == [7, 3]
  // Purple and Aqua are one fare system: one ticket, one fare from the matrix.
  let assert [ticket] = route.tickets
  assert ticket.fare == Exact(25)
}

pub fn same_line_needs_no_change_test() {
  let assert Ok(route) =
    planner.plan(data.network(), PuneRailwayStation, Yerwada)
  assert lines_of(route) == [Aqua]
  assert route.changes == []
  let assert Ok(purple) = planner.plan(data.network(), Pcmc, Swargate)
  assert lines_of(purple) == [Purple]
}

pub fn purple_to_aqua_and_back_test() {
  let net = data.network()
  let assert Ok(forward) = planner.plan(net, Swargate, Ramwadi)
  assert lines_of(forward) == [Purple, Aqua]
  assert list.map(forward.legs, fn(leg) { leg.toward }) == ["PCMC", "Ramwadi"]
  let assert Ok(back) = planner.plan(net, Ramwadi, Swargate)
  assert lines_of(back) == [Aqua, Purple]
}

pub fn the_interchange_is_derived_from_line_membership_test() {
  // District Court is on all three lines; Shivaji Nagar (Purple) and Shivaji Nagar (Line 3)
  // are separate stations, so no interchange is derived between them.
  assert planner.interchanges(data.network()) == [DistrictCourt]
  assert ShivajiNagar != ShivajiNagarPink
}

pub fn every_pair_of_lines_routes_once_line3_is_confirmed_test() {
  let net = with_line3_confirmed(data.network())
  // Line 3 to Purple, Line 3 to Aqua, Purple to Aqua, and the reverse of each.
  let assert Ok(pink_purple) = planner.plan(net, Maan, Swargate)
  assert lines_of(pink_purple) == [PinkLine3, Purple]
  let assert Ok(pink_aqua) = planner.plan(net, Maan, Ramwadi)
  assert lines_of(pink_aqua) == [PinkLine3, Aqua]
  let assert Ok(aqua_pink) = planner.plan(net, Ramwadi, Maan)
  assert lines_of(aqua_pink) == [Aqua, PinkLine3]
  let assert Ok(purple_pink) = planner.plan(net, Swargate, HinjawadiPhaseI)
  assert lines_of(purple_pink) == [Purple, PinkLine3]
  let assert Ok(purple_aqua) = planner.plan(net, Swargate, Ramwadi)
  assert lines_of(purple_aqua) == [Purple, Aqua]
}

pub fn line3_trips_show_each_fare_separately_and_never_a_total_test() {
  let net = with_line3_confirmed(data.network())
  let assert Ok(route) = planner.plan(net, Maan, Swargate)
  let assert [pink, maha] = route.tickets
  assert pink.system == PinkFares
  assert pink.fare == Exact(62)
  assert maha.system == MahaFares
  assert maha.fare == Exact(15)
  assert route.changes == [DistrictCourt]
}

// ---------- availability: closed, unconfirmed and unlisted stations ----------

pub fn shipped_data_keeps_every_line3_station_unselectable_test() {
  let net = data.network()
  // Reported open by media only: not confirmed by the operator.
  assert planner.availability(net, HinjawadiPhaseI) == UnconfirmedByOperator
  assert planner.availability(net, Maan) == UnconfirmedByOperator
  // Reported not open yet.
  assert planner.availability(net, BanerGaon) == NotOpenYet
  assert planner.selectable(net, HinjawadiPhaseI) == False
  assert planner.plan(net, HinjawadiPhaseI, Swargate)
    == Error(NotSelectable(HinjawadiPhaseI, UnconfirmedByOperator))
}

pub fn range_hill_is_listed_but_never_selectable_test() {
  let net = data.network()
  assert planner.availability(net, RangeHill) == NotOpenYet
  assert planner.plan(net, Ramwadi, RangeHill)
    == Error(NotSelectable(RangeHill, NotOpenYet))
  assert planner.availability(net, DistrictCourt) == Available
}

pub fn closed_stations_stay_blocked_and_are_not_counted_as_stops_test() {
  let net = with_line3_confirmed(data.network())
  // Confirmed flags do not open a station the data says is closed.
  assert planner.plan(net, BanerGaon, Maan)
    == Error(NotSelectable(BanerGaon, NotOpenYet))
  // Maan to Aundh passes four closed Balewadi and Baner stations that are not stops.
  let assert Ok(route) = planner.plan(net, Maan, Aundh)
  let assert [leg] = route.legs
  assert leg.stops == 12
  // Range Hill is not a stop on Purple either.
  let assert Ok(purple) = planner.plan(net, Bopodi, ShivajiNagar)
  let assert [purple_leg] = purple.legs
  assert purple_leg.stops == 2
}

pub fn same_station_is_not_a_trip_test() {
  assert planner.plan(data.network(), Ramwadi, Ramwadi) == Error(SameStation)
  assert NoRoute != SameStation
}

// ---------- fares ----------

pub fn exact_fares_come_from_the_matrix_test() {
  let net = data.network()
  assert planner.lookup_fare(net, MahaFares, PuneRailwayStation, Swargate)
    == Exact(20)
  assert planner.lookup_fare(net, MahaFares, Vanaz, Ramwadi) == Exact(30)
  assert planner.lookup_fare(net, MahaFares, Pcmc, Ramwadi) == Exact(35)
  assert planner.lookup_fare(net, MahaFares, Pcmc, Swargate) == Exact(30)
  // The correction found on re-checking the chart: 30 in both directions.
  assert planner.lookup_fare(net, MahaFares, Kasarwadi, BundGarden) == Exact(30)
  assert planner.lookup_fare(net, MahaFares, BundGarden, Kasarwadi) == Exact(30)
}

pub fn disputed_pairs_fall_back_to_the_official_chart_in_both_directions_test() {
  let net = data.network()
  assert planner.lookup_fare(net, MahaFares, Bopodi, DeccanGymkhana)
    == CheckChart(Disputed)
  assert planner.lookup_fare(net, MahaFares, DeccanGymkhana, Bopodi)
    == CheckChart(Disputed)
  // Through the planner too: Bopodi (Purple) to Deccan Gymkhana (Aqua).
  let assert Ok(route) = planner.plan(net, Bopodi, DeccanGymkhana)
  let assert [ticket] = route.tickets
  assert ticket.fare == CheckChart(Disputed)
}

pub fn a_pair_missing_from_the_table_falls_back_not_guesses_test() {
  let net = data.network()
  let without_ramwadi =
    Network(
      ..net,
      maha_fares: FareTable(
        order: list.filter(net.maha_fares.order, fn(id) { id != Ramwadi }),
        rows: net.maha_fares.rows,
      ),
    )
  assert planner.lookup_fare(without_ramwadi, MahaFares, Vanaz, Ramwadi)
    == CheckChart(Missing)
  let assert Ok(route) = planner.plan(without_ramwadi, Vanaz, Ramwadi)
  let assert [ticket] = route.tickets
  assert ticket.fare == CheckChart(Missing)
}

// ---------- the area helper and the date label ----------

pub fn areas_without_a_station_say_so_and_offer_alternatives_test() {
  let net = data.network()
  let assert Ok(kharadi) = list.find(net.areas, fn(area) { area.id == "kharadi" })
  assert kharadi.has_station == False
  assert kharadi.stations == [Ramwadi, KalyaniNagar]
  let assert Ok(viman) =
    list.find(net.areas, fn(area) { area.id == "viman-nagar" })
  assert viman.stations == [Ramwadi, KalyaniNagar]
}

pub fn the_verified_label_is_rendered_from_the_data_test() {
  let net = data.network()
  assert peakpune_metro.long_date(net.verified_on) != net.verified_on
  assert peakpune_metro.long_date("2026-11-13") == "13 November 2026"
  assert peakpune_metro.long_date("not a date") == "not a date"
}
