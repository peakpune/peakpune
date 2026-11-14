package com.overtimelabs.peakpune.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.NorthEast
import androidx.compose.material.icons.outlined.AccountBalance
import androidx.compose.material.icons.outlined.Code
import androidx.compose.material.icons.outlined.Event
import androidx.compose.material.icons.outlined.Groups
import androidx.compose.material.icons.outlined.Info
import androidx.compose.material.icons.outlined.Place
import androidx.compose.material.icons.outlined.Storefront
import androidx.compose.material.icons.outlined.Terrain
import androidx.compose.material.icons.outlined.Train
import androidx.compose.material.icons.outlined.Weekend
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import com.overtimelabs.peakpune.data.STALE_AFTER_DAYS
import com.overtimelabs.peakpune.data.Verification
import com.overtimelabs.peakpune.data.currentEvents
import com.overtimelabs.peakpune.data.longDate
import com.overtimelabs.peakpune.data.thisWeekend
import com.overtimelabs.peakpune.ui.LocalAppState
import com.overtimelabs.peakpune.ui.LocalNav
import com.overtimelabs.peakpune.ui.components.Action
import com.overtimelabs.peakpune.ui.components.CategoryTile
import com.overtimelabs.peakpune.ui.components.EmptyState
import com.overtimelabs.peakpune.ui.components.PrimaryButton
import com.overtimelabs.peakpune.ui.components.SecondaryButton
import com.overtimelabs.peakpune.ui.components.SectionHead
import com.overtimelabs.peakpune.ui.components.Signboard
import com.overtimelabs.peakpune.ui.components.Wordmark
import com.overtimelabs.peakpune.ui.openLink
import com.overtimelabs.peakpune.ui.theme.PP
import com.overtimelabs.peakpune.ui.theme.body

private data class Tile(val title: String, val subtitle: String, val icon: ImageVector, val onClick: () -> Unit)

@Composable
fun HomeScreen() {
    val state = LocalAppState.current
    val nav = LocalNav.current
    val lib = state.library
    val now = state.now()
    val weekend = thisWeekend(lib.events, now)
    val upcoming = currentEvents(lib.events, now).filterNot { it.isRecurring }.take(3)
    val featured = lib.places.filter { it.status == Verification.VERIFIED && it.hours != null }.take(4)
    val tiles = listOf(
        Tile("Places", "${lib.places.size} checked at the source", Icons.Outlined.Place) { state.tab = 1 },
        Tile("Loops and treks", "${lib.runs.size} city loops, ${lib.treks.size} trips", Icons.Outlined.Terrain) { state.tab = 2 },
        Tile("Events", "Plans, with sources", Icons.Outlined.Event) { state.tab = 3 },
        Tile("Pune Metro", "Journey planner, works offline", Icons.Outlined.Train) { state.tab = 4 },
        Tile("History", if (lib.history.isEmpty()) "Verified timeline, coming soon" else "${lib.history.size} verified entries", Icons.Outlined.AccountBalance, nav::history),
        Tile("Shopping", if (lib.shops.isEmpty() && lib.shoppingAreas.isEmpty()) "Markets and old shops, coming soon" else "Markets and old shops", Icons.Outlined.Storefront, nav::shopping),
        Tile("Meetups", "${lib.meetups.size} communities to join", Icons.Outlined.Groups) { state.tab = 3 },
        Tile("About", "Who checks what, and when", Icons.Outlined.Info, nav::about),
    )
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(bottom = PP.s12)) {
        item {
            Column(Modifier.padding(start = PP.s4, end = PP.s4, top = PP.s6)) {
                Text("Pune, checked at the source.", style = MaterialTheme.typography.displaySmall)
                Spacer(Modifier.height(PP.s3))
                Text("Places, loops and treks, plans and an offline metro guide. Every listing shows where it came from and when we checked.", style = body(17, 500, 1.5f))
            }
        }
        item { SectionHead("This weekend in Pune", "Source-listed plans. Check dates and prices on the listing before you book.", "All events") { state.tab = 3 } }
        when {
            weekend.isNotEmpty() -> items(weekend, key = { it.id }) { e -> Column(Modifier.padding(horizontal = PP.s4, vertical = PP.s2)) { EventCard(e) { nav.event(e.id) } } }
            upcoming.isNotEmpty() -> {
                item { Text("Nothing listed for this weekend. Coming up next:", style = body(15, 600), modifier = Modifier.padding(horizontal = PP.s4)) }
                items(upcoming, key = { it.id }) { e -> Column(Modifier.padding(horizontal = PP.s4, vertical = PP.s2)) { EventCard(e) { nav.event(e.id) } } }
            }
            else -> item { EmptyState("A quiet weekend.", "No dated plans right now. A Puneri afternoon nap is also a plan. Or try a loop.", Icons.Outlined.Weekend, listOf(Action("Loops and treks", primary = true) { state.tab = 2 })) }
        }
        item { SectionHead("Browse") }
        // Two tiles per row, each row as tall as its tallest tile, so text can grow without clipping.
        items(tiles.chunked(2)) { row ->
            Row(Modifier.fillMaxWidth().padding(horizontal = PP.s4, vertical = PP.s2).height(IntrinsicSize.Min), horizontalArrangement = Arrangement.spacedBy(PP.s4)) {
                row.forEach { t -> CategoryTile(tiles.indexOf(t), t.title, t.subtitle, t.icon, Modifier.weight(1f).fillMaxHeight(), t.onClick) }
                if (row.size == 1) Spacer(Modifier.weight(1f))
            }
        }
        item { SectionHead("Places, checked at the source", "Hours and prices are shown only where checked.", "All ${lib.places.size}") { state.tab = 1 } }
        items(featured, key = { it.id }) { p -> Column(Modifier.padding(horizontal = PP.s4, vertical = PP.s2)) { PlaceCard(p) { nav.place(p.id) } } }
    }
}

