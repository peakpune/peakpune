// Ports the metro checks in tests/metro.test.js and adds planner tests (the Gleam planner has none).
package com.overtimelabs.peakpune

import com.overtimelabs.peakpune.metro.Availability
import com.overtimelabs.peakpune.metro.ChartReason
import com.overtimelabs.peakpune.metro.FareResult
import com.overtimelabs.peakpune.metro.FareSystem
import com.overtimelabs.peakpune.metro.MetroNetwork
import com.overtimelabs.peakpune.metro.PlanError
import com.overtimelabs.peakpune.metro.PlanResult
import com.overtimelabs.peakpune.metro.Planner
import com.overtimelabs.peakpune.metro.StatusSource
import com.overtimelabs.peakpune.metro.StopState
import com.overtimelabs.peakpune.metro.metroSlug
import com.overtimelabs.peakpune.metro.validateAreas
import com.overtimelabs.peakpune.metro.validateMetro
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.jsonObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class MetroTest {
    private val data = Json.parseToJsonElement(TestData.read("metro.json")!!).jsonObject
    private val areas = Json.parseToJsonElement(TestData.read("areas.json")!!).jsonObject
    private val net = MetroNetwork.fromJson(data, areas)
    private val planner = Planner(net)
    private fun id(name: String) = net.stations.values.first { name in it.names }.id
    private fun route(a: String, b: String) = (planner.plan(a, b) as PlanResult.Ok).route

    /** Returns a copy of [root] with the element at [path] replaced via [f]. */
    private fun edit(root: JsonElement, path: List<Any>, f: (JsonElement) -> JsonElement): JsonElement {
        if (path.isEmpty()) return f(root)
        val head = path.first()
        return when (root) {
            is JsonObject -> JsonObject(root.toMutableMap().also { it[head as String] = edit(root[head]!!, path.drop(1), f) })
            is JsonArray -> JsonArray(root.toMutableList().also { it[head as Int] = edit(root[head]!!, path.drop(1), f) })
            else -> error("bad path")
        }
    }

    @Test fun datasetsAreSelfConsistent() {
        assertEquals(emptyList<String>(), validateMetro(data, areas))
        assertEquals(emptyList<String>(), validateAreas(areas, data))
    }

    @Test fun validatorCatchesTheMistakesItExistsFor() {
        val bad = edit(data, listOf("fares", "maha_metro", "matrix", 3, 25)) { JsonPrimitive(25) }.jsonObject
        assertTrue(validateMetro(bad, areas).any { "asymmetric" in it })
        val unknown = edit(data, listOf("lines", 1, "station_codes")) { JsonObject(it.jsonObject + ("Ghost Station" to JsonPrimitive("XXX"))) }.jsonObject
        assertTrue(validateMetro(unknown, areas).any { "unknown station" in it })
        val media = edit(data, listOf("lines", 2, "station_status", "verified")) { JsonPrimitive(true) }.jsonObject
        assertTrue(validateMetro(media, areas).isNotEmpty())
        val ext = edit(data, listOf("lines", 0, "station_order")) { JsonArray(it as JsonArray + JsonPrimitive("Nigdi")) }.jsonObject
        assertTrue(validateMetro(ext, areas).isNotEmpty())
    }

    @Test fun districtCourtIsOneStationAndShivajiNagarIsTwo() {
        assertEquals(listOf("aqua", "pink_line3", "purple"), net.stations["district-court"]!!.lines.sorted())
        assertEquals(2, net.stations.keys.count { it.startsWith("shivaji-nagar") })
        assertEquals("rto-pune", metroSlug("R.T.O., Pune"))
    }

    @Test fun rangeHillListedNotOpenAndLine3IsMediaUnverified() {
        assertEquals(StopState.NOT_OPEN, net.statusOn("purple", "range-hill")!!.state)
        net.lines.first { it.id == "pink_line3" }.stops.forEach {
            assertEquals(StatusSource.MEDIA, it.status.source); assertFalse(it.status.verified)
        }
    }

    @Test fun fareCorrectionAndDisputedPairsRecorded() {
        assertEquals(11, net.disputed.size)
        assertFalse(net.disputed.any { setOf(it.a, it.b) == setOf("kasarwadi", "bund-garden") })
        assertEquals(30, (planner.lookupFare(FareSystem.MAHA, "kasarwadi", "bund-garden") as FareResult.Exact).rupees)
        assertEquals(30, (planner.lookupFare(FareSystem.MAHA, "bund-garden", "kasarwadi") as FareResult.Exact).rupees)
    }

    @Test fun line3WhatsappIsNeverInvented() {
        assertNull(net.pinkWhatsapp)
        assertEquals("https://wa.me/9420101990", net.mahaWhatsapp)
    }

    @Test fun sameStationIsRefused() = assertEquals(PlanResult.Err(PlanError.SameStation), planner.plan("swargate", "swargate"))

    @Test fun oneLineTripHasOneLegAndAnExactFare() {
        val r = route(id("PCMC"), id("Swargate"))
        assertEquals(1, r.legs.size); assertTrue(r.changes.isEmpty()); assertEquals("Swargate", r.legs[0].toward)
        assertTrue(r.tickets.single().fare is FareResult.Exact)
        val open = net.lines.first { it.id == "purple" }.stops.count { it.status.state == StopState.OPEN }
        assertEquals(open - 1, r.legs[0].stops) // Range Hill is not counted
    }

    @Test fun purpleToAquaChangesAtDistrictCourtOnOneTicket() {
        val r = route(id("Swargate"), id("Vanaz"))
        assertEquals(2, r.legs.size); assertEquals(listOf("district-court"), r.changes)
        assertEquals(FareSystem.MAHA, r.tickets.single().system)
    }

    @Test fun disputedPairIsCheckTheChartBothWays() {
        val p = net.disputed.first()
        assertEquals(FareResult.CheckChart(ChartReason.DISPUTED), planner.lookupFare(FareSystem.MAHA, p.a, p.b))
        assertEquals(FareResult.CheckChart(ChartReason.DISPUTED), planner.lookupFare(FareSystem.MAHA, p.b, p.a))
    }

    @Test fun rangeHillAndClosedLine3StationsCannotBeChosen() {
        assertEquals(Availability.NOT_OPEN_YET, planner.availability("range-hill"))
        assertTrue((planner.plan("range-hill", "swargate") as PlanResult.Err).error is PlanError.NotSelectable)
        val closed = net.lines.first { it.id == "pink_line3" }.stops.first { it.status.state == StopState.CLOSED }
        assertFalse(planner.selectable(closed.station))
    }

    @Test fun openLine3StationsAreMediaReported() {
        assertEquals(Availability.REPORTED_OPEN, planner.availability(id("Maan")))
        assertEquals(Availability.AVAILABLE, planner.availability(id("Swargate")))
        assertEquals(Availability.AVAILABLE, planner.availability("district-court"))
    }

    @Test fun line3ToMahaUsesSeparateTicketsNeverAddedUp() {
        val r = route(id("Maan"), id("Swargate"))
        assertEquals(listOf("district-court"), r.changes)
        assertEquals(listOf(FareSystem.PINK, FareSystem.MAHA), r.tickets.map { it.system })
    }

    @Test fun onlyInterchangeIsDistrictCourt() = assertEquals(listOf("district-court"), planner.interchanges())

    @Test fun everyPairOfSelectableStationsHasARoute() {
        val ids = net.stations.keys.filter(planner::selectable)
        for (a in ids) for (b in ids) if (a != b) assertTrue("$a -> $b", planner.plan(a, b) is PlanResult.Ok)
    }
}
