package com.overtimelabs.peakpune

import com.overtimelabs.peakpune.data.Library
import java.io.File

/** Reads the repository's ../data files exactly as the Gradle sync task maps them. */
object TestData {
    val dir = File(System.getProperty("peak.data") ?: "../../data")
    private val map = mapOf(
        "publication-audit.json" to "publication-audit.json",
        "places.json" to "batch-1-places/places.json",
        "outdoors.json" to "batch-2-outdoors/outdoors.json",
        "events.json" to "batch-3-events/events.json",
        "meetups.json" to "batch-4-meetups/meetups.json",
        "metro.json" to "metro/metro.json",
        "areas.json" to "metro/areas.json",
        "history.json" to "history.json",
        "shopping.json" to "shopping.json",
    )
    fun read(name: String): String? = dir.resolve(map.getValue(name)).takeIf { it.exists() }?.readText()
    val library: Library by lazy { Library.load(::read) }
}
