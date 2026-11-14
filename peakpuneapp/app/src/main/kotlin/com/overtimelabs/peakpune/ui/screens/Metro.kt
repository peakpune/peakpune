package com.overtimelabs.peakpune.ui.screens

import androidx.compose.animation.AnimatedContent
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material.icons.filled.NorthEast
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.SwapVert
import androidx.compose.material.icons.outlined.Campaign
import androidx.compose.material.icons.automirrored.outlined.Chat
import androidx.compose.material.icons.outlined.Info
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.overtimelabs.peakpune.data.SourceLink
import com.overtimelabs.peakpune.data.known
import com.overtimelabs.peakpune.data.longDate
import com.overtimelabs.peakpune.metro.Availability
import com.overtimelabs.peakpune.metro.ChartReason
import com.overtimelabs.peakpune.metro.FareResult
import com.overtimelabs.peakpune.metro.FareSystem
import com.overtimelabs.peakpune.metro.MetroNetwork
import com.overtimelabs.peakpune.metro.MetroOperator
import com.overtimelabs.peakpune.metro.MetroRoute
import com.overtimelabs.peakpune.metro.PlanError
import com.overtimelabs.peakpune.metro.PlanResult
import com.overtimelabs.peakpune.metro.Planner
import com.overtimelabs.peakpune.metro.StatusSource
import com.overtimelabs.peakpune.metro.StopState
import com.overtimelabs.peakpune.ui.LocalAppState
import com.overtimelabs.peakpune.ui.components.Eyebrow
import com.overtimelabs.peakpune.ui.components.FilterPill
import com.overtimelabs.peakpune.ui.components.FlagNote
import com.overtimelabs.peakpune.ui.components.InkCard
import com.overtimelabs.peakpune.ui.components.SecondaryButton
import com.overtimelabs.peakpune.ui.components.SourcesBlock
import com.overtimelabs.peakpune.ui.openLink
import com.overtimelabs.peakpune.ui.theme.PP
import com.overtimelabs.peakpune.ui.theme.body
import com.overtimelabs.peakpune.ui.theme.display
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonPrimitive

private fun stops(n: Int) = if (n == 1) "1 stop" else "$n stops"
private fun systemName(s: FareSystem) = if (s == FareSystem.MAHA) "Maha Metro (Lines 1 and 2)" else "Line 3 (Pink)"