/** About and settings: credits, content-checked dates, links, privacy. */
@Composable
fun AboutScreen() {
    val state = LocalAppState.current
    val nav = LocalNav.current
    val context = LocalContext.current
    val lib = state.library
    val t = MaterialTheme.typography
    @Composable fun row(label: String, value: String) = Column(Modifier.padding(vertical = PP.s2).semantics(mergeDescendants = true) {}) {
        Text(label, style = body(14, 600, color = PP.InkSoft)); Text(value, style = t.bodyLarge)
    }
    @Composable fun head(s: String) { Spacer(Modifier.height(PP.s8)); Text(s, style = t.headlineSmall, modifier = Modifier.semantics { heading() }); Spacer(Modifier.height(PP.s2)) }
    SubScreen("About", nav::back) {
        Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(start = PP.s4, end = PP.s4, top = PP.s6, bottom = PP.s12)) {
            Wordmark()
            Spacer(Modifier.height(PP.s4))
            Text("An open-source Pune discovery project: places, outdoors, plans, history, shopping and an offline metro guide. This app is the phone companion to peakpune.com: same data, same rules.", style = t.bodyLarge)
            Spacer(Modifier.height(PP.s5))
            Row(horizontalArrangement = Arrangement.spacedBy(PP.s3)) {
                PrimaryButton("peakpune.com", { context.openLink(PP.SITE) }, icon = Icons.Filled.NorthEast)
                SecondaryButton("Source code", { context.openLink(PP.REPO) }, icon = Icons.Outlined.Code)
            }
            head("When content was checked")
            row("Places, outdoors, events and meetups", "Publication audit of ${longDate(lib.auditCheckedAt)}")
            row("Pune Metro fares and stations", "Verified ${longDate(lib.metro.verifiedOn)}")
            row("History", lib.history.maxOfOrNull { it.checkedAt }?.let { "Latest check ${longDate(it)}" } ?: "Not added yet")
            row("Shopping", lib.shops.maxOfOrNull { it.checkedAt }?.let { "Latest check ${longDate(it)}" } ?: "Not added yet")
            Text("Entries checked more than $STALE_AFTER_DAYS days ago are flagged for a re-check. This version carries its data inside it: update the app to get newer listings.", style = t.bodySmall)
            head("Privacy")
            Text("No accounts, no ads, no analytics and no tracking. The app does not connect to the internet: links, maps, sharing and calendar entries open other apps when you choose. Two settings stay on this phone: that you have seen the welcome screen, and your History language.", style = t.bodyMedium)
            head("Credits")
            Text(
                "Content and code: Peak Pune, MIT licence. Published by OverTime Labs.\n" +
                    "Listings: the organiser, venue and operator pages linked on every entry.\n" +
                    "Map coordinates: © OpenStreetMap contributors, under the Open Database Licence.\n" +
                    "Fonts: Fraunces and Inter, under the SIL Open Font Licence (full text in the app's assets).",
                style = t.bodyMedium,
            )
            Spacer(Modifier.height(PP.s8))
            Text("Version 1.0.0", style = t.bodySmall)
        }
    }
}

/** One short welcome, then straight to content. No login, no carousel. */
@Composable
fun WelcomeScreen(onDone: () -> Unit) {
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = PP.s6, vertical = PP.s10)) {
        Wordmark()
        Spacer(Modifier.height(PP.s12))
        Signboard("Pune, checked at the source.", "Works offline · No login")
        Spacer(Modifier.height(PP.s12))
        Text("Places, loops and treks, plans, history, shopping and the metro. Every entry says where it came from and when it was checked.", style = MaterialTheme.typography.bodyLarge)
        Spacer(Modifier.height(PP.s8))
        PrimaryButton("Start exploring", onDone, Modifier.fillMaxWidth())
    }
}
