// Typed models for the bundled data. Field names follow the JSON in ../data exactly.
// Screens read these classes; they never contain content themselves.
package com.overtimelabs.peakpune.data

import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.doubleOrNull
import kotlinx.serialization.json.intOrNull
import java.net.URI
import java.time.LocalDate
import java.time.OffsetDateTime

/** 'UNKNOWN', blank strings and null all mean "not known". */
fun JsonObject.known(key: String): String? {
    val v = this[key]
    if (v !is JsonPrimitive || !v.isString) return null
    val s = v.content.trim()
    return if (s.isEmpty() || s == "UNKNOWN") null else s
}

fun JsonObject.num(key: String): Double? = (this[key] as? JsonPrimitive)?.takeUnless { it.isString }?.doubleOrNull
fun JsonObject.int(key: String): Int? = (this[key] as? JsonPrimitive)?.let { it.intOrNull ?: it.content.toIntOrNull() }
fun JsonObject.bool(key: String): Boolean = (this[key] as? JsonPrimitive)?.booleanOrNull == true
fun JsonObject.strings(key: String): List<String> =
    (this[key] as? JsonArray)?.mapNotNull { (it as? JsonPrimitive)?.takeIf { p -> p.isString }?.content } ?: emptyList()

fun parseDate(s: String): LocalDate = LocalDate.parse(s.take(10))
fun parseInstant(s: String?): OffsetDateTime? = s?.let { runCatching { OffsetDateTime.parse(it) }.getOrNull() }

/** A cited source. The places/outdoors/events/meetups files store plain URLs; history and
 *  shopping use {label, url}. Both are accepted. */
data class SourceLink(val url: String, val label: String? = null) {
    val host: String get() = runCatching { URI(url).host?.removePrefix("www.") }.getOrNull() ?: url
    val title: String get() = label ?: host

    companion object {
        fun list(v: JsonElement?): List<SourceLink> = (v as? JsonArray)?.mapNotNull { s ->
            when {
                s is JsonPrimitive && s.isString && s.content.isNotBlank() -> SourceLink(s.content.trim())
                s is JsonObject && s.known("url") != null -> SourceLink(s.known("url")!!, s.known("label"))
                else -> null
            }
        } ?: emptyList()
    }
}

enum class Verification { VERIFIED, PARTIAL, UNVERIFIED }

private fun verification(j: JsonObject) = when (j.known("status")) {
    "verified" -> Verification.VERIFIED
    "partial" -> Verification.PARTIAL
    else -> Verification.UNVERIFIED
}

/** Fields shared by places, outdoors, events and meetups. */
sealed class Listing(j: JsonObject) {
    val id: String = j.known("id")!!
    val name: String = j.known("name") ?: ""
    val type: String = j.known("type") ?: ""
    val tags: List<String> = j.strings("tags")
    val neighbourhood: String? = j.known("neighbourhood")
    val address: String? = j.known("address")
    val lat: Double? = j.num("lat")
    val lon: Double? = j.num("lon")
    val urlOfficial: String? = j.known("url_official")
    val urlDeep: String? = j.known("url_deep")
    val summary: String = j.known("summary") ?: ""
    val status: Verification = verification(j)
    val sources: List<SourceLink> = SourceLink.list(j["sources"])

    /** When Peak Pune last checked the listing against its sources. */
    val checkedAt: LocalDate = parseDate(j.known("checked_at")!!)

    /** The source itself says it is more than 90 days old (`stale_over_90_days`). */
    val sourceStale: Boolean = j.bool("stale_over_90_days")
    val notes: String? = j.known("notes")
    val hasCoordinates: Boolean get() = lat != null && lon != null

    /** The page on peakpune.com for this listing. */
    abstract val webUrl: String
}

class Place(j: JsonObject) : Listing(j) {
    val hours: String? = j.known("hours")
    val priceNote: String? = j.known("price_note")
    val goodFor: List<String> = j.strings("good_for")
    override val webUrl get() = "https://peakpune.com/places/${id.removePrefix("place-")}/"
}

class Outdoor(j: JsonObject) : Listing(j) {
    val distanceKm: Double? = j.num("distance_km")
    val difficulty: String? = j.known("difficulty")

