// Kotlin port of scripts/metro-model.mjs (buildModel) and the Network type in
// metro/src/peakpune_metro/types.gleam. Everything is derived from metro.json and areas.json;
// no station, fare or status is typed in here.
package com.overtimelabs.peakpune.metro

import com.overtimelabs.peakpune.data.known
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.doubleOrNull
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

/** metro-model.mjs `slug`: "R.T.O., Pune" -> "rto-pune". */
fun metroSlug(name: String): String =
    name.lowercase().replace(".", "").replace(Regex("[^a-z0-9]+"), "-").trim('-')

enum class MetroOperator { MAHA_METRO, PIT_CMRL }
enum class StopState { OPEN, NOT_OPEN, CLOSED, UNKNOWN }
enum class StatusSource { OPERATOR, MEDIA, OTHER }

data class StopStatus(val state: StopState, val source: StatusSource, val verified: Boolean, val asOf: String, val sourceUrl: String?)

/** A station's place on one line, in running order. */
data class Stop(val station: String, val status: StopStatus)

data class MetroLine(
    val id: String,
    val name: String,
    val operator: MetroOperator,
    val firstTerminus: String,
    val lastTerminus: String,
    val stops: List<Stop>,
) {
    /** Line colours used by the site (LINE_COLOUR in metro-model.mjs). */
    val colour: Long get() = when (id) {
        "purple" -> 0xFF8A3A8E
        "aqua" -> 0xFF1FA5D8
        else -> 0xFFD9548F
    }
}

class MetroStation(val id: String, val name: String) {
    val names = linkedSetOf<String>()
    val lines = mutableListOf<String>()
}

/** `rows[i][j]` is the fare from `order[i]` to `order[j]`, in rupees. */
data class FareTable(val order: List<String>, val rows: List<List<Int>>)
data class DisputedPair(val a: String, val b: String, val printedAB: Int, val printedBA: Int)
data class AreaStation(val id: String, val straightLineKm: Double)
data class MetroArea(val id: String, val name: String, val note: String, val hasStation: Boolean, val stations: List<AreaStation>)

enum class FareSystem { MAHA, PINK }

