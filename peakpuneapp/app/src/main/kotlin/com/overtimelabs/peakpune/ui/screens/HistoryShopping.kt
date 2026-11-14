package com.overtimelabs.peakpune.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.outlined.Map
import androidx.compose.material.icons.automirrored.outlined.MenuBook
import androidx.compose.material.icons.outlined.Storefront
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import com.overtimelabs.peakpune.data.HistoryEntry
import com.overtimelabs.peakpune.data.longDate
import com.overtimelabs.peakpune.ui.HistoryLang
import com.overtimelabs.peakpune.ui.LocalAppState
import com.overtimelabs.peakpune.ui.LocalNav
import com.overtimelabs.peakpune.ui.components.Action
import com.overtimelabs.peakpune.ui.components.DetailPage
import com.overtimelabs.peakpune.ui.components.EmptyState
import com.overtimelabs.peakpune.ui.components.EntryCard
import com.overtimelabs.peakpune.ui.components.Fact
import com.overtimelabs.peakpune.ui.components.MetaText
import com.overtimelabs.peakpune.ui.components.PillTabs
import com.overtimelabs.peakpune.ui.components.TagPill
import com.overtimelabs.peakpune.ui.mapUrl
import com.overtimelabs.peakpune.ui.openLink
import com.overtimelabs.peakpune.ui.theme.PP
import com.overtimelabs.peakpune.ui.theme.body
import com.overtimelabs.peakpune.ui.theme.display
import com.overtimelabs.peakpune.ui.theme.marathi

/** Text in the chosen language. Missing Marathi falls back to English and says so; nothing is
 *  machine-translated. */
data class Picked(val text: String, val isMarathi: Boolean, val fellBack: Boolean)

fun pick(lang: HistoryLang, en: String, mr: String?) =
    if (lang == HistoryLang.MR && mr != null) Picked(mr, true, false) else Picked(en, false, lang == HistoryLang.MR)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SubScreen(title: String, onBack: () -> Unit, titleStyle: androidx.compose.ui.text.TextStyle = display(22), content: @Composable () -> Unit) = Scaffold(
    containerColor = PP.Paper,
    topBar = {
        TopAppBar(
            title = { Text(title, style = titleStyle) },
            navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") } },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = PP.Paper),
        )
    },
) { pad -> Column(Modifier.padding(pad)) { content() } }

/** The verified timeline grouped by era, with an English/Marathi toggle. */
@Composable
fun HistoryScreen() {
    val state = LocalAppState.current
    val nav = LocalNav.current
    val haptics = LocalHapticFeedback.current
    val lib = state.library
    val lang = state.historyLang
    val eras = lib.history.groupBy { it.era } // history is sorted by year, so eras come in time order
    SubScreen(if (lang == HistoryLang.MR) "पुण्याचा इतिहास" else "Pune history", nav::back, if (lang == HistoryLang.MR) display(22).marathi() else display(22)) {
        LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(start = PP.s4, end = PP.s4, top = PP.s4, bottom = PP.s12), verticalArrangement = Arrangement.spacedBy(PP.s4)) {
            item {
                SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()) {
                    listOf(HistoryLang.EN to "English", HistoryLang.MR to "मराठी").forEachIndexed { i, (l, label) ->
                        SegmentedButton(
                            selected = lang == l,
                            onClick = { haptics.performHapticFeedback(HapticFeedbackType.SegmentTick); state.setLang(l) },
                            shape = SegmentedButtonDefaults.itemShape(i, 2),
                            colors = SegmentedButtonDefaults.colors(activeContainerColor = PP.Ink, activeContentColor = PP.White, inactiveContainerColor = PP.Paper, activeBorderColor = PP.Ink, inactiveBorderColor = PP.Ink),
                            icon = {},
                        ) { Text(label, style = (if (l == HistoryLang.MR) body(15, 700).marathi() else body(15, 700)).copy(color = if (lang == l) PP.White else PP.Ink)) }
                    }
                }
                Text("A verified timeline: every entry links to its sources.", style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = PP.s3))
            }
            if (lib.history.isEmpty()) item {
                EmptyState(
                    if (lib.historyLoaded) "No verified entries yet." else "The timeline is still being checked.",
                    "Entries appear here only once each one has a source. Pune has waited a few centuries; a few more days is fine.",
                    Icons.AutoMirrored.Outlined.MenuBook, listOf(Action("Explore places", primary = true) { state.tab = 1; nav.back() }),
                )
            }
            eras.forEach { (era, rows) ->
                item(key = "era-$era") { Text(era, style = MaterialTheme.typography.headlineSmall, modifier = Modifier.padding(top = PP.s4).semantics { heading() }) }
                items(rows, key = { it.id }) { e -> HistoryCard(e, lang) { nav.historyEntry(e.id) } }
            }
        }
    }
}

@Composable
private fun HistoryCard(e: HistoryEntry, lang: HistoryLang, onClick: () -> Unit) {
    val title = pick(lang, e.titleEn, e.titleMr)
    val summary = pick(lang, e.summaryEn, e.summaryMr)
    EntryCard(
        e.whenText, title.text, onClick, summary = summary.text,
        titleStyle = MaterialTheme.typography.titleLarge.let { if (title.isMarathi) it.marathi() else it },
        summaryStyle = body(16, 400, 1.5f, PP.InkSoft).let { if (summary.isMarathi) it.marathi() else it },
        footer = if (title.fellBack) "Marathi text not available yet; shown in English." else null,
        meta = { MetaText("${e.sources.size} ${if (e.sources.size == 1) "source" else "sources"}") },
    )
}