    /** "no", or null when the source did not check lighting. */
    val litAtNight: String? = j.known("lit_at_night")
    val distanceFromPuneKm: Double? = j.num("distance_from_pune_km")
    val travelTimeText: String? = j.known("travel_time_text")
    val trekTimeText: String? = j.known("trek_time_text")
    val startPoint: String? = j.known("start_point")
    val bestMonths: String? = j.known("best_months")
    val isTrek get() = type == "trek"
    val isRun get() = type == "run-route"
    override val webUrl get() = "https://peakpune.com/outdoors/${id.replace(Regex("^run-(trek-)?"), "")}/"
}

class EventListing(j: JsonObject) : Listing(j) {
    /** Exact start, only when the source gives a time. */
    val start: OffsetDateTime? = parseInstant(j.known("start"))
    val end: OffsetDateTime? = parseInstant(j.known("end"))

    /** YYYY-MM-DD; null for recurring listings. */
    val startDate: LocalDate? = j.known("start_date")?.let(::parseDate)

    /** The date part of `end`, used for all-day spans. */
    val endDate: LocalDate? = j.known("end")?.let(::parseDate)
    val recurrence: String? = j.known("recurrence")
    val ticketUrl: String? = j.known("ticket_url")
    val eventStatus: String? = j.known("event_status")
    val expiresAt: OffsetDateTime? = parseInstant(j.known("expires_at"))
    val organiser: String? = j.known("organiser")
    val priceNote: String? = j.known("price_note")
    val linkedId: String? = j.known("linked_id")
    val isRecurring get() = startDate == null
    override val webUrl get() = "https://peakpune.com/events/"
}

enum class Activity { ACTIVE, DORMANT, UNKNOWN }

class Meetup(j: JsonObject) : Listing(j) {
    val scheduleText: String? = j.known("schedule_text")
    val joinUrl: String? = j.known("join_url")
    val lastPublicActivity: LocalDate? = j.known("last_public_activity")?.let(::parseDate)
    val activity: Activity = when (j.known("activity_state")) {
        "active" -> Activity.ACTIVE
        "DORMANT" -> Activity.DORMANT
        else -> Activity.UNKNOWN
    }
    val costNote: String? = j.known("cost_note")
    val linkedId: String? = j.known("linked_id")
    override val webUrl get() = "https://peakpune.com/meetups/"
}

/** history.json: [{ id, era, year, date_label, title_en, title_mr, summary_en, summary_mr, sources: [{label, url}], checked_at }] */
class HistoryEntry(j: JsonObject) {
    val id: String = j.known("id")!!
    val era: String = j.known("era") ?: "Undated"
    val year: Int? = j.int("year")
    val dateLabel: String? = j.known("date_label")
    val titleEn: String = j.known("title_en") ?: ""
    val titleMr: String? = j.known("title_mr")
    val summaryEn: String = j.known("summary_en") ?: ""
    val summaryMr: String? = j.known("summary_mr")
    val sources: List<SourceLink> = SourceLink.list(j["sources"])
    val checkedAt: LocalDate = parseDate(j.known("checked_at")!!)
    val whenText: String get() = dateLabel ?: year?.toString() ?: "Undated"
}

private fun textOrList(j: JsonObject, key: String): String? = when (val v = j[key]) {
    is JsonArray -> v.mapNotNull { (it as? JsonPrimitive)?.content }.takeIf { it.isNotEmpty() }?.joinToString(", ")
    null, JsonNull -> null
    else -> j.known(key)
}

/** shopping.json areas: { id, name, area, known_for, best_for, notes, sources } */
class ShoppingArea(j: JsonObject, fallbackChecked: LocalDate?) {
    val id: String = j.known("id")!!
    val name: String = j.known("name") ?: ""
    val area: String? = j.known("area")
    val knownFor: String? = textOrList(j, "known_for")
    val bestFor: String? = textOrList(j, "best_for")
    val notes: String? = j.known("notes")
    val sources: List<SourceLink> = SourceLink.list(j["sources"])

    /** Areas carry no checked_at in the schema; the newest shop check date is used. */
    val checkedAt: LocalDate? = j.known("checked_at")?.let(::parseDate) ?: fallbackChecked
}

/** shopping.json shops: { id, name, area, known_for, since, note, sources, checked_at } */
class Shop(j: JsonObject) {
    val id: String = j.known("id")!!
    val name: String = j.known("name") ?: ""
    val area: String? = j.known("area")
    val knownFor: String? = textOrList(j, "known_for")

    /** A verified founding year, only where the source gives one. */
    val since: Int? = j.int("since")
    val note: String? = j.known("note")
    val sources: List<SourceLink> = SourceLink.list(j["sources"])
    val checkedAt: LocalDate = parseDate(j.known("checked_at")!!)
}
