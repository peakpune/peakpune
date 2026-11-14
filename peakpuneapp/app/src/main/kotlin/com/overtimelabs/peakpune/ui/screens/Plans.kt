package com.overtimelabs.peakpune.ui.screens

import androidx.compose.animation.AnimatedContent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.NorthEast
import androidx.compose.material.icons.outlined.ConfirmationNumber
import androidx.compose.material.icons.outlined.EventAvailable
import androidx.compose.material.icons.outlined.EventBusy
import androidx.compose.material.icons.outlined.GroupAdd
import androidx.compose.material.icons.outlined.Groups
import androidx.compose.material.icons.outlined.Place
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import com.overtimelabs.peakpune.data.Activity
import com.overtimelabs.peakpune.data.EventListing
import com.overtimelabs.peakpune.data.Meetup
import com.overtimelabs.peakpune.data.Verification
import com.overtimelabs.peakpune.data.activityLabel
import com.overtimelabs.peakpune.data.calendarSlot
import com.overtimelabs.peakpune.data.costText
import com.overtimelabs.peakpune.data.currentEvents
import com.overtimelabs.peakpune.data.eventDay
import com.overtimelabs.peakpune.data.eventWhen
import com.overtimelabs.peakpune.data.longDate
import com.overtimelabs.peakpune.data.priceText
import com.overtimelabs.peakpune.data.puneTime
import com.overtimelabs.peakpune.ui.LocalAppState
import com.overtimelabs.peakpune.ui.LocalNav
import com.overtimelabs.peakpune.ui.addToCalendar
import com.overtimelabs.peakpune.ui.components.Action
import com.overtimelabs.peakpune.ui.components.DetailPage
import com.overtimelabs.peakpune.ui.components.EmptyState
import com.overtimelabs.peakpune.ui.components.EntryCard
import com.overtimelabs.peakpune.ui.components.Fact
import com.overtimelabs.peakpune.ui.components.LevelBadge
import com.overtimelabs.peakpune.ui.components.MetaText
import com.overtimelabs.peakpune.ui.components.PillTabs
import com.overtimelabs.peakpune.ui.components.TagPill
import com.overtimelabs.peakpune.ui.openLink
import com.overtimelabs.peakpune.ui.theme.PP

/** Events and meetups, as two tabs. */
@Composable
fun PlansScreen() {
    var tab by rememberSaveable { mutableStateOf(0) }
    Column(Modifier.fillMaxSize()) {
        ScreenHeader("Plans", "Events and meetups")
        PillTabs(listOf("Events", "Meetups"), tab, { tab = it })
        AnimatedContent(tab, label = "plans-tab") { t -> if (t == 0) EventsList() else MeetupsList() }
    }
}

@Composable
fun EventCard(e: EventListing, onClick: () -> Unit) = EntryCard(eventWhen(e), e.name, onClick, summary = e.summary, footer = e.recurrence, meta = {
    MetaText(listOfNotNull(e.organiser, e.neighbourhood).joinToString(" · "))
    TagPill(priceText(e.priceNote), if (e.priceNote == null) PP.Paper else PP.Sage)
})

@Composable
private fun EventsList() {
    val state = LocalAppState.current
    val nav = LocalNav.current
    val live = currentEvents(state.library.events, state.now())
    val dated = live.filterNot { it.isRecurring }
    val recurring = live.filter { it.isRecurring }
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(start = PP.s4, end = PP.s4, top = PP.s4, bottom = PP.s12), verticalArrangement = Arrangement.spacedBy(PP.s4)) {
        item { Text("Source-listed plans, read on ${longDate(state.library.auditCheckedAt)}. Dated listings disappear once the day has passed. Check dates and prices before you book.", style = MaterialTheme.typography.bodySmall) }
        if (dated.isEmpty()) item {
            EmptyState("Nothing dated right now.", "The calendar is resting, as Pune does after lunch. Try a meetup, or head out on a loop.", Icons.Outlined.EventBusy, listOf(Action("Go outdoors", primary = true) { state.tab = 2 }))
        }
        items(dated, key = { it.id }) { e -> EventCard(e) { nav.event(e.id) } }
        if (recurring.isNotEmpty()) {
            item {
                Column(Modifier.padding(top = PP.s4)) {
                    Text("Recurring at venues", style = MaterialTheme.typography.headlineSmall, modifier = Modifier.semantics { heading() })
                    Text("Schedules published by the venue. Confirm current timings before going.", style = MaterialTheme.typography.bodySmall)
                }
            }
            items(recurring, key = { it.id }) { e -> EventCard(e) { nav.event(e.id) } }
        }
    }
}

