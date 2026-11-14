// Kotlin port of metro/src/peakpune_metro/planner.gleam. Route and fare logic only: no station,
// interchange, fare or status is mentioned by name here, and nothing needs a network connection.
package com.overtimelabs.peakpune.metro

/** AVAILABLE: some line lists it open and the operator confirmed that.
 *  REPORTED_OPEN: listed open only by media reports. Selectable, and labelled.
 *  NOT_OPEN_YET: not open on any line (including listed-but-not-open stations). */
enum class Availability { AVAILABLE, REPORTED_OPEN, NOT_OPEN_YET }

sealed interface PlanError {
    data object SameStation : PlanError
    data class NotSelectable(val station: String, val why: Availability) : PlanError
    data object NoRoute : PlanError
}

data class Leg(
    val line: String,
    val lineName: String,
    val operator: MetroOperator,
    val from: String,
    val to: String,
    /** The terminus the train is heading towards. */
    val toward: String,
    /** Open stops passed, counting the one you get off at. */
    val stops: Int,
)

enum class ChartReason { DISPUTED, MISSING }

sealed interface FareResult {
    data class Exact(val rupees: Int) : FareResult
    data class CheckChart(val why: ChartReason) : FareResult
}

/** One ticket covers consecutive legs on the same fare system. Fares from different systems
 *  are never added up. */
data class Ticket(val system: FareSystem, val from: String, val to: String, val legs: List<Leg>, val fare: FareResult)

data class MetroRoute(val legs: List<Leg>, val changes: List<String>, val tickets: List<Ticket>)

sealed interface PlanResult {
    data class Ok(val route: MetroRoute) : PlanResult
    data class Err(val error: PlanError) : PlanResult
}

class Planner(private val network: MetroNetwork) {
    private fun stopsOf(station: String) = network.lines.flatMap { l -> l.stops.filter { it.station == station } }

    fun availability(station: String): Availability {
        val stops = stopsOf(station)
        return when {
            stops.any { usable(it) && it.status.verified } -> Availability.AVAILABLE
            stops.any(::usable) -> Availability.REPORTED_OPEN
            else -> Availability.NOT_OPEN_YET
        }
    }

    fun selectable(station: String) = availability(station) != Availability.NOT_OPEN_YET

    /** Stations that appear on more than one line, derived from the line data. */
    fun interchanges(): List<String> {
        val all = network.lines.flatMap { l -> l.stops.map { it.station } }
        return all.distinct().filter { id -> all.count { it == id } > 1 }
    }

    private fun usableOn(line: MetroLine, station: String) = line.stops.any { it.station == station && usable(it) }

    private fun makeLeg(line: MetroLine, from: String, to: String): Leg? {
        val a = line.stops.indexOfFirst { it.station == from }
        val b = line.stops.indexOfFirst { it.station == to }
        if (a < 0 || b < 0) return null
        val (low, high) = if (a < b) a to b else b to a
        val passed = line.stops.drop(low + 1).take(high - low)
        return Leg(line.id, line.name, line.operator, from, to, if (b > a) line.lastTerminus else line.firstTerminus, passed.count { it.status.state == StopState.OPEN })
    }

    private fun usableOnUnusedLine(used: List<String>, station: String) = network.lines.any { it.id !in used && usableOn(it, station) }

    /** All leg sequences from [from] to [to], each line used at most once, at most [depth] changes. */
    private fun search(from: String, to: String, used: List<String>, depth: Int): List<List<Leg>> =
        network.lines.flatMap { line ->
            when {
                line.id in used || !usableOn(line, from) -> emptyList()
                usableOn(line, to) -> listOfNotNull(makeLeg(line, from, to)?.let { listOf(it) })
                depth <= 0 -> emptyList()
                else -> {
                    val usedNow = listOf(line.id) + used
                    line.stops.filter { usable(it) && it.station != from && usableOnUnusedLine(usedNow, it.station) }.flatMap { stop ->
                        val leg = makeLeg(line, from, stop.station) ?: return@flatMap emptyList()
                        search(stop.station, to, usedNow, depth - 1).map { listOf(leg) + it }
                    }
                }
            }
        }

    /** Fewest legs first, then fewest stops (stable sort, as Gleam's list.sort). */
    private fun best(candidates: List<List<Leg>>) =
        candidates.sortedWith(compareBy<List<Leg>> { it.size }.thenBy { legs -> legs.sumOf { it.stops } }).firstOrNull()

    private fun isDisputed(a: String, b: String) = network.disputed.any { (it.a == a && it.b == b) || (it.a == b && it.b == a) }

    /** An exact fare only when the saved table has the pair and the operator's chart does not
     *  contradict itself. Never interpolates, averages or guesses. */
    fun lookupFare(system: FareSystem, a: String, b: String): FareResult {
        if (system == FareSystem.MAHA && isDisputed(a, b)) return FareResult.CheckChart(ChartReason.DISPUTED)
        val table = if (system == FareSystem.MAHA) network.mahaFares else network.pinkFares
        val i = table.order.indexOf(a)
        val j = table.order.indexOf(b)
        val v = table.rows.getOrNull(i)?.getOrNull(j)
        return if (i >= 0 && j >= 0 && v != null && v > 0) FareResult.Exact(v) else FareResult.CheckChart(ChartReason.MISSING)
    }

    private fun ticketsFor(legs: List<Leg>): List<Ticket> {
        val groups = mutableListOf<MutableList<Leg>>()
        for (leg in legs) {
            if (groups.isNotEmpty() && systemOf(groups.last().first().operator) == systemOf(leg.operator)) groups.last() += leg
            else groups += mutableListOf(leg)
        }
        return groups.map { g ->
            val sys = systemOf(g.first().operator)
            Ticket(sys, g.first().from, g.last().to, g, lookupFare(sys, g.first().from, g.last().to))
        }
    }

    fun plan(from: String, to: String): PlanResult {
        if (from == to) return PlanResult.Err(PlanError.SameStation)
        if (availability(from) == Availability.NOT_OPEN_YET) return PlanResult.Err(PlanError.NotSelectable(from, Availability.NOT_OPEN_YET))
        if (availability(to) == Availability.NOT_OPEN_YET) return PlanResult.Err(PlanError.NotSelectable(to, Availability.NOT_OPEN_YET))
        val legs = best(search(from, to, emptyList(), 2)) ?: return PlanResult.Err(PlanError.NoRoute)
        return PlanResult.Ok(MetroRoute(legs, legs.dropLast(1).map { it.to }, ticketsFor(legs)))
    }

    companion object {
        fun usable(s: Stop) = s.status.state == StopState.OPEN
        fun systemOf(op: MetroOperator) = if (op == MetroOperator.MAHA_METRO) FareSystem.MAHA else FareSystem.PINK
    }
}
