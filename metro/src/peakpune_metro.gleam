//// The Pune Metro journey planner: a small Lustre app that mounts on #metro-planner.
//// All routing, interchange and fare logic is in peakpune_metro/planner.gleam and runs locally
//// against the embedded data, so nothing here needs a network connection.

import gleam/int
import gleam/list
import gleam/option.{type Option, None, Some}
import gleam/string
import lustre
import lustre/attribute
import lustre/element.{type Element}
import lustre/element/html
import lustre/event
import peakpune_metro/data
import peakpune_metro/ids.{type StationId}
import peakpune_metro/planner.{
  type Availability, type Leg, type PlanError, type Route, type Ticket,
  Available, CheckChart, Disputed, Exact, NoRoute, NotOpenYet, NotSelectable,
  SameStation, UnconfirmedByOperator,
}
import peakpune_metro/types.{type FareSystem, type Network, MahaFares, PinkFares}

pub type Model {
  Model(
    network: Network,
    from: Option(StationId),
    to: Option(StationId),
    area: Option(String),
  )
}

pub type Msg {
  FromChanged(String)
  ToChanged(String)
  AreaChanged(String)
  UseFrom(StationId)
  UseTo(StationId)
}

pub fn main() -> Nil {
  let app = lustre.simple(init, update, view)
  case lustre.start(app, "#metro-planner", Nil) {
    _ -> Nil
  }
}

fn init(_flags: Nil) -> Model {
  Model(network: data.network(), from: None, to: None, area: None)
}

fn parse_station(value: String) -> Option(StationId) {
  ids.station_from_string(value) |> option.from_result
}

fn update(model: Model, msg: Msg) -> Model {
  case msg {
    FromChanged(value) -> Model(..model, from: parse_station(value))
    ToChanged(value) -> Model(..model, to: parse_station(value))
    AreaChanged(value) ->
      Model(..model, area: case value {
        "" -> None
        other -> Some(other)
      })
    UseFrom(id) -> Model(..model, from: Some(id))
    UseTo(id) -> Model(..model, to: Some(id))
  }
}

// ---------- text helpers ----------

fn month_name(month: Int) -> String {
  case month {
    1 -> "January"
    2 -> "February"
    3 -> "March"
    4 -> "April"
    5 -> "May"
    6 -> "June"
    7 -> "July"
    8 -> "August"
    9 -> "September"
    10 -> "October"
    11 -> "November"
    12 -> "December"
    _ -> ""
  }
}

/// "2026-11-13" becomes "13 November 2026". Unknown shapes are shown as they came.
pub fn long_date(iso: String) -> String {
  case string.split(iso, "-") {
    [year, month, day] ->
      case int.parse(month), int.parse(day) {
        Ok(m), Ok(d) -> int.to_string(d) <> " " <> month_name(m) <> " " <> year
        _, _ -> iso
      }
    _ -> iso
  }
}

fn stops_text(count: Int) -> String {
  case count {
    1 -> "1 stop"
    _ -> int.to_string(count) <> " stops"
  }
}

fn availability_suffix(availability: Availability) -> String {
  case availability {
    Available -> ""
    NotOpenYet -> " (not open yet)"
    UnconfirmedByOperator -> " (opening not confirmed by the operator)"
  }
}

fn availability_message(availability: Availability) -> String {
  case availability {
    Available -> ""
    NotOpenYet -> "not open yet."
    UnconfirmedByOperator ->
      "opening status not yet confirmed by the operator - check punerimetro.in."
  }
}

fn system_name(system: FareSystem) -> String {
  case system {
    MahaFares -> "Maha Metro (Lines 1 and 2)"
    PinkFares -> "Line 3 (Pink)"
  }
}

fn chart_url(network: Network, system: FareSystem) -> String {
  case system {
    MahaFares -> network.maha_fare_chart_url
    PinkFares -> network.pink_fare_chart_url
  }
}

fn text(content: String) -> Element(Msg) {
  html.text(content)
}

fn paragraph(content: String) -> Element(Msg) {
  html.p([], [text(content)])
}

fn needs_internet() -> Element(Msg) {
  html.span([attribute.class("net")], [text("needs internet")])
}

// ---------- view ----------

