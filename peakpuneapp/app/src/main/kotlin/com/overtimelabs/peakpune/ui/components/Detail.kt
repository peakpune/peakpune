package com.overtimelabs.peakpune.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.NorthEast
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import com.overtimelabs.peakpune.data.SourceLink
import com.overtimelabs.peakpune.data.STALE_AFTER_DAYS
import com.overtimelabs.peakpune.data.longDate
import com.overtimelabs.peakpune.data.needsRecheck
import com.overtimelabs.peakpune.ui.LocalAppState
import com.overtimelabs.peakpune.ui.openLink
import com.overtimelabs.peakpune.ui.shareEntry
import com.overtimelabs.peakpune.ui.theme.PP
import com.overtimelabs.peakpune.ui.theme.body
import com.overtimelabs.peakpune.ui.theme.display
import java.time.LocalDate

/** One fact row (`.place-facts`): label above value. */
data class Fact(val label: String, val value: String, val link: String? = null)

/** The full page every list item opens: summary, facts, tags, actions, honesty flags, sources
 *  and the checked date. */
@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun DetailPage(
    eyebrow: String,
    title: String,
    summary: String,
    sources: List<SourceLink>,
    checkedAt: LocalDate?,
    shareUrl: String,
    onBack: () -> Unit,
    shareLine: String? = null,
    badges: @Composable (() -> Unit)? = null,
    facts: List<Fact> = emptyList(),
    tags: List<String> = emptyList(),
    actions: List<Action> = emptyList(),
    flags: List<String> = emptyList(),
    provenance: String? = null,
    titleStyle: TextStyle = MaterialTheme.typography.headlineMedium,
    summaryStyle: TextStyle = MaterialTheme.typography.bodyLarge,
    osmCredit: Boolean = false,
) {
    val context = LocalContext.current
    val now = LocalAppState.current.now()
    val stale = checkedAt != null && needsRecheck(checkedAt, now)
    Scaffold(
        containerColor = PP.Paper,
        topBar = {
            TopAppBar(
                title = { Text(eyebrow, style = body(16, 700)) },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back") } },
                actions = { IconButton(onClick = { context.shareEntry(title, shareLine, shareUrl) }) { Icon(Icons.Outlined.Share, contentDescription = "Share") } },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = PP.Paper),
            )
        },
    ) { pad ->
        LazyColumn(Modifier.fillMaxSize().padding(pad), contentPadding = androidx.compose.foundation.layout.PaddingValues(start = PP.s4, end = PP.s4, top = PP.s4, bottom = PP.s12)) {
            item { Text(title, style = titleStyle, modifier = Modifier.semantics { heading() }) }
            if (badges != null) item {
                Spacer(Modifier.height(PP.s4))
                FlowRow(horizontalArrangement = Arrangement.spacedBy(PP.s2), verticalArrangement = Arrangement.spacedBy(PP.s2)) { badges() }
            }
            item { Spacer(Modifier.height(PP.s4)); Text(summary, style = summaryStyle) }
            if (stale || flags.isNotEmpty()) item { Spacer(Modifier.height(PP.s4)) }
            if (stale) item {
                FlagNote("Checked more than $STALE_AFTER_DAYS days ago (on ${longDate(checkedAt)}). This needs a re-check: confirm with the source before you go.", PP.Haldi)
                Spacer(Modifier.height(PP.s2))
            }
            items(flags.size) { i -> FlagNote(flags[i]); Spacer(Modifier.height(PP.s2)) }
            if (actions.isNotEmpty()) item {
                Spacer(Modifier.height(PP.s4))
                FlowRow(horizontalArrangement = Arrangement.spacedBy(PP.s3), verticalArrangement = Arrangement.spacedBy(PP.s3)) {
                    actions.forEach { if (it.primary) PrimaryButton(it.label, it.onClick, icon = it.icon) else SecondaryButton(it.label, it.onClick, icon = it.icon) }
                }
            }
            if (facts.isNotEmpty()) {
                item { Spacer(Modifier.height(PP.s8)); HorizontalDivider(thickness = 2.dp, color = PP.Ink) }
                items(facts.size) { i -> FactRow(facts[i]) }
            }
            if (tags.isNotEmpty()) item {
                Spacer(Modifier.height(PP.s6))
                FlowRow(horizontalArrangement = Arrangement.spacedBy(PP.s2), verticalArrangement = Arrangement.spacedBy(PP.s2)) { tags.forEach { TagPill(it) } }
            }
            item { Spacer(Modifier.height(PP.s8)); SourcesBlock(sources, checkedAt, provenance, osmCredit) }
        }
    }
}

@Composable
private fun FactRow(f: Fact) {
    val context = LocalContext.current
    Column(
        Modifier.fillMaxWidth().padding(vertical = PP.s3)
            .then(if (f.link != null) Modifier.heightIn(min = PP.tap).clickable(role = Role.Button) { context.openLink(f.link) } else Modifier)
            .semantics(mergeDescendants = true) {},
    ) {
        Text(f.label, style = body(14, 600, 1.4f, PP.InkSoft, tracking = 0.3f))
        Spacer(Modifier.height(2.dp))
        Text(f.value, style = body(17, 500, 1.53f, if (f.link != null) PP.Brick else PP.Ink).copy(textDecoration = if (f.link != null) TextDecoration.Underline else null))
    }
    HorizontalDivider(color = PP.Rule)
}

/** The provenance box (`.provenance`): tappable sources and the checked date. */
@Composable
fun SourcesBlock(sources: List<SourceLink>, checkedAt: LocalDate?, provenance: String? = null, osmCredit: Boolean = false) {
    val context = LocalContext.current
    Column(Modifier.fillMaxWidth().background(PP.Clay, RoundedCornerShape(PP.rCard)).padding(PP.s5)) {
        Text(if (sources.size == 1) "Source" else "Sources", style = display(23, 600, 1.26f), modifier = Modifier.semantics { heading() })
        Spacer(Modifier.height(PP.s2))
        Text(checkedAt?.let { "Checked on ${longDate(it)}." } ?: "Check date not stated.", style = body(15, 600, 1.53f))
        if (provenance != null) { Spacer(Modifier.height(PP.s2)); Text(provenance, style = body(15, 400, 1.53f)) }
        Spacer(Modifier.height(PP.s3))
        sources.forEach { s ->
            Row(
                Modifier.fillMaxWidth().heightIn(min = PP.tap).clip(RoundedCornerShape(PP.rInput))
                    .clickable(role = Role.Button) { context.openLink(s.url) }
                    .clearAndSetSemantics { contentDescription = "Open source: ${s.title}"; role = Role.Button },
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(Icons.Filled.NorthEast, null, Modifier.size(18.dp))
                Spacer(Modifier.width(PP.s2))
                Text(if (s.label == null) s.url else "${s.label} · ${s.host}", style = body(15, 600, 1.4f).copy(textDecoration = TextDecoration.Underline))
            }
        }
        if (osmCredit) { Spacer(Modifier.height(PP.s2)); Text("Map coordinates © OpenStreetMap contributors (ODbL).", style = body(13, 500, 1.4f)) }
        Spacer(Modifier.height(PP.s2))
        Text("Opening a source needs the internet.", style = body(13, 500, 1.4f, PP.InkSoft))
    }
}
