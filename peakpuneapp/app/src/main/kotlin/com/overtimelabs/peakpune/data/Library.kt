package com.overtimelabs.peakpune.data

import com.overtimelabs.peakpune.metro.MetroNetwork
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.jsonObject
import java.time.LocalDate

/** Everything the app shows, loaded from bundled assets. Nothing is fetched. */
class Library(
    /** Date of the publication audit; every published listing carries it as checked_at. */
    val auditCheckedAt: LocalDate,
    val places: List<Place>,
    val outdoors: List<Outdoor>,
    val events: List<EventListing>,
    val meetups: List<Meetup>,
    val history: List<HistoryEntry>,
    val historyLoaded: Boolean,
    val shoppingAreas: List<ShoppingArea>,
    val shops: List<Shop>,
    val shoppingLoaded: Boolean,
    val metro: MetroNetwork,
) {
    fun place(id: String?) = places.firstOrNull { it.id == id }
    val neighbourhoods: List<String> get() = places.map { it.neighbourhood ?: "Pune" }.distinct().sorted()
    val runs: List<Outdoor> get() = outdoors.filter { it.isRun }
    val treks: List<Outdoor> get() = outdoors.filterNot { it.isRun }.sortedBy { it.distanceFromPuneKm ?: 9999.0 }

    fun copy(history: List<HistoryEntry> = this.history, historyLoaded: Boolean = this.historyLoaded, shoppingAreas: List<ShoppingArea> = this.shoppingAreas, shops: List<Shop> = this.shops, shoppingLoaded: Boolean = this.shoppingLoaded) =
        Library(auditCheckedAt, places, outdoors, events, meetups, history, historyLoaded, shoppingAreas, shops, shoppingLoaded, metro)

    companion object {
        /** [read] returns a bundled file's text, or null when the file is absent. */
        fun load(read: (String) -> String?): Library {
            fun json(name: String): JsonElement = Json.parseToJsonElement(read(name) ?: error("missing $name"))
            val audit = json("publication-audit.json").jsonObject
            fun rows(name: String) = publishAudited((json(name) as JsonArray).map { it.jsonObject }, audit)
            val historyRaw = read("history.json")?.let { runCatching { Json.parseToJsonElement(it) }.getOrNull() }
            val shoppingRaw = read("shopping.json")?.let { runCatching { Json.parseToJsonElement(it) }.getOrNull() }
            val (areas, shops) = parseShopping(shoppingRaw)
            return Library(
                auditCheckedAt = parseDate((audit["checked_at"] as JsonPrimitive).content),
                places = rows("places.json").map(::Place),
                outdoors = rows("outdoors.json").map(::Outdoor),
                events = rows("events.json").map(::EventListing),
                meetups = rows("meetups.json").map(::Meetup),
                history = parseHistory(historyRaw),
                historyLoaded = historyRaw != null,
                shoppingAreas = areas,
                shops = shops,
                shoppingLoaded = shoppingRaw != null,
                metro = MetroNetwork.fromJson(json("metro.json").jsonObject, json("areas.json").jsonObject),
            )
        }
    }
}

/** public/lib/publication.js: only rows the audit marks "publish" appear, with the audit's
 *  overrides applied and the audit date as checked_at. Unknown ids stay hidden. */
fun publishAudited(rows: List<JsonObject>, audit: JsonObject): List<JsonObject> {
    val records = audit["records"] as? JsonObject ?: return emptyList()
    return rows.mapNotNull { row ->
        val rec = records[row.known("id")] as? JsonObject ?: return@mapNotNull null
        if (rec.known("decision") != "publish") return@mapNotNull null
        val overrides = rec["overrides"] as? JsonObject ?: JsonObject(emptyMap())
        JsonObject(row + overrides + ("checked_at" to audit["checked_at"]!!))
    }
}

/** History entries without a source never ship. Sorted by year. */
fun parseHistory(raw: JsonElement?): List<HistoryEntry> =
    (raw as? JsonArray).orEmpty().mapNotNull { r ->
        runCatching { HistoryEntry(r.jsonObject) }.getOrNull()?.takeIf { it.sources.isNotEmpty() && it.titleEn.isNotEmpty() }
    }.sortedBy { it.year ?: 99999 }

fun parseShopping(raw: JsonElement?): Pair<List<ShoppingArea>, List<Shop>> {
    val obj = raw as? JsonObject ?: return emptyList<ShoppingArea>() to emptyList()
    val shops = (obj["shops"] as? JsonArray).orEmpty().mapNotNull { r ->
        runCatching { Shop(r.jsonObject) }.getOrNull()?.takeIf { it.sources.isNotEmpty() && it.name.isNotEmpty() }
    }
    val newest = shops.maxOfOrNull { it.checkedAt }
    val areas = (obj["areas"] as? JsonArray).orEmpty().mapNotNull { r ->
        runCatching { ShoppingArea(r.jsonObject, newest) }.getOrNull()?.takeIf { it.sources.isNotEmpty() && it.name.isNotEmpty() }
    }
    return areas to shops
}