fn view(model: Model) -> Element(Msg) {
  html.div([attribute.class("pl")], [
    html.p([attribute.class("verified")], [
      text(
        "Fares and stations last verified on "
        <> long_date(model.network.verified_on),
      ),
    ]),
    selectors(model),
    html.p([attribute.class("note")], [
      text(
        "Greyed-out stations cannot be chosen yet: they are not open, or the operator has not confirmed they are (check punerimetro.in). Timetable information only.",
      ),
    ]),
    results(model),
    area_helper(model),
    whatsapp(model.network),
  ])
}

fn selectors(model: Model) -> Element(Msg) {
  html.div([attribute.class("pl-row")], [
    station_select(model, "pl-from", "Boarding station", model.from, FromChanged),
    station_select(model, "pl-to", "Destination station", model.to, ToChanged),
  ])
}

fn station_select(
  model: Model,
  id: String,
  label: String,
  selected: Option(StationId),
  on_change: fn(String) -> Msg,
) -> Element(Msg) {
  html.label([attribute.for(id)], [
    text(label),
    html.select(
      [attribute.id(id), event.on_change(on_change)],
      [
        html.option(
          [attribute.value(""), attribute.selected(selected == None)],
          "Choose a station",
        ),
        ..station_groups(model.network, selected)
      ],
    ),
  ])
}

/// One group per line, each station listed once (an interchange appears under the first line that has it).
fn station_groups(
  network: Network,
  selected: Option(StationId),
) -> List(Element(Msg)) {
  let folded =
    list.fold(network.lines, #([], []), fn(acc, line) {
      let #(seen, groups) = acc
      let fresh =
        line.stops
        |> list.map(fn(stop) { stop.station })
        |> list.filter(fn(id) { !list.contains(seen, id) })
      let group =
        html.optgroup(
          [attribute.attribute("label", line.name)],
          list.map(fresh, fn(id) { station_option(network, selected, id) }),
        )
      #(list.append(seen, fresh), list.append(groups, [group]))
    })
  folded.1
}

fn station_option(
  network: Network,
  selected: Option(StationId),
  id: StationId,
) -> Element(Msg) {
  let availability = planner.availability(network, id)
  html.option(
    [
      attribute.value(ids.station_to_string(id)),
      attribute.disabled(availability != Available),
      attribute.selected(selected == Some(id)),
    ],
    ids.station_name(id) <> availability_suffix(availability),
  )
}

fn results(model: Model) -> Element(Msg) {
  case model.from, model.to {
    Some(from), Some(to) ->
      case planner.plan(model.network, from, to) {
        Ok(route) -> route_view(model.network, route)
        Error(error) -> error_view(error)
      }
    _, _ ->
      html.div([attribute.class("res")], [
        paragraph("Choose where you board and where you get off."),
      ])
  }
}

fn error_view(error: PlanError) -> Element(Msg) {
  let message = case error {
    SameStation ->
      "You picked the same station twice. Choose a different destination."
    NoRoute ->
      "No route between these stations in the saved data. Check the official fare chart or ask the operator."
    NotSelectable(station, why) ->
      ids.station_name(station) <> ": " <> availability_message(why)
  }
  html.div([attribute.class("res")], [
    html.p([attribute.class("warn"), attribute.role("alert")], [text(message)]),
  ])
}

fn route_view(network: Network, route: Route) -> Element(Msg) {
  let change = case route.changes {
    [] -> paragraph("No change needed.")
    changes ->
      paragraph(
        "Change at "
        <> string.join(list.map(changes, ids.station_name), ", then at ")
        <> ".",
      )
  }
  html.div(
    [attribute.class("res"), attribute.attribute("aria-live", "polite")],
    list.flatten([
      [html.h3([], [text("Your route")])],
      list.map(route.legs, leg_view),
      [change],
      [html.h3([], [text("Tickets and fares")])],
      list.map(route.tickets, fn(ticket) { ticket_view(network, ticket) }),
      fare_notes(route),
    ]),
  )
}

fn leg_view(leg: Leg) -> Element(Msg) {
  html.div([attribute.class("leg")], [
    html.strong([], [text(leg.line_name)]),
    text(
      "Board at "
      <> ids.station_name(leg.from)
      <> ", towards "
      <> leg.toward
      <> ". Get off at "
      <> ids.station_name(leg.to)
      <> " after "
      <> stops_text(leg.stops)
      <> ".",
    ),
  ])
}

