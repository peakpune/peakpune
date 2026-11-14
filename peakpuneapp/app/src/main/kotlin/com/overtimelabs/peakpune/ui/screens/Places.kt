package com.overtimelabs.peakpune.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.NorthEast
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.SearchOff
import androidx.compose.material.icons.outlined.Map
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.overtimelabs.peakpune.data.Outdoor
import com.overtimelabs.peakpune.data.Place
import com.overtimelabs.peakpune.data.Verification
import com.overtimelabs.peakpune.data.priceText
import com.overtimelabs.peakpune.ui.LocalAppState
import com.overtimelabs.peakpune.ui.LocalNav
import com.overtimelabs.peakpune.ui.components.Action
import com.overtimelabs.peakpune.ui.components.DetailPage
import com.overtimelabs.peakpune.ui.components.EmptyState
import com.overtimelabs.peakpune.ui.components.EntryCard
import com.overtimelabs.peakpune.ui.components.Eyebrow
import com.overtimelabs.peakpune.ui.components.Fact
import com.overtimelabs.peakpune.ui.components.FilterPill
import com.overtimelabs.peakpune.ui.components.LevelBadge
import com.overtimelabs.peakpune.ui.components.LinkButton
import com.overtimelabs.peakpune.ui.components.MetaText
import com.overtimelabs.peakpune.ui.components.PillTabs
import com.overtimelabs.peakpune.ui.components.TagPill
import com.overtimelabs.peakpune.ui.components.difficultyFill
import com.overtimelabs.peakpune.ui.mapUrl
import com.overtimelabs.peakpune.ui.openLink
import com.overtimelabs.peakpune.ui.theme.PP
import com.overtimelabs.peakpune.ui.theme.body

val typeLabel = mapOf(
    "museum" to "Museum", "heritage" to "Heritage site", "temple" to "Temple", "bookstore" to "Bookstore", "gallery" to "Art gallery",
    "cultural-centre" to "Cultural centre", "archive" to "Archive", "cafe" to "Cafe", "restaurant" to "Restaurant", "bar" to "Bar and brewpub",
    "sweets" to "Sweet shop", "park" to "Park", "zoo" to "Zoo", "bakery" to "Bakery", "garden" to "Garden", "market" to "Market",
)

fun tagLabel(t: String) = t.replace('-', ' ')

@Composable
fun ScreenHeader(eyebrow: String, title: String, note: String? = null) = Column(Modifier.fillMaxWidth().padding(start = PP.s4, end = PP.s4, top = PP.s6, bottom = PP.s3)) {
    Eyebrow(eyebrow)
    Spacer(Modifier.height(PP.s2))
    Text(title, style = MaterialTheme.typography.headlineMedium, modifier = Modifier.semantics { heading() })
    if (note != null) { Spacer(Modifier.height(PP.s2)); Text(note, style = MaterialTheme.typography.bodySmall) }
}

