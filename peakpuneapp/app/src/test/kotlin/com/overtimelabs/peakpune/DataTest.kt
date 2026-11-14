package com.overtimelabs.peakpune

import com.overtimelabs.peakpune.data.EventListing
import com.overtimelabs.peakpune.data.calendarSlot
import com.overtimelabs.peakpune.data.costText
import com.overtimelabs.peakpune.data.currentEvents
import com.overtimelabs.peakpune.data.eventDay
import com.overtimelabs.peakpune.data.longDate
import com.overtimelabs.peakpune.data.needsRecheck
import com.overtimelabs.peakpune.data.parseHistory
import com.overtimelabs.peakpune.data.parseShopping
import com.overtimelabs.peakpune.data.priceText
import com.overtimelabs.peakpune.data.publishAudited
import com.overtimelabs.peakpune.data.puneTime
import com.overtimelabs.peakpune.data.thisWeekend
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.jsonObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.Instant
import java.time.LocalDate
import java.time.OffsetDateTime

private fun at(s: String): Instant = OffsetDateTime.parse(s).toInstant()

class DataTest {
    private val lib = TestData.library

    @Test fun onlyRowsMarkedPublishAppear() {
        assertEquals(28, lib.places.size); assertEquals(28, lib.outdoors.size)
        assertEquals(9, lib.events.size); assertEquals(7, lib.meetups.size)
        assertFalse(lib.events.any { it.id == "event-karawaan-geminid-experience-2026-12-12" })
        assertFalse(lib.meetups.any { it.id == "meetup-pythonpune" })
    }

    @Test fun overridesApplyAndCheckedAtIsTheAuditDate() {
        assertTrue(lib.place("place-joshis-museum-of-miniature-railways")!!.priceNote!!.startsWith("Rs. 120 per head above 3 years"))
        assertTrue(lib.places.all { it.checkedAt == lib.auditCheckedAt })
    }

    @Test fun unknownIdsStayUnpublished() {
        val audit = Json.parseToJsonElement("""{"checked_at":"2026-11-13","records":{}}""").jsonObject
        assertTrue(publishAudited(listOf(JsonObject(mapOf("id" to JsonPrimitive("x")))), audit).isEmpty())
    }

    @Test fun unknownPriceIsNeverFree() {
        assertEquals("Price not confirmed", priceText(null)); assertEquals("Price not confirmed", priceText("UNKNOWN"))
        assertEquals("Cost not confirmed", costText(null)); assertEquals("Rs. 140", priceText("Rs. 140"))
    }

    @Test fun ninetyDayRecheck() {
        val checked = LocalDate.of(2026, 11, 13)
        assertFalse(needsRecheck(checked, at("2027-02-11T12:00:00+05:30")))
        assertTrue(needsRecheck(checked, at("2027-02-12T12:00:00+05:30")))
    }

    @Test fun expiredHideRecurringStay() {
        val live = currentEvents(lib.events, at("2026-11-16T09:00:00+05:30"))
        assertFalse(live.any { it.id == "event-cme-soldierathon-pune-2026-11-15" })
        assertTrue(live.any { it.id == "event-karawaan-kamshet-paragliding-2026-11-21" })
        assertEquals(3, live.count { it.isRecurring }); assertTrue(live.last().isRecurring)
    }

    @Test fun weekendRunsTodayToSunday() {
        val ids = thisWeekend(lib.events, at("2026-11-14T08:00:00+05:30")).map { it.id }
        assertTrue("event-cme-soldierathon-pune-2026-11-15" in ids)
        assertTrue("event-doolally-childrens-day-little-hands-2026-11-14" in ids)
        assertFalse("event-karawaan-kamshet-paragliding-2026-11-21" in ids)
    }

    private fun ev(extra: String) = EventListing(Json.parseToJsonElement("""{"id":"x","name":"Run","checked_at":"2026-11-13","status":"verified"$extra}""").jsonObject)

    @Test fun calendarFollowsCalendarMjs() {
        val timed = calendarSlot(ev(""","start_date":"2026-11-14","start":"2026-11-14T11:00:00+05:30""""))!!
        assertTrue(timed.timed); assertEquals(at("2026-11-14T05:30:00Z").toEpochMilli(), timed.startMillis); assertNull(timed.endMillis)
        val allDay = calendarSlot(ev(""","start_date":"2026-11-30""""))!!
        assertFalse(allDay.timed); assertEquals(LocalDate.of(2026, 11, 30), allDay.lastDayInclusive)
        val multi = calendarSlot(ev(""","start_date":"2026-12-12","end":"2026-12-13T23:59:00+05:30""""))!!
        assertEquals(LocalDate.of(2026, 12, 13), multi.lastDayInclusive)
        assertNull(calendarSlot(ev(""","recurrence":"Daily"""")))
    }

    @Test fun datesReadLikeTheSite() {
        assertEquals("13 November 2026", longDate("2026-11-13"))
        assertEquals("Sat 14 Nov 2026", eventDay(LocalDate.of(2026, 11, 14)))
        assertEquals("4:00 PM", puneTime(OffsetDateTime.parse("2026-11-14T16:00:00+05:30")))
    }

    @Test fun historyWithoutSourcesNeverShips() {
        val h = parseHistory(Json.parseToJsonElement("""[
          {"id":"a","era":"Peshwa","year":1730,"title_en":"Founded","title_mr":"पायाभरणी","summary_en":"s","sources":[{"label":"Gazetteer","url":"https://example.org/g"}],"checked_at":"2026-11-14"},
          {"id":"b","era":"Peshwa","year":1731,"title_en":"No source","summary_en":"s","sources":[],"checked_at":"2026-11-14"},
          {"id":"c","era":"British","year":1885,"title_en":"Plain URL","summary_en":"s","sources":["https://example.org/p"],"checked_at":"2026-11-14"}]"""))
        assertEquals(listOf("a", "c"), h.map { it.id })
        assertEquals("Gazetteer", h[0].sources.single().title); assertEquals("example.org", h[1].sources.single().title)
    }

    @Test fun shopsKeepSinceOnlyWhenGiven() {
        val (areas, shops) = parseShopping(Json.parseToJsonElement("""{
          "areas":[{"id":"t","name":"Tulshibaug","area":"Budhwar Peth","known_for":["utensils","fabric"],"sources":["https://example.org/t"]},{"id":"x","name":"No source","sources":[]}],
          "shops":[{"id":"s1","name":"Old","area":"Laxmi Road","since":1925,"sources":["https://example.org/s"],"checked_at":"2026-11-14"},
                   {"id":"s2","name":"New","area":"Camp","sources":["https://example.org/n"],"checked_at":"2026-11-14"}]}"""))
        assertEquals(listOf("t"), areas.map { it.id }); assertEquals("utensils, fabric", areas[0].knownFor)
        assertEquals(1925, shops[0].since); assertNull(shops[1].since)
    }
}