fn ticket_view(network: Network, ticket: Ticket) -> Element(Msg) {
  let heading =
    system_name(ticket.system)
    <> ": "
    <> ids.station_name(ticket.from)
    <> " to "
    <> ids.station_name(ticket.to)
  let body = case ticket.fare {
    Exact(rupees) ->
      paragraph(
        "Fare: Rs "
        <> int.to_string(rupees)
        <> ", from the saved fare table (verified "
        <> long_date(network.verified_on)
        <> ").",
      )
    CheckChart(why) -> {
      let reason = case why {
        Disputed ->
          "The operator's own chart prints a different fare for each direction of this pair, so no exact fare is shown."
        _ -> "The saved fare table has no fare for this pair."
      }
      html.p([attribute.class("warn")], [
        text("Check the official fare chart. " <> reason <> " "),
        html.a(
          [
            attribute.href(chart_url(network, ticket.system)),
            attribute.target("_blank"),
            attribute.rel("noopener"),
          ],
          [text("Official fare chart"), needs_internet()],
        ),
      ])
    }
  }
  html.div([attribute.class("leg")], [html.strong([], [text(heading)]), body])
}

fn fare_notes(route: Route) -> List(Element(Msg)) {
  let two_systems = list.length(route.tickets) > 1
  let uses_line3 =
    list.any(route.tickets, fn(ticket) { ticket.system == PinkFares })
  let one_ticket_change =
    !two_systems && list.length(route.legs) > 1 && !uses_line3
  list.flatten([
    case two_systems {
      True -> [
        html.p([attribute.class("warn")], [
          text(
            "This trip crosses two separate fare systems and operators. Each ticket's fare is shown on its own. No combined fare is published, so none is shown.",
          ),
        ]),
      ]
      False -> []
    },
    case one_ticket_change {
      True -> [
        paragraph(
          "Both lines are one fare system: one ticket covers the change.",
        ),
      ]
      False -> []
    },
    case uses_line3 {
      True -> [
        paragraph(
          "Line 3 tickets: buy at the station counter or a ticket vending machine, or use the Line 3 app. A Line 3 WhatsApp number is not confirmed, so none is shown.",
        ),
      ]
      False -> []
    },
  ])
}

fn whatsapp(network: Network) -> Element(Msg) {
  case network.maha_whatsapp {
    Some(url) ->
      html.p([attribute.class("btns")], [
        html.a(
          [
            attribute.href(url),
            attribute.target("_blank"),
            attribute.rel("noopener"),
            attribute.class("chip"),
          ],
          [text("Book on WhatsApp (Lines 1 and 2 only)"), needs_internet()],
        ),
      ])
    None -> element.none()
  }
}

// ---------- area helper ----------

fn area_helper(model: Model) -> Element(Msg) {
  html.div([attribute.class("res")], [
    html.h3([], [text("Not sure which station? Pick an area")]),
    html.label([attribute.for("pl-area")], [
      text("Area"),
      html.select(
        [attribute.id("pl-area"), event.on_change(AreaChanged)],
        [
          html.option([attribute.value("")], "Choose an area"),
          ..list.map(model.network.areas, fn(area) {
            html.option(
              [
                attribute.value(area.id),
                attribute.selected(model.area == Some(area.id)),
              ],
              area.name,
            )
          })
        ],
      ),
    ]),
    area_result(model),
  ])
}

fn area_result(model: Model) -> Element(Msg) {
  case model.area {
    None -> element.none()
    Some(wanted) ->
      case list.find(model.network.areas, fn(area) { area.id == wanted }) {
        Error(_) -> element.none()
        Ok(area) -> {
          let lead = case area.has_station {
            True -> "Has a station. "
            False -> "No station in the area. "
          }
          html.div([], [
            html.p([], [html.strong([], [text(lead)]), text(area.note)]),
            html.ul(
              [attribute.class("area-stations")],
              list.map(area.stations, fn(id) {
                area_station(model.network, id)
              }),
            ),
          ])
        }
      }
  }
}

fn area_station(network: Network, id: StationId) -> Element(Msg) {
  case planner.availability(network, id) {
    Available ->
      html.li([], [
        text(ids.station_name(id) <> " "),
        html.button(
          [
            attribute.class("chip"),
            attribute.type_("button"),
            event.on_click(UseFrom(id)),
          ],
          [text("Board here")],
        ),
        html.button(
          [
            attribute.class("chip"),
            attribute.type_("button"),
            event.on_click(UseTo(id)),
          ],
          [text("Get off here")],
        ),
      ])
    other -> html.li([], [text(ids.station_name(id) <> availability_suffix(other))])
  }
}
