package com.overtimelabs.peakpune.ui

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.provider.CalendarContract
import android.widget.Toast
import com.overtimelabs.peakpune.data.EventListing
import com.overtimelabs.peakpune.data.calendarNote
import com.overtimelabs.peakpune.data.calendarSlot

/** Opens a link in the browser or the app that handles it. The app itself never goes online;
 *  if nothing can open the link, it says so instead of failing quietly. */
fun Context.openLink(url: String) {
    val uri = Uri.parse(url)
    if (uri.scheme != "https" && uri.scheme != "http") return say("That link cannot be opened.")
    try {
        startActivity(Intent(Intent.ACTION_VIEW, uri).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    } catch (_: ActivityNotFoundException) {
        say("Couldn't open that link. It needs a browser and an internet connection.")
    }
}

/** A Google Maps link: coordinates when the data has them (from OpenStreetMap), otherwise the
 *  name and address as a search. Free, no key, opens the maps app. */
fun mapUrl(name: String, lat: Double?, lon: Double?, address: String?): String? = when {
    lat != null && lon != null -> "https://www.google.com/maps/search/?api=1&query=%.6f,%.6f".format(java.util.Locale.US, lat, lon)
    address != null -> "https://www.google.com/maps/search/?api=1&query=" + Uri.encode("$name, $address")
    else -> null
}

/** Share sheet text: the entry plus its peakpune.com link. */
fun shareText(title: String, line: String?, url: String) = listOfNotNull(title, line?.takeIf { it.isNotBlank() }, "On Peak Pune: $url").joinToString("\n")

fun Context.shareEntry(title: String, line: String?, url: String) {
    val send = Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_SUBJECT, title).putExtra(Intent.EXTRA_TEXT, shareText(title, line, url))
    startActivity(Intent.createChooser(send, "Share").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
}

/** Hands a dated listing to the calendar app (CalendarContract insert). No calendar permission:
 *  the calendar app shows the entry and the reader saves it. Times follow scripts/calendar.mjs. */
fun Context.addToCalendar(e: EventListing) {
    val slot = calendarSlot(e) ?: return
    val i = Intent(Intent.ACTION_INSERT, CalendarContract.Events.CONTENT_URI)
        .putExtra(CalendarContract.Events.TITLE, e.name)
        .putExtra(CalendarContract.Events.DESCRIPTION, listOfNotNull(e.summary, e.urlDeep?.let { "Details: $it" }, calendarNote(e)).joinToString("\n\n"))
        .putExtra(CalendarContract.Events.EVENT_LOCATION, e.address ?: e.neighbourhood?.let { "$it, Pune" } ?: "Pune")
        .putExtra(CalendarContract.EXTRA_EVENT_BEGIN_TIME, slot.startMillis)
        .putExtra(CalendarContract.EXTRA_EVENT_ALL_DAY, !slot.timed)
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    if (slot.timed) i.putExtra(CalendarContract.Events.EVENT_TIMEZONE, "Asia/Kolkata")
    // No end is invented: a timed listing without a stated end is passed with none.
    slot.endMillis?.let { i.putExtra(CalendarContract.EXTRA_EVENT_END_TIME, it) }
    try {
        startActivity(i)
    } catch (_: ActivityNotFoundException) {
        say("No calendar app took the event. Copy the date from the listing instead.")
    }
}

private fun Context.say(msg: String) = Toast.makeText(this, msg, Toast.LENGTH_LONG).show()