@Composable
fun HistoryDetail(id: String) {
    val state = LocalAppState.current
    val nav = LocalNav.current
    val e = state.library.history.firstOrNull { it.id == id } ?: return nav.back()
    val lang = state.historyLang
    val title = pick(lang, e.titleEn, e.titleMr)
    val summary = pick(lang, e.summaryEn, e.summaryMr)
    DetailPage(
        eyebrow = e.era, title = title.text, summary = summary.text, sources = e.sources, checkedAt = e.checkedAt, shareUrl = PP.SITE, onBack = nav::back,
        shareLine = "${e.whenText} · ${e.era}",
        titleStyle = MaterialTheme.typography.headlineMedium.let { if (title.isMarathi) it.marathi() else it },
        summaryStyle = MaterialTheme.typography.bodyLarge.let { if (summary.isMarathi) it.marathi() else it },
        badges = { TagPill(e.whenText, PP.Haldi) },
        flags = listOfNotNull(if (title.fellBack || summary.fellBack) "Marathi text is not available for this entry yet, so it is shown in English." else null),
        facts = listOfNotNull(Fact("When", e.whenText), Fact("Era", e.era), if (lang == HistoryLang.MR && e.titleMr != null) Fact("In English", e.titleEn) else null),
        provenance = "Read the sources for the full record. Checked on ${longDate(e.checkedAt)}.",
    )
}

/** Markets by area and standout old shops, each with sources. */
@Composable
fun ShoppingScreen() {
    val state = LocalAppState.current
    val nav = LocalNav.current
    val lib = state.library
    var tab by rememberSaveable { mutableStateOf(0) }
    SubScreen("Shopping and markets", nav::back) {
        PillTabs(listOf("Markets by area", "Old shops"), tab, { tab = it }, Modifier.padding(top = PP.s3))
        val empty = (if (tab == 0) lib.shoppingAreas.isEmpty() else lib.shops.isEmpty())
        LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(start = PP.s4, end = PP.s4, top = PP.s4, bottom = PP.s12), verticalArrangement = Arrangement.spacedBy(PP.s4)) {
            if (empty) item {
                EmptyState(
                    if (lib.shoppingLoaded) "Nothing verified here yet." else "The shopping guide is still being checked.",
                    "Markets and old shops appear only once each has a source. Tulshibaug will wait; it always has.",
                    Icons.Outlined.Storefront, listOf(Action("Explore places", primary = true) { state.tab = 1; nav.back() }),
                )
            } else if (tab == 0) {
                items(lib.shoppingAreas, key = { it.id }) { a ->
                    EntryCard(a.area ?: "Pune", a.name, { nav.area(a.id) }, summary = a.knownFor?.let { "Known for $it" }, footer = a.bestFor?.let { "Best for $it" })
                }
            } else {
                lib.shops.groupBy { it.area ?: "Pune" }.toSortedMap().forEach { (area, shops) ->
                    item(key = "a-$area") { Text(area, style = MaterialTheme.typography.headlineSmall, modifier = Modifier.semantics { heading() }) }
                    items(shops, key = { it.id }) { s ->
                        EntryCard(if (s.since != null) "Since ${s.since} · $area" else area, s.name, { nav.shop(s.id) }, summary = s.knownFor?.let { "Known for $it" }, footer = s.note)
                    }
                }
            }
        }
    }
}

@Composable
fun AreaDetail(id: String) {
    val nav = LocalNav.current
    val context = LocalContext.current
    val a = LocalAppState.current.library.shoppingAreas.firstOrNull { it.id == id } ?: return nav.back()
    val map = mapUrl(a.name, null, null, "${a.area ?: ""} Pune".trim())
    DetailPage(
        eyebrow = "Market area", title = a.name, summary = a.knownFor?.let { "Known for $it." } ?: "A shopping area in ${a.area ?: "Pune"}.",
        sources = a.sources, checkedAt = a.checkedAt, shareUrl = PP.SITE, onBack = nav::back, shareLine = a.knownFor?.let { "Known for $it" } ?: a.area,
        badges = { TagPill(a.area ?: "Pune", PP.Clay) },
        actions = listOfNotNull(map?.let { Action("Map", Icons.Outlined.Map, primary = true) { context.openLink(it) } }),
        facts = listOfNotNull(a.area?.let { Fact("Area", it) }, Fact("Known for", a.knownFor ?: "Not stated"), a.bestFor?.let { Fact("Best for", it) }, a.notes?.let { Fact("Note", it) }),
    )
}

@Composable
fun ShopDetail(id: String) {
    val nav = LocalNav.current
    val context = LocalContext.current
    val s = LocalAppState.current.library.shops.firstOrNull { it.id == id } ?: return nav.back()
    val map = mapUrl(s.name, null, null, "${s.area ?: ""} Pune".trim())
    DetailPage(
        eyebrow = "Shop", title = s.name, summary = s.knownFor?.let { "Known for $it." } ?: "A shop in ${s.area ?: "Pune"}.",
        sources = s.sources, checkedAt = s.checkedAt, shareUrl = PP.SITE, onBack = nav::back,
        shareLine = listOfNotNull(s.since?.let { "Since $it" }, s.area).joinToString(" · "),
        badges = { s.since?.let { TagPill("Since $it", PP.Haldi) }; TagPill(s.area ?: "Pune", PP.Clay) },
        actions = listOfNotNull(map?.let { Action("Map", Icons.Outlined.Map, primary = true) { context.openLink(it) } }),
        // A founding year only where a source gives one; never estimated.
        facts = listOfNotNull(s.area?.let { Fact("Area", it) }, Fact("Known for", s.knownFor ?: "Not stated"), Fact("Since", s.since?.toString() ?: "Founding year not verified"), s.note?.let { Fact("Note", it) }),
    )
}
