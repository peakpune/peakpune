// Kotlin port of validateMetro and validateAreas from scripts/metro-model.mjs. Every failure is
// a string; an empty list means the data is self-consistent. It cannot prove a real-world fare
// or status is right; that is what verified_on and the sources are for.
package com.overtimelabs.peakpune.metro

import com.overtimelabs.peakpune.data.known
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.double
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import java.net.URI
import java.time.LocalDate

private fun isDate(s: String?) = s != null && Regex("^\\d{4}-\\d{2}-\\d{2}$").matches(s) && runCatching { LocalDate.parse(s) }.isSuccess
private fun isHttps(s: String?) = s != null && runCatching { URI(s).scheme == "https" }.getOrDefault(false)
private val MAHA = listOf("purple", "aqua")

fun validateMetro(data: JsonObject, areasDoc: JsonObject): List<String> {
    val errs = mutableListOf<String>()
    if (!isDate(data.known("verified_on"))) errs += "verified_on must be YYYY-MM-DD"
    if (data.known("timezone") != "Asia/Kolkata") errs += "timezone must be Asia/Kolkata"
    (data["provenance"] as? JsonObject)?.forEach { (k, v) ->
        val urls = if (v is JsonArray) v.map { it.jsonPrimitive.content } else listOf(v.jsonPrimitive.content)
        if (urls.any { !isHttps(it) }) errs += "provenance.$k is not an https URL"
    }
    val model = runCatching { MetroNetwork.fromJson(data, areasDoc) }.getOrElse { return listOf("model: ${it.message}") }
    val ids = model.stations.keys
    for (l in model.lines) {
        val order = l.stops.map { it.station }
        if (order.toSet().size != order.size) errs += "${l.id}: duplicate station in order"
        if (order.size < 2) errs += "${l.id}: fewer than two stations"
        for (s in l.stops) {
            val k = "${l.id}:${s.station}"
            if (s.status.state == StopState.UNKNOWN) errs += "$k: status state unknown"
            if (s.status.source == StatusSource.OTHER) errs += "$k: status_source"
            if (s.status.source == StatusSource.MEDIA && s.status.verified) errs += "$k: media-sourced status cannot be verified:true"
            if (!isDate(s.status.asOf)) errs += "$k: as_of date"
        }
    }
    val rawLines = data["lines"]!!.jsonArray.map { it.jsonObject }
    for (l in rawLines.filter { it.known("id") in MAHA }) {
        val codes = l["station_codes"]!!.jsonObject
        val order = l["station_order"]!!.jsonArray.map { it.jsonPrimitive.content }
        order.filter { codes[it] == null }.forEach { errs += "${l.known("id")}: no station code for $it" }
        codes.keys.filter { it !in order }.forEach { errs += "${l.known("id")}: station code for unknown station $it" }
    }
    // Maha fare matrix.
    val mm = data["fares"]!!.jsonObject["maha_metro"]!!.jsonObject
    val order = mm["station_order"]!!.jsonArray.map { it.jsonPrimitive.content }
    val m = model.mahaFares.rows
    val n = order.size
    model.mahaFares.order.filter { it !in ids }.forEach { errs += "fare table references unknown station $it" }
    val expected = model.lines.filter { it.id in MAHA }.flatMap { l -> l.stops.filter { it.status.state == StopState.OPEN }.map { it.station } }.toSet()
    val maha = model.mahaFares.order.toSet()
    (expected - maha).forEach { errs += "open Maha station $it has no fare row" }
    (maha - expected).forEach { errs += "fare row $it is not an open Maha station" }
    val pairs = mm["disputed_fare_pairs"]!!.jsonObject["pairs"]!!.jsonArray.map { it.jsonObject }
    val disputed = pairs.map { "${it.known("from")}>${it.known("to")}" }.toSet()
    fun listed(a: String, b: String) = "$a>$b" in disputed || "$b>$a" in disputed
    if (m.size != n || m.any { it.size != n }) errs += "maha matrix is not ${n}x$n" else {
        for (i in 0 until n) {
            if (m[i][i] != 0) errs += "maha diagonal ${order[i]}"
            for (j in 0 until n) {
                if (m[i][j] !in listOf(0, 10, 15, 20, 25, 30, 35)) errs += "maha fare $i,$j = ${m[i][j]}"
                if (i < j && m[i][j] != m[j][i] && !listed(order[i], order[j])) errs += "maha unlisted asymmetric pair ${order[i]}/${order[j]}"
            }
        }
        for (p in pairs) {
            val i = order.indexOf(p.known("from")); val j = order.indexOf(p.known("to"))
            if (i < 0 || j < 0) { errs += "disputed pair uses unknown code"; continue }
            val ab = p["printed_from_to"]!!.jsonPrimitive.int; val ba = p["printed_to_from"]!!.jsonPrimitive.int
            if (m[i][j] != ab || m[j][i] != ba) errs += "disputed pair ${p.known("from")}/${p.known("to")} does not match matrix"
            if (ab == ba) errs += "disputed pair ${p.known("from")}/${p.known("to")} is symmetric"
        }
        // CVC and CVC_AQ are one physical station: rows and columns agree except at disputed pairs.
        val a = order.indexOf("CVC"); val b = order.indexOf("CVC_AQ")
        for (k in 0 until n) {
            if (k == a || k == b) continue
            val code = order[k]
            if ((m[a][k] != m[b][k] || m[k][a] != m[k][b]) && !listed(code, "CVC_AQ") && !listed(code, "CVC")) errs += "CVC and CVC_AQ differ at $code and the pair is not listed as disputed"
        }
        val vals = m.flatten().filter { it > 0 }
        if (vals.min() != mm["min"]!!.jsonPrimitive.int || vals.max() != mm["max"]!!.jsonPrimitive.int) errs += "maha min/max do not match the matrix"
    }
    // Line 3 fare matrix.
    val l3 = data["fares"]!!.jsonObject["line3"]!!.jsonObject
    val p = model.pinkFares.rows; val pn = model.pinkFares.order.size
    if (p.size != pn || p.any { it.size != pn }) errs += "line3 matrix is not ${pn}x$pn" else {
        for (i in 0 until pn) for (j in 0 until pn) {
            if (p[i][j] !in listOf(12, 25, 37, 43, 49, 62)) errs += "line3 fare $i,$j = ${p[i][j]}"
            if (p[i][j] != p[j][i]) errs += "line3 asymmetric $i,$j"
        }
        val vals = p.flatten()
        if (vals.min() != l3["min"]!!.jsonPrimitive.int || vals.max() != l3["max"]!!.jsonPrimitive.int) errs += "line3 min/max do not match the matrix"
    }
    // Line 3 open/closed lists partition the order.
    val pinkRaw = rawLines.first { it.known("id") == "pink_line3" }
    val st = pinkRaw["station_status"]!!.jsonObject
    val all = ((st["open"] as? JsonArray).orEmpty() + (st["closed"] as? JsonArray).orEmpty()).map { it.jsonPrimitive.content }
    val pinkOrder = pinkRaw["station_order"]!!.jsonArray.map { it.jsonPrimitive.content }
    if (all.toSet().size != all.size || all.size != pinkOrder.size || !pinkOrder.all { it in all }) errs += "line3 open/closed lists do not partition the station order"
    // Interchange: stations on several lines are exactly the declared one.
    val ic = data["interchange"]!!.jsonObject
    val multi = model.stations.values.filter { it.lines.size > 1 }
    if (multi.size != 1 || multi[0].id != metroSlug(ic.known("station")!!)) errs += "multi-line stations ${multi.map { it.id }} != declared ${ic.known("station")}"
    else if (multi[0].lines.sorted() != ic["lines"]!!.jsonArray.map { it.jsonPrimitive.content }.sorted()) errs += "interchange lines do not match membership"
    val sj = model.stations.values.filter { it.id.startsWith("shivaji-nagar") }
    if (sj.size != 2 || sj.any { it.lines.size != 1 }) errs += "Shivaji Nagar must stay two separate stations"
    // Lines connect through interchanges.
    val seen = mutableSetOf(model.lines.first().id)
    var grew = true
    while (grew) {
        grew = false
        for (s in model.stations.values) if (s.lines.any { it in seen }) for (x in s.lines) if (seen.add(x)) grew = true
    }
    if (seen.size != model.lines.size) errs += "lines are not connected through interchanges"
    // Approved extensions must not appear as stations.
    for (nm in listOf("Nigdi", "Katraj", "Wagholi", "Chandni Chowk", "Akurdi", "Chinchwad", "Market Yard", "Padmavati")) {
        if (model.stations.values.any { nm in it.names }) errs += "unbuilt extension station $nm is in the network"
    }
    // Operators.
    val ops = data["operators"]!!.jsonObject
    if (ops["maha_metro"]!!.jsonObject.known("whatsapp_eticket") != "https://wa.me/9420101990") errs += "Maha Metro WhatsApp link changed"
    if (ops["pitcmrl"]!!.jsonObject["whatsapp_eticket"] !is JsonNull) errs += "Line 3 WhatsApp number must stay null until verified"
    rawLines.filter { ops[it.known("operator")] == null }.forEach { errs += "${it.known("id")}: unknown operator" }
    // Discounts must be sourced.
    for (d in data["discounts"]!!.jsonObject["items"]!!.jsonArray.map { it.jsonObject }) {
        if (!isHttps(d.known("source")) || (d["verified"] as? JsonPrimitive)?.booleanOrNull != true) errs += "discount ${d.known("id")} lacks a verified https source"
    }
    return errs
}

