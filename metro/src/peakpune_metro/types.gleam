//// Typed model of the Pune Metro network. Stations and lines are custom types (see ids.gleam),
//// so an unknown station reference or a case that forgets a line fails to compile.
//// Types cannot prove a real-world fare or station status is correct: that is what
//// `verified_on`, the status source and the `verified` flag in the data are for.

import gleam/option.{type Option}
import peakpune_metro/ids.{type LineId, type StationId}

pub type Operator {
  MahaMetro
  PitCmrl
}

/// What the data says about a station on a line.
pub type State {
  Open
  NotOpen
  Closed
}

/// Who said so. `MediaSource` statuses are never operator-confirmed.
pub type Source {
  OperatorSource
  MediaSource
}

pub type Status {
  Status(state: State, source: Source, verified: Bool, as_of: String)
}

/// A station's place on one line, in running order, with its status on that line.
pub type Stop {
  Stop(station: StationId, status: Status)
}

pub type Line {
  Line(
    id: LineId,
    name: String,
    operator: Operator,
    first_terminus: String,
    last_terminus: String,
    stops: List(Stop),
  )
}

/// A fare matrix. `rows[i][j]` is the fare from `order[i]` to `order[j]`, in rupees.
pub type FareTable {
  FareTable(order: List(StationId), rows: List(List(Int)))
}

pub type FareSystem {
  MahaFares
  PinkFares
}

pub type Area {
  Area(
    id: String,
    name: String,
    note: String,
    has_station: Bool,
    stations: List(StationId),
  )
}

pub type Network {
  Network(
    verified_on: String,
    lines: List(Line),
    maha_fares: FareTable,
    pink_fares: FareTable,
    // Pairs the operator's own chart prints differently in each direction. Never shown as a fare.
    disputed: List(#(StationId, StationId)),
    areas: List(Area),
    maha_whatsapp: Option(String),
    pink_whatsapp: Option(String),
    // The shared official Pune Metro WhatsApp number with a reported Line 3 option:
    // the number is operator-published (Maha Metro), the Line 3 option on it is media-reported only.
    pink_whatsapp_shared: Option(String),
    maha_fare_chart_url: String,
    pink_fare_chart_url: String,
  )
}