class MetroNetwork private constructor(
    /** The parsed metro.json, kept for the validator and the guide text. */
    val raw: JsonObject,
    val verifiedOn: String,
    val lines: List<MetroLine>,
    val stations: Map<String, MetroStation>,
    val mahaFares: FareTable,
    val pinkFares: FareTable,
    /** Pairs the operator's chart prints differently in each direction. Never shown as a fare. */
    val disputed: List<DisputedPair>,
    val areas: List<MetroArea>,
) {
    val operators get() = raw["operators"]!!.jsonObject
    val provenance get() = raw["provenance"]!!.jsonObject
    val timetables get() = raw["timetables"]!!.jsonObject
    val mahaWhatsapp: String? get() = operators["maha_metro"]!!.jsonObject.known("whatsapp_eticket")
    val pinkWhatsapp: String? get() = operators["pitcmrl"]!!.jsonObject.known("whatsapp_eticket")
    val mahaFareChartUrl: String get() = provenance.known("mahametro_fare_chart_page")!!
    val pinkFareChartUrl: String get() = provenance.known("line3_fare_table_page")!!

    fun statusOn(lineId: String, station: String): StopStatus? =
        lines.firstOrNull { it.id == lineId }?.stops?.firstOrNull { it.station == station }?.status

    fun displayName(id: String) = stations[id]?.name?.removeSuffix(", Pune") ?: id

    companion object {
        /** District Court is one station on all three lines; Shivaji Nagar on Line 3 is not
         *  assumed to be the Purple-line station. */
        fun stationIdFor(data: JsonObject, lineId: String, name: String): String {
            val over = buildMap {
                (data["station_id_overrides"] as? JsonObject)?.forEach { (k, v) -> put(k, v.jsonPrimitive.content) }
                if (lineId == "pink_line3") (data["station_id_overrides_pink"] as? JsonObject)?.forEach { (k, v) -> put(k, v.jsonPrimitive.content) }
            }
            return over[name] ?: metroSlug(name)
        }

        private fun ints(m: JsonArray) = m.map { r -> r.jsonArray.map { it.jsonPrimitive.int } }
        private fun names(a: JsonArray?) = a?.map { it.jsonPrimitive.content } ?: emptyList()

        fun fromJson(data: JsonObject, areasDoc: JsonObject): MetroNetwork {
            val verifiedOn = data.known("verified_on")!!
            val stations = linkedMapOf<String, MetroStation>()
            val lines = mutableListOf<MetroLine>()
            for (l in data["lines"]!!.jsonArray.map { it.jsonObject }) {
                val lineId = l.known("id")!!
                val order = names(l["station_order"]?.jsonArray)
                val all = order.toMutableList()
                val notOpenList = (l["listed_but_not_open"] as? JsonArray)?.map { it.jsonObject } ?: emptyList()
                // Listed-but-not-open stations (Range Hill) sit in the order so adjacency is honest.
                for (nb in notOpenList) {
                    val at = all.indexOf(nb.known("after"))
                    require(at >= 0) { "listed_but_not_open: ${nb.known("after")} not on $lineId" }
                    all.add(at + 1, nb.known("name")!!)
                }
                val st = l["station_status"]!!.jsonObject
                fun src(s: String?) = when (s) { "operator" -> StatusSource.OPERATOR; "media" -> StatusSource.MEDIA; else -> StatusSource.OTHER }
                val verified = (st["verified"] as? JsonPrimitive)?.booleanOrNull == true
                val stops = all.map { name ->
                    val id = stationIdFor(data, lineId, name)
                    val s = stations.getOrPut(id) { MetroStation(id, name) }
                    s.names += name
                    if (lineId !in s.lines) s.lines += lineId
                    val notOpen = notOpenList.firstOrNull { it.known("name") == name }
                    val status = when {
                        notOpen != null -> StopStatus(StopState.NOT_OPEN, src(notOpen.known("status_source")), (notOpen["verified"] as? JsonPrimitive)?.booleanOrNull == true, verifiedOn, notOpen.known("source"))
                        st["open"] is JsonArray -> {
                            val open = name in names(st["open"]!!.jsonArray)
                            val closed = name in names(st["closed"] as? JsonArray)
                            StopStatus(if (open) StopState.OPEN else if (closed) StopState.CLOSED else StopState.UNKNOWN, src(st.known("status_source")), verified, st.known("as_of") ?: "", "https://punerimetro.in/route/station-list")
                        }
                        else -> StopStatus(StopState.OPEN, src(st.known("status_source")), verified, st.known("as_of") ?: "", st.known("source"))
                    }
                    Stop(id, status)
                }
                val termini = names(l["termini"] as? JsonArray).ifEmpty { listOf(order.first(), order.last().removeSuffix(", Pune")) }
                lines += MetroLine(lineId, l.known("name")!!, if (l.known("operator") == "pitcmrl") MetroOperator.PIT_CMRL else MetroOperator.MAHA_METRO, termini[0], termini[1], stops)
            }
            // Maha Metro fare matrix: code -> station id.
            val codeToId = mutableMapOf<String, String>()
            for (l in data["lines"]!!.jsonArray.map { it.jsonObject }.filter { it.known("id") in listOf("purple", "aqua") }) {
                l["station_codes"]!!.jsonObject.forEach { (name, code) ->
                    val id = stationIdFor(data, l.known("id")!!, name)
                    if (l.known("id") == "aqua" && id == "district-court") codeToId["CVC_AQ"] = id else codeToId[code.jsonPrimitive.content] = id
                }
            }
            val fares = data["fares"]!!.jsonObject
            val mm = fares["maha_metro"]!!.jsonObject
            val mahaIds = names(mm["station_order"]!!.jsonArray).map { codeToId[it] ?: "?$it" }
            val pink = lines.first { it.id == "pink_line3" }
            val disputed = mm["disputed_fare_pairs"]!!.jsonObject["pairs"]!!.jsonArray.map { it.jsonObject }.map { p ->
                DisputedPair(codeToId[p.known("from")] ?: "?", codeToId[p.known("to")] ?: "?", p["printed_from_to"]!!.jsonPrimitive.int, p["printed_to_from"]!!.jsonPrimitive.int)
            }
            val areas = areasDoc["areas"]!!.jsonArray.map { it.jsonObject }.map { a ->
                MetroArea(
                    a.known("id")!!, a.known("name")!!, a.known("note") ?: "", (a["has_station"] as? JsonPrimitive)?.booleanOrNull == true,
                    a["stations"]!!.jsonArray.map { it.jsonObject }.map { AreaStation(it.known("id")!!, it["straight_line_km"]!!.jsonPrimitive.doubleOrNull ?: 0.0) },
                )
            }
            return MetroNetwork(
                data, verifiedOn, lines, stations,
                FareTable(mahaIds, ints(mm["matrix"]!!.jsonArray)),
                FareTable(pink.stops.map { it.station }, ints(fares["line3"]!!.jsonObject["matrix"]!!.jsonArray)),
                disputed, areas,
            )
        }
    }
}