fun validateAreas(areasDoc: JsonObject, data: JsonObject): List<String> {
    val errs = mutableListOf<String>()
    val ids = MetroNetwork.fromJson(data, areasDoc).stations.keys
    if (areasDoc.known("verified_on") != data.known("verified_on")) errs += "areas verified_on differs from the metro dataset"
    for (a in areasDoc["areas"]!!.jsonArray.map { it.jsonObject }) {
        val id = a.known("id")
        val refs = (a["references"] as? JsonArray).orEmpty().map { it.jsonObject }
        if (a.known("note") == null || refs.isEmpty()) errs += "$id: missing note or reference point"
        refs.filter { !(it.known("source") ?: "").startsWith("https://www.openstreetmap.org/") }.forEach { _ -> errs += "$id: reference source" }
        var last = -1.0
        for (s in a["stations"]!!.jsonArray.map { it.jsonObject }) {
            if (s.known("id") !in ids) errs += "$id: unknown station ${s.known("id")}"
            val km = s["straight_line_km"]!!.jsonPrimitive.double
            if (km < last) errs += "$id: stations are not closest-first at ${s.known("id")}"
            last = km
        }
        if ((a["has_station"] as? JsonPrimitive)?.booleanOrNull == true && a["stations"]!!.jsonArray.isEmpty()) errs += "$id: has_station but no stations"
        if (Regex("walk|minute", RegexOption.IGNORE_CASE).containsMatchIn(a.known("note") ?: "")) errs += "$id: note states a walking or travel time"
    }
    return errs
}