@Composable
fun EventDetail(id: String) {
    val nav = LocalNav.current
    val context = LocalContext.current
    val lib = LocalAppState.current.library
    val e = lib.events.firstOrNull { it.id == id } ?: return nav.back()
    val venue = lib.place(e.linkedId)
    val canCal = calendarSlot(e) != null
    DetailPage(
        eyebrow = if (e.isRecurring) "Recurring listing" else "Event", title = e.name, summary = e.summary, sources = e.sources, checkedAt = e.checkedAt,
        shareUrl = e.webUrl, shareLine = listOfNotNull(eventWhen(e), e.neighbourhood).joinToString(" · "), onBack = nav::back,
        badges = { TagPill(eventWhen(e), PP.Haldi); if (e.status == Verification.PARTIAL) LevelBadge("Partial listing", PP.Paper) },
        flags = listOfNotNull(
            if (e.status == Verification.PARTIAL) "Partial listing: some details are not confirmed on the source page." else null,
            if (e.eventStatus == null && !e.isRecurring) "The source does not confirm the current status of this event." else null,
            if (e.sourceStale) "The source for this listing is more than 90 days old. Check with the organiser before you go." else null,
        ),
        actions = listOfNotNull(
            if (canCal) Action("Add to calendar", Icons.Outlined.EventAvailable, primary = true) { context.addToCalendar(e) } else null,
            e.urlDeep?.let { Action(if (e.status == Verification.VERIFIED) "Organiser page" else "Source page", Icons.Filled.NorthEast) { context.openLink(it) } },
            e.ticketUrl?.takeIf { it != e.urlDeep }?.let { Action("Tickets", Icons.Outlined.ConfirmationNumber) { context.openLink(it) } },
            venue?.let { v -> Action("About the venue", Icons.Outlined.Place) { nav.place(v.id) } },
        ),
        facts = listOfNotNull(
            Fact("When", if (e.isRecurring) e.recurrence ?: "Recurring" else eventWhen(e)),
            e.end?.let { Fact("Ends", "${eventDay(e.endDate!!)} · ${puneTime(it)}") },
            Fact("Where", e.address ?: e.neighbourhood ?: "Pune"),
            e.organiser?.let { Fact("Organiser", it) },
            Fact("Price", priceText(e.priceNote)),
            e.notes?.let { Fact("Note", it) },
        ),
        tags = e.tags.map(::tagLabel),
        provenance = if (canCal) "Calendar entries use an exact time only where the source gives one; otherwise they are all-day. No end time is guessed." else null,
    )
}

@Composable
fun ActivityBadge(a: Activity) = LevelBadge(activityLabel(a), when (a) { Activity.ACTIVE -> PP.Sage; Activity.DORMANT -> PP.Brick; Activity.UNKNOWN -> PP.Paper })

@Composable
private fun MeetupsList() {
    val state = LocalAppState.current
    val nav = LocalNav.current
    val rows = state.library.meetups
    val live = rows.filter { it.activity == Activity.ACTIVE }
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(start = PP.s4, end = PP.s4, top = PP.s4, bottom = PP.s12), verticalArrangement = Arrangement.spacedBy(PP.s4)) {
        if (rows.isEmpty()) item {
            EmptyState("No communities listed yet.", "Joining links and activity need checking before they appear. Meanwhile, the hills do not need an invite.", Icons.Outlined.Groups, listOf(Action("Go outdoors", primary = true) { state.tab = 2 }))
        } else item { Text("${live.size} Pune groups with a public joining page and dated activity, read on ${longDate(state.library.auditCheckedAt)}. Rules, costs and group links live on their own sites.", style = MaterialTheme.typography.bodySmall) }
        items(live + rows.filterNot { it.activity == Activity.ACTIVE }, key = { it.id }) { m -> MeetupCard(m) { nav.meetup(m.id) } }
    }
}

@Composable
fun MeetupCard(m: Meetup, onClick: () -> Unit) = EntryCard((m.tags.take(2).map(::tagLabel) + listOfNotNull(m.neighbourhood)).joinToString(" · "), m.name, onClick, summary = m.summary, footer = m.scheduleText, meta = {
    ActivityBadge(m.activity)
    MetaText(costText(m.costNote))
})

@Composable
fun MeetupDetail(id: String) {
    val nav = LocalNav.current
    val context = LocalContext.current
    val lib = LocalAppState.current.library
    val m = lib.meetups.firstOrNull { it.id == id } ?: return nav.back()
    val venue = lib.place(m.linkedId)
    DetailPage(
        eyebrow = "Community", title = m.name, summary = m.summary, sources = m.sources, checkedAt = m.checkedAt, shareUrl = m.webUrl, shareLine = m.scheduleText, onBack = nav::back,
        badges = { ActivityBadge(m.activity) },
        flags = listOfNotNull(if (m.sourceStale) "The source for this listing is more than 90 days old. Check the group's page before you go." else null),
        actions = listOfNotNull(
            m.joinUrl?.let { Action("How to join", Icons.Outlined.GroupAdd, primary = true) { context.openLink(it) } },
            venue?.let { v -> Action("About the venue", Icons.Outlined.Place) { nav.place(v.id) } },
        ),
        facts = listOfNotNull(
            Fact("Schedule", m.scheduleText ?: "Not published"),
            Fact("Cost", costText(m.costNote)),
            Fact("Last public activity", m.lastPublicActivity?.let(::longDate) ?: "Not found on the source"),
            m.neighbourhood?.let { Fact("Area", it) },
            m.notes?.let { Fact("Note", it) },
        ),
        tags = m.tags.map(::tagLabel),
        provenance = "\"Active\" means a dated public activity within 90 days or an upcoming dated session. Member counts, if any, are the group's own figures.",
    )
}