/** Places by neighbourhood, with search and tag filters. */
@Composable
fun ExploreScreen() {
    val lib = LocalAppState.current.library
    val nav = LocalNav.current
    var query by rememberSaveable { mutableStateOf("") }
    var area by rememberSaveable { mutableStateOf<String?>(null) }
    val tags = remember { mutableStateListOf<String>() }
    val popular = remember(lib) { lib.places.flatMap { it.tags }.groupingBy { it }.eachCount().entries.sortedByDescending { it.value }.take(12).map { it.key } }
    val q = query.trim().lowercase()
    val shown = lib.places.filter { p ->
        (area == null || (p.neighbourhood ?: "Pune") == area) && tags.all { it in p.tags } &&
            (q.isEmpty() || listOf(p.name, p.summary, p.neighbourhood ?: "", typeLabel[p.type] ?: p.type, *p.tags.toTypedArray()).joinToString(" ").lowercase().contains(q))
    }
    val byArea = shown.groupBy { it.neighbourhood ?: "Pune" }.toSortedMap()
    val filtering = q.isNotEmpty() || area != null || tags.isNotEmpty()
    fun clear() { query = ""; area = null; tags.clear() }

    LazyColumn(Modifier.fillMaxSize(), state = rememberLazyListState(), contentPadding = PaddingValues(bottom = PP.s12)) {
        item { ScreenHeader("Explore Pune", "Places, checked at the source.", "${lib.places.size} places. Addresses, timings and prices come from each venue's own page, with the date we checked.") }
        item {
            OutlinedTextField(
                value = query, onValueChange = { query = it }, singleLine = true,
                placeholder = { Text("Search places, areas, tags", style = body(16, 400, color = PP.InkSoft)) },
                leadingIcon = { Icon(Icons.Filled.Search, null) },
                trailingIcon = { if (query.isNotEmpty()) IconButton(onClick = { query = "" }) { Icon(Icons.Filled.Close, "Clear search") } },
                shape = RoundedCornerShape(PP.rInput),
                colors = OutlinedTextFieldDefaults.colors(focusedContainerColor = PP.White, unfocusedContainerColor = PP.White, unfocusedBorderColor = PP.Ink, focusedBorderColor = PP.Brick),
                modifier = Modifier.fillMaxWidth().padding(horizontal = PP.s4),
            )
        }
        item {
            LazyRow(contentPadding = PaddingValues(horizontal = PP.s4), horizontalArrangement = Arrangement.spacedBy(PP.s2), modifier = Modifier.padding(top = PP.s3)) {
                items(lib.neighbourhoods) { a -> FilterPill(a, area == a) { area = if (area == a) null else a } }
            }
            LazyRow(contentPadding = PaddingValues(horizontal = PP.s4), horizontalArrangement = Arrangement.spacedBy(PP.s2)) {
                items(popular) { t -> FilterPill(tagLabel(t), t in tags) { if (t in tags) tags.remove(t) else tags.add(t) } }
            }
        }
        if (filtering) item {
            Row(Modifier.fillMaxWidth().padding(horizontal = PP.s4), verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
                Text("${shown.size} of ${lib.places.size} places", style = body(14, 600), modifier = Modifier.weight(1f).semantics { liveRegion = LiveRegionMode.Polite })
                LinkButton("Clear filters", ::clear)
            }
        }
        if (shown.isEmpty()) item {
            EmptyState("Nothing matches that.", "Even Pune has limits. Try fewer filters, or a different spelling of that peth.", Icons.Filled.SearchOff, listOf(Action("Clear filters", primary = true, onClick = ::clear)))
        }
        byArea.forEach { (a, rows) ->
            item(key = "h-$a") { Text("$a · ${rows.size}", style = MaterialTheme.typography.headlineSmall, modifier = Modifier.padding(start = PP.s4, end = PP.s4, top = PP.s8, bottom = PP.s3).semantics { heading() }) }
            items(rows, key = { it.id }) { p -> Column(Modifier.padding(horizontal = PP.s4, vertical = PP.s2)) { PlaceCard(p) { nav.place(p.id) } } }
        }
    }
}

@Composable
fun PlaceCard(p: Place, onClick: () -> Unit) =
    EntryCard("${typeLabel[p.type] ?: p.type} · ${p.neighbourhood ?: "Pune"}", p.name, onClick, summary = p.summary, footer = p.hours)

@Composable
fun PlaceDetail(id: String) {
    val nav = LocalNav.current
    val context = LocalContext.current
    val p = LocalAppState.current.library.place(id) ?: return nav.back()
    val map = mapUrl(p.name, p.lat, p.lon, p.address)
    DetailPage(
        eyebrow = typeLabel[p.type] ?: "Place", title = p.name, summary = p.summary, sources = p.sources, checkedAt = p.checkedAt,
        shareUrl = p.webUrl, shareLine = listOfNotNull(p.neighbourhood, p.summary).joinToString(" · "), onBack = nav::back,
        badges = { TagPill(p.neighbourhood ?: "Pune", PP.Clay); if (p.status == Verification.PARTIAL) LevelBadge("Some details missing", PP.Paper) },
        flags = listOfNotNull(if (p.sourceStale) "The source for this listing is more than 90 days old. Check with the venue before you go." else null),
        actions = listOfNotNull(
            map?.let { Action("Map", Icons.Outlined.Map, primary = true) { context.openLink(it) } },
            (p.urlDeep ?: p.urlOfficial)?.let { Action("Venue page", Icons.Filled.NorthEast) { context.openLink(it) } },
        ),
        facts = listOfNotNull(
            Fact("Address", p.address ?: "Not stated on the source page"),
            Fact("Timings", p.hours ?: "Not confirmed"),
            Fact("Prices", priceText(p.priceNote)),
            if (p.goodFor.isNotEmpty()) Fact("Good for", p.goodFor.joinToString(", ")) else null,
            p.notes?.let { Fact("Note", it) },
            p.urlOfficial?.let { Fact("Official site", it, link = it) },
        ),
        tags = p.tags.map(::tagLabel),
        osmCredit = p.hasCoordinates,
        provenance = (if (p.status == Verification.VERIFIED) "Name, address and link are confirmed on the venue or organiser page." else "Some details are missing because the source page does not state them.") +
            " Timings and prices change, so confirm with the venue.",
    )
}

private fun km(v: Double) = if (v == Math.floor(v)) "${v.toInt()} km" else "%.1f km".format(java.util.Locale.US, v)

