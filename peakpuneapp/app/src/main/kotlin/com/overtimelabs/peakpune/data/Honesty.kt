// The repository's honesty rules, as plain functions so they can be tested.
package com.overtimelabs.peakpune.data

import java.time.DayOfWeek
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit
import java.util.Locale

val PUNE: ZoneId = ZoneId.of("Asia/Kolkata")

/** The calendar date in Pune. */
fun puneDate(now: Instant): LocalDate = now.atZone(PUNE).toLocalDate()

/** Entries checked more than 90 days ago need a re-check. */
const val STALE_AFTER_DAYS = 90L

fun needsRecheck(checkedAt: LocalDate, now: Instant): Boolean =
    ChronoUnit.DAYS.between(checkedAt, puneDate(now)) > STALE_AFTER_DAYS

/** Never "Free" for an unknown price. */
fun priceText(priceNote: String?): String = priceNote?.takeIf { it.isNotBlank() && it != "UNKNOWN" } ?: "Price not confirmed"
fun costText(costNote: String?): String = costNote?.takeIf { it.isNotBlank() && it != "UNKNOWN" } ?: "Cost not confirmed"

/** Dated listings hide once `expires_at` has passed; without one, after the end of their last
 *  day in Pune. Recurring listings stay. */
fun isExpired(e: EventListing, now: Instant): Boolean {
    if (e.isRecurring) return false
    e.expiresAt?.let { return !now.isBefore(it.toInstant()) }
    return puneDate(now).isAfter(e.endDate ?: e.startDate!!)
}

/** Listings to show, in date order, recurring ones last. */
fun currentEvents(all: List<EventListing>, now: Instant): List<EventListing> =
    all.filterNot { isExpired(it, now) }.sortedWith(
        compareBy<EventListing> { it.isRecurring }.thenBy { it.startDate }.thenBy { it.name },
    )

/** Today through the coming Sunday (just today when it is Sunday), in Pune. */
fun weekendWindow(now: Instant): Pair<LocalDate, LocalDate> {
    val today = puneDate(now)
    return today to today.plusDays((DayOfWeek.SUNDAY.value - today.dayOfWeek.value).toLong())
}

fun thisWeekend(all: List<EventListing>, now: Instant): List<EventListing> {
    val (from, to) = weekendWindow(now)
    return currentEvents(all, now).filter { e ->
        if (e.isRecurring) return@filter false
        val first = e.startDate!!
        val last = e.endDate ?: first
        !first.isAfter(to) && !last.isBefore(from)
    }
}

/** What the phone calendar gets (scripts/calendar.mjs): a timed entry only when the data has an
 *  exact start, otherwise all-day on the listed dates. No end time is guessed. */
data class CalendarSlot(val timed: Boolean, val startMillis: Long, val endMillis: Long?, val firstDay: LocalDate? = null, val lastDayInclusive: LocalDate? = null)

fun calendarSlot(e: EventListing): CalendarSlot? {
    val startDate = e.startDate ?: return null
    e.start?.let { s -> return CalendarSlot(true, s.toInstant().toEpochMilli(), e.end?.toInstant()?.toEpochMilli()) }
    val last = (e.endDate ?: startDate).let { if (it.isBefore(startDate)) startDate else it }
    // All-day entries are midnight UTC to midnight UTC of the day after the last day (exclusive).
    val start = startDate.atStartOfDay(ZoneId.of("UTC")).toInstant().toEpochMilli()
    val end = last.plusDays(1).atStartOfDay(ZoneId.of("UTC")).toInstant().toEpochMilli()
    return CalendarSlot(false, start, end, startDate, last)
}

fun calendarNote(e: EventListing): String =
    "Read from the organiser's page on ${e.checkedAt}. Dates and times can change: confirm on the page before you go." +
        if (e.status == Verification.PARTIAL) " Partial listing: some details are not confirmed." else ""

private val LONG = DateTimeFormatter.ofPattern("d MMMM yyyy", Locale.ENGLISH)
private val DAY = DateTimeFormatter.ofPattern("EEE d MMM yyyy", Locale.ENGLISH)
private val TIME = DateTimeFormatter.ofPattern("h:mm a", Locale.ENGLISH)

/** "13 November 2026" (as long_date in the Gleam planner). */
fun longDate(d: LocalDate): String = LONG.format(d)
fun longDate(iso: String): String = runCatching { longDate(LocalDate.parse(iso)) }.getOrDefault(iso)

/** "Sat 14 Nov 2026". */
fun eventDay(d: LocalDate): String = DAY.format(d)

/** Exact start in Pune, e.g. "4:00 PM". */
fun puneTime(t: java.time.OffsetDateTime): String = TIME.format(t.atZoneSameInstant(PUNE)).uppercase(Locale.ENGLISH)

fun eventWhen(e: EventListing): String =
    if (e.isRecurring) "Recurring" else eventDay(e.startDate!!) + (e.start?.let { " · ${puneTime(it)}" } ?: "")

fun activityLabel(a: Activity) = when (a) {
    Activity.ACTIVE -> "Active"
    Activity.DORMANT -> "Dormant"
    Activity.UNKNOWN -> "Activity not confirmed"
}