/** The offline journey planner, ported from the repository's Gleam planner. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun MetroScreen() {
    val net = LocalAppState.current.library.metro
    val planner = remember(net) { Planner(net) }
    var from by rememberSaveable { mutableStateOf<String?>(null) }
    var to by rememberSaveable { mutableStateOf<String?>(null) }
    var area by rememberSaveable { mutableStateOf<String?>(null) }
    var picking by rememberSaveable { mutableStateOf<String?>(null) } // "from" or "to"
    val result = if (from != null && to != null) planner.plan(from!!, to!!) else null

    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(start = PP.s4, end = PP.s4, top = PP.s6, bottom = PP.s12)) {
        item {
            Eyebrow("Pune Metro")
            Spacer(Modifier.height(PP.s2))
            Text("Journey planner", style = MaterialTheme.typography.headlineMedium, modifier = Modifier.semantics { heading() })
            Spacer(Modifier.height(PP.s2))
            Text("Works offline. Fares and stations last verified on ${longDate(net.verifiedOn)}.", style = MaterialTheme.typography.bodySmall)
            Spacer(Modifier.height(PP.s5))
            InkCard {
                Column {
                    StationField("Boarding station", from?.let(net::displayName)) { picking = "from" }
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                        IconButton(onClick = { val f = from; from = to; to = f }, enabled = from != null || to != null) { Icon(Icons.Filled.SwapVert, "Swap boarding and destination") }
                    }
                    StationField("Destination station", to?.let(net::displayName)) { picking = "to" }
                    Spacer(Modifier.height(PP.s3))
                    Text("Greyed-out stations cannot be chosen yet: they are not open, or the operator has not confirmed they are. Timetable information only.", style = MaterialTheme.typography.bodySmall)
                }
            }
            Spacer(Modifier.height(PP.s5))
            AnimatedContent(result, label = "route") { r ->
                when (r) {
                    null -> Text("Choose where you board and where you get off.", style = MaterialTheme.typography.bodyLarge)
                    is PlanResult.Ok -> RouteView(r.route, net)
                    is PlanResult.Err -> FlagNote(when (val e = r.error) {
                        PlanError.SameStation -> "You picked the same station twice. Choose a different destination."
                        is PlanError.NotSelectable -> "${net.displayName(e.station)} is not open yet."
                        PlanError.NoRoute -> "No route between these stations in the saved data. Check the official fare chart or ask the operator."
                    }, icon = Icons.Outlined.Info)
                }
            }
            Spacer(Modifier.height(PP.s8))
            Text("Not sure which station? Pick an area", style = MaterialTheme.typography.headlineSmall, modifier = Modifier.semantics { heading() })
            Spacer(Modifier.height(PP.s3))
            FlowRow(horizontalArrangement = Arrangement.spacedBy(PP.s2)) { net.areas.forEach { a -> FilterPill(a.name, area == a.id) { area = if (area == a.id) null else a.id } } }
            net.areas.firstOrNull { it.id == area }?.let { a ->
                Spacer(Modifier.height(PP.s4))
                InkCard(color = PP.Sage) {
                    Column {
                        Text(a.name, style = MaterialTheme.typography.titleLarge)
                        Spacer(Modifier.height(PP.s2))
                        Text((if (a.hasStation) "Has a station. " else "No station in the area. ") + a.note, style = MaterialTheme.typography.bodyMedium)
                        Spacer(Modifier.height(PP.s3))
                        Text("Closest stations, by straight line:", style = body(14, 600))
                        a.stations.forEach { s ->
                            Spacer(Modifier.height(PP.s2))
                            FlowRow(horizontalArrangement = Arrangement.spacedBy(PP.s2), verticalArrangement = Arrangement.spacedBy(PP.s2), itemVerticalAlignment = Alignment.CenterVertically) {
                                Text(net.displayName(s.id), style = body(16, 600))
                                SecondaryButton("Board here", { from = s.id }, enabled = planner.selectable(s.id))
                                SecondaryButton("Get off here", { to = s.id }, enabled = planner.selectable(s.id))
                            }
                        }
                    }
                }
            }
            Spacer(Modifier.height(PP.s8))
            Practical(net)
        }
    }
    picking?.let { which ->
        StationPicker(net, planner, if (which == "from") "Boarding station" else "Destination station", onDismiss = { picking = null }) { id ->
            if (which == "from") from = id else to = id
            picking = null
        }
    }
}

@Composable
private fun StationField(label: String, value: String?, onClick: () -> Unit) {
    Column(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(PP.rInput)).background(PP.White).border(2.dp, PP.Ink, RoundedCornerShape(PP.rInput))
            .clickable(role = Role.Button, onClick = onClick).heightIn(min = 56.dp).padding(horizontal = PP.s4, vertical = PP.s2)
            .clearAndSetSemantics { contentDescription = "$label: ${value ?: "not chosen"}"; role = Role.Button },
    ) {
        Text(label, style = body(12, 600, 1.3f, PP.InkSoft))
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(value ?: "Choose a station", style = body(17, if (value == null) 400 else 600, 1.4f, if (value == null) PP.InkSoft else PP.Ink), modifier = Modifier.weight(1f))
            Icon(Icons.Filled.ExpandMore, null)
        }
    }
}

@Composable
private fun RouteView(route: MetroRoute, net: MetroNetwork) {
    val context = LocalContext.current
    val usesPink = route.legs.any { it.operator == MetroOperator.PIT_CMRL }
    val usesMaha = route.legs.any { it.operator == MetroOperator.MAHA_METRO }
    val mahaChange = route.tickets.any { it.system == FareSystem.MAHA && it.legs.size > 1 }
    val note = body(15, 400, 1.45f, PP.InkSoft)
    Column {
        route.legs.forEach { leg ->
            Row(Modifier.fillMaxWidth().padding(bottom = PP.s3).height(IntrinsicSize.Min).clip(RoundedCornerShape(PP.rCard)).background(PP.White).border(2.dp, PP.Ink, RoundedCornerShape(PP.rCard))) {
                Box(Modifier.width(10.dp).fillMaxHeight().background(Color(net.lines.first { it.id == leg.line }.colour)))
                Column(Modifier.padding(PP.s4)) {
                    Text(leg.lineName, style = body(16, 800))
                    Spacer(Modifier.height(PP.s1))
                    Text("Board at ${net.displayName(leg.from)}, towards ${leg.toward}. Get off at ${net.displayName(leg.to)} after ${stops(leg.stops)}.", style = MaterialTheme.typography.bodyMedium)
                }
            }
        }
        Text(if (route.changes.isEmpty()) "No change needed." else "Change at ${route.changes.joinToString { net.displayName(it) }}.", style = body(16, 700))
        Spacer(Modifier.height(PP.s5))
        Text("Tickets and fares", style = MaterialTheme.typography.titleLarge, modifier = Modifier.semantics { heading() })
        Spacer(Modifier.height(PP.s2))
        route.tickets.forEach { t ->
            Column(Modifier.fillMaxWidth().padding(bottom = PP.s3).background(if (t.fare is FareResult.Exact) PP.Sage else PP.Clay, RoundedCornerShape(PP.rCard)).padding(PP.s4)) {
                Text("${systemName(t.system)}: ${net.displayName(t.from)} to ${net.displayName(t.to)}", style = body(15, 700))
                Spacer(Modifier.height(PP.s2))
                when (val f = t.fare) {
                    is FareResult.Exact -> Text("₹${f.rupees}", style = display(32), modifier = Modifier.semantics { contentDescription = "${f.rupees} rupees" })
                    is FareResult.CheckChart -> {
                        Text("Check the official fare chart. " + if (f.why == ChartReason.DISPUTED) "The operator's own chart prints a different fare for each direction of this pair, so no exact fare is shown." else "The saved fare table has no fare for this pair.", style = body(15, 500, 1.45f))
                        Spacer(Modifier.height(PP.s2))
                        SecondaryButton("Official fare chart", { context.openLink(if (t.system == FareSystem.MAHA) net.mahaFareChartUrl else net.pinkFareChartUrl) }, icon = Icons.Filled.NorthEast)
                    }
                }
            }
        }
        if (route.tickets.size > 1) Text("This trip crosses two separate fare systems and operators. Each ticket's fare is shown on its own. No combined fare is published, so none is shown.", style = note)
        if (mahaChange) Text("Both lines are one fare system: one ticket covers the change.", style = note)
        if (usesPink) {
            Text("Line 3 tickets: buy at the station counter or a ticket vending machine, or use the Line 3 app. A Line 3 WhatsApp number is not confirmed, so none is shown.", style = note, modifier = Modifier.padding(top = PP.s2))
            Spacer(Modifier.height(PP.s2))
            FlagNote("Line 3 is reported open by the media. The operator's website does not say which stations are open, so check at the station or on punerimetro.in before you travel.", PP.Haldi, Icons.Outlined.Campaign)
        }
        if (usesMaha && net.mahaWhatsapp != null) {
            Spacer(Modifier.height(PP.s3))
            SecondaryButton("Book on WhatsApp (Lines 1 and 2 only)", { context.openLink(net.mahaWhatsapp!!) }, icon = Icons.AutoMirrored.Outlined.Chat)
        }
    }
}

/** Station chooser in a Material bottom sheet: search, line colours, not-open stations greyed
 *  out, Line 3 stations labelled as media-reported. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun StationPicker(net: MetroNetwork, planner: Planner, title: String, onDismiss: () -> Unit, onPick: (String) -> Unit) {
    var q by remember { mutableStateOf("") }
    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true), containerColor = PP.Paper) {
        LazyColumn(Modifier.fillMaxWidth(), contentPadding = PaddingValues(start = PP.s4, end = PP.s4, bottom = PP.s12)) {
            item {
                Text(title, style = MaterialTheme.typography.headlineSmall)
                Spacer(Modifier.height(PP.s3))
                OutlinedTextField(
                    q, { q = it }, singleLine = true, modifier = Modifier.fillMaxWidth(),
                    placeholder = { Text("Search stations") }, leadingIcon = { Icon(Icons.Filled.Search, null) },
                    shape = RoundedCornerShape(PP.rInput),
                    colors = OutlinedTextFieldDefaults.colors(focusedContainerColor = PP.White, unfocusedContainerColor = PP.White, unfocusedBorderColor = PP.Ink, focusedBorderColor = PP.Brick),
                )
            }
            net.lines.forEach { line ->
                item(key = line.id) {
                    Row(Modifier.padding(top = PP.s6, bottom = PP.s2), verticalAlignment = Alignment.CenterVertically) {
                        Box(Modifier.size(14.dp).background(Color(line.colour), CircleShape).border(1.dp, PP.Ink, CircleShape))
                        Spacer(Modifier.width(PP.s2))
                        Text(line.name, style = MaterialTheme.typography.titleLarge, modifier = Modifier.semantics { heading() })
                    }
                    if (line.operator == MetroOperator.PIT_CMRL) Text("Station status is media-reported; the operator publishes no open list.", style = MaterialTheme.typography.bodySmall)
                }
                line.stops.filter { s -> q.isBlank() || net.stations[s.station]!!.names.any { it.contains(q.trim(), ignoreCase = true) } }.forEach { stop ->
                    item(key = "${line.id}-${stop.station}") {
                        val st = net.stations[stop.station]!!
                        val open = planner.availability(stop.station) != Availability.NOT_OPEN_YET
                        val sub = when {
                            stop.status.state == StopState.NOT_OPEN -> "Listed, not open"
                            stop.status.state == StopState.CLOSED -> "Not open yet (media-reported)"
                            stop.status.source == StatusSource.MEDIA -> "Reported open by the media"
                            st.lines.size > 1 -> "Interchange"
                            else -> null
                        }
                        Column(
                            Modifier.fillMaxWidth().heightIn(min = PP.tap).clip(RoundedCornerShape(PP.rInput))
                                .then(if (open) Modifier.clickable(role = Role.Button) { onPick(stop.station) } else Modifier)
                                .padding(horizontal = PP.s2, vertical = PP.s2),
                        ) {
                            Text(net.displayName(stop.station), style = body(16, 600, 1.4f, if (open) PP.Ink else PP.InkSoft))
                            if (sub != null) Text(sub, style = body(13, 500, 1.4f, PP.InkSoft))
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun Practical(net: MetroNetwork) {
    val maha = net.timetables["maha_metro"] as JsonObject
    val pink = net.timetables["line3"] as JsonObject
    fun windows(o: JsonObject) = (o["windows"] as JsonArray).joinToString { it.jsonPrimitive.content }
    val mahaPeak = maha["peak"] as JsonObject; val mahaOff = maha["off_peak"] as JsonObject; val pinkPeak = pink["peak"] as JsonObject
    Column {
        Text("Timings and help", style = MaterialTheme.typography.headlineSmall, modifier = Modifier.semantics { heading() })
        Spacer(Modifier.height(PP.s3))
        InkCard {
            Column {
                Text("Lines 1 and 2 (Maha Metro)", style = MaterialTheme.typography.titleMedium)
                Text("${maha.known("service_hours")}. Every ${mahaPeak["headway_min"]} min at peak (${windows(mahaPeak)}), every ${mahaOff["headway_min"]} min otherwise.", style = MaterialTheme.typography.bodyMedium)
                Text("Helpline ${(net.operators["maha_metro"] as JsonObject).known("helpline")}", style = MaterialTheme.typography.bodySmall)
                Spacer(Modifier.height(PP.s4))
                Text("Line 3 (Pink)", style = MaterialTheme.typography.titleMedium)
                Text("First train ${pink.known("first_train")}. Last train ${pink.known("last_train")}. ${pinkPeak.known("headway")} at peak (${windows(pinkPeak)}).", style = MaterialTheme.typography.bodyMedium)
                Text("Helpline ${(net.operators["pitcmrl"] as JsonObject).known("helpline")}. ${pink.known("note") ?: ""}", style = MaterialTheme.typography.bodySmall)
            }
        }
        Spacer(Modifier.height(PP.s4))
        val p = net.provenance
        SourcesBlock(
            listOf("mahametro_fare_chart_page" to "Maha Metro fare chart", "mahametro_timetable_page" to "Maha Metro timetable", "mahametro_project_profile" to "Maha Metro project profile",
                "line3_station_list" to "Line 3 station list", "line3_fare_table_page" to "Line 3 fare table", "line3_timetable_page" to "Line 3 timetable")
                .mapNotNull { (k, label) -> p.known(k)?.let { SourceLink(it, label) } },
            java.time.LocalDate.parse(net.verifiedOn),
            "Fares, timetables and contacts were read from the operator pages. Line 3 station status comes from media reports; disputed fare pairs are never shown as a fare.",
        )
    }
}