/** Running loops and treks, with distance and difficulty. */
@Composable
fun OutdoorsScreen() {
    val lib = LocalAppState.current.library
    val nav = LocalNav.current
    var tab by rememberSaveable { mutableStateOf(0) }
    Column(Modifier.fillMaxSize()) {
        ScreenHeader("Outdoors", "Loops and treks")
        PillTabs(listOf("Running loops", "Treks and day trips"), tab, { tab = it })
        androidx.compose.animation.AnimatedContent(tab, label = "outdoor-tab") { t ->
            val (rows, intro) = if (t == 0) lib.runs to "Plotted by PuneRunners Club on OpenStreetMap data. Mapped, not run-tested: footpaths, traffic and lighting are unchecked."
            else lib.treks to "Sorted by drive from Pune. Distances, timings and difficulty are as the guides state them. Go early, go in company."
            LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(start = PP.s4, end = PP.s4, top = PP.s4, bottom = PP.s12), verticalArrangement = Arrangement.spacedBy(PP.s4)) {
                item { Text(intro, style = MaterialTheme.typography.bodySmall) }
                items(rows, key = { it.id }) { o ->
                    EntryCard(o.neighbourhood ?: "Pune", o.name, { nav.outdoor(o.id) }, summary = o.summary, meta = { OutdoorMeta(o) })
                }
            }
        }
    }
}

@Composable
private fun OutdoorMeta(o: Outdoor) {
    o.difficulty?.let { LevelBadge(it, difficultyFill(it)) }
    o.distanceKm?.let { MetaText("${km(it)} route") }
    o.distanceFromPuneKm?.let { MetaText("${km(it)} from Pune") }
    o.travelTimeText?.let { MetaText(it) }
}

@Composable
fun OutdoorDetail(id: String) {
    val nav = LocalNav.current
    val context = LocalContext.current
    val o = LocalAppState.current.library.outdoors.firstOrNull { it.id == id } ?: return nav.back()
    val map = mapUrl(o.name, o.lat, o.lon, o.startPoint ?: if (o.isTrek) null else o.address)
    val host = (o.urlDeep ?: o.urlOfficial ?: "").lowercase()
    val who = when { "punerunners" in host -> "PuneRunners Club"; "punetrekkers" in host -> "Pune Trekkers"; else -> "the source" }
    DetailPage(
        eyebrow = if (o.isTrek) "Trek" else if (o.isRun) "Running loop" else "Day trip", title = o.name, summary = o.summary,
        sources = o.sources, checkedAt = o.checkedAt, shareUrl = o.webUrl, onBack = nav::back,
        shareLine = listOfNotNull(o.distanceKm?.let(::km), o.difficulty, o.distanceFromPuneKm?.let { "${km(it)} from Pune" }).joinToString(" · "),
        badges = o.difficulty?.let { d -> { LevelBadge(d, difficultyFill(d)) } },
        flags = listOfNotNull(
            if (o.litAtNight == "no") "Unlit paths. Daylight only." else null,
            if (o.isRun) "Mapped, not run-tested: footpaths, traffic and lighting are unchecked." else null,
            if (o.sourceStale) "The source for this listing is more than 90 days old. Check before you go." else null,
        ),
        actions = listOfNotNull(
            map?.let { Action("Map", Icons.Outlined.Map, primary = true) { context.openLink(it) } },
            (o.urlDeep ?: o.urlOfficial)?.let { Action("Guide page", Icons.Filled.NorthEast) { context.openLink(it) } },
        ),
        facts = listOfNotNull(
            Fact("Area", o.neighbourhood ?: "Pune"),
            o.distanceKm?.let { Fact("Route length", km(it)) },
            Fact("Difficulty", o.difficulty ?: "Not stated by the source"),
            o.distanceFromPuneKm?.let { Fact("From Pune", km(it)) },
            o.travelTimeText?.let { Fact("Drive", it) },
            o.trekTimeText?.let { Fact("Trek time", it) },
            o.startPoint?.let { Fact("Start point", it) },
            if (o.isTrek) Fact("Best months", o.bestMonths ?: "Not stated") else null,
            Fact("Lit at night", if (o.litAtNight == "no") "No. Unlit paths, daylight only" else "Not checked by the source"),
            Fact("Fees and permits", "Not collected. Check with the guide or forest office."),
            o.notes?.let { Fact("Note", it) },
        ),
        tags = o.tags.map(::tagLabel),
        osmCredit = o.hasCoordinates,
        provenance = (if (o.isTrek) "Distances, timings and difficulty are" else "The route and its distance are") +
            " as published by $who. Conditions change, and nobody at Peak Pune has walked or run this for you. Go early, go in company, and check with the source first.",
    )
}

