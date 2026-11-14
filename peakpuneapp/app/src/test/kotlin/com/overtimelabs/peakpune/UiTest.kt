package com.overtimelabs.peakpune

import android.content.Context
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.test.SemanticsMatcher
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.hasContentDescription
import androidx.compose.ui.test.hasScrollAction
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollToNode
import androidx.compose.ui.test.performTextInput
import com.overtimelabs.peakpune.data.Library
import com.overtimelabs.peakpune.data.parseHistory
import com.overtimelabs.peakpune.ui.AppState
import com.overtimelabs.peakpune.ui.PeakPuneApp
import kotlinx.serialization.json.Json
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config
import java.time.OffsetDateTime

/** UI tests: the real app on Robolectric, with a fixed clock and the bundled data. */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35], qualifiers = "w393dp-h852dp")
class UiTest {
    @get:Rule val rule = createComposeRule()

    private val prefs get() = RuntimeEnvironment.getApplication().getSharedPreferences("ui-test", Context.MODE_PRIVATE)

    private fun launch(at: String = "2026-11-14T08:00:00+05:30", welcomeSeen: Boolean = true, library: Library = TestData.library, lang: String = "en"): AppState {
        prefs.edit().clear().putBoolean(AppState.KEY_WELCOME, welcomeSeen).commit()
        val state = AppState(library, prefs, { OffsetDateTime.parse(at).toInstant() }, lang)
        rule.setContent { PeakPuneApp(state) }
        rule.waitForIdle()
        return state
    }

    private fun tab(label: String) =
        rule.onNode(hasText(label) and SemanticsMatcher.expectValue(SemanticsProperties.Role, Role.Tab)).performClick().also { rule.waitForIdle() }

    /** The screen's main vertical list (filter rows scroll sideways and are skipped). */
    private val mainList = hasScrollAction() and SemanticsMatcher.keyIsDefined(SemanticsProperties.VerticalScrollAxisRange)

    private fun scrollTo(text: String, substring: Boolean = false) =
        rule.onNode(mainList).performScrollToNode(hasText(text, substring = substring))

    private fun open(text: String) { scrollTo(text); rule.onNodeWithText(text).performClick(); rule.waitForIdle() }

    /** Home tiles read as one button: "Title. Subtitle". */
    private fun tile(title: String) = hasContentDescription("$title. ", substring = true)

    private fun openTile(title: String) {
        rule.onNode(mainList).performScrollToNode(tile(title)); rule.onNode(tile(title)).performClick(); rule.waitForIdle()
    }

    @Test fun welcomeShowsOnceThenHome() {
        launch(welcomeSeen = false)
        rule.onNodeWithText("Start exploring").performClick()
        rule.waitForIdle()
        rule.onNodeWithText("This weekend in Pune").assertIsDisplayed()
        assertTrue(prefs.getBoolean(AppState.KEY_WELCOME, false))
    }

    @Test fun homeShowsThisWeekendFromTheData() {
        launch()
        val soldierathon = TestData.library.events.first { it.id == "event-cme-soldierathon-pune-2026-11-15" }.name
        scrollTo(soldierathon)
        rule.onNodeWithText(soldierathon).assertIsDisplayed()
    }

    @Test fun bottomTabsSwitchScreens() {
        launch()
        tab("Explore"); rule.onNodeWithText("Addresses, timings and prices", substring = true).assertIsDisplayed()
        tab("Metro"); rule.onNodeWithText("Journey planner").assertIsDisplayed()
        tab("Home"); rule.onNodeWithText("This weekend in Pune").assertIsDisplayed()
    }

    @Test fun placeDetailNeverCallsUnknownPriceFreeAndShowsCheckedDate() {
        launch()
        val p = TestData.library.place("place-shaniwar-wada")!!
        tab("Explore")
        open(p.name)
        scrollTo("Price not confirmed"); rule.onNodeWithText("Price not confirmed").assertIsDisplayed()
        scrollTo("Checked on 13 November 2026.")
        rule.onNodeWithText("Checked on 13 November 2026.").assertIsDisplayed()
        rule.onNodeWithText("Free").assertDoesNotExist()
    }

    @Test fun entriesOlderThan90DaysAreFlagged() {
        launch(at = "2027-03-01T10:00:00+05:30")
        tab("Explore")
        open(TestData.library.place("place-shaniwar-wada")!!.name)
        rule.onNodeWithText("Checked more than 90 days ago", substring = true).assertIsDisplayed()
    }

    @Test fun expiredEventsAreHidden() {
        launch(at = "2026-11-16T09:00:00+05:30")
        tab("Plans")
        val gone = TestData.library.events.first { it.id == "event-cme-soldierathon-pune-2026-11-15" }.name
        val live = TestData.library.events.first { it.id == "event-karawaan-kamshet-paragliding-2026-11-21" }.name
        scrollTo(live); rule.onNodeWithText(live).assertIsDisplayed()
        rule.onNodeWithText(gone).assertDoesNotExist()
    }

    @Test fun metroPlannerFindsRouteAndExactFare() {
        launch()
        tab("Metro")
        pickStation("Boarding station", "Kasarwadi")
        pickStation("Destination station", "Bund Garden")
        scrollTo("₹30"); rule.onNodeWithText("₹30").assertIsDisplayed()
    }

    private fun pickStation(field: String, name: String) {
        rule.onNodeWithContentDescription("$field: not chosen").performClick(); rule.waitForIdle()
        rule.onNodeWithText("Search stations").performTextInput(name); rule.waitForIdle()
        rule.onNode(hasText(name) and SemanticsMatcher.expectValue(SemanticsProperties.Role, Role.Button)).performClick(); rule.waitForIdle()
    }

    @Test fun historyTogglesLanguageAndShowsSources() {
        val sample = parseHistory(Json.parseToJsonElement("""[{"id":"h1","era":"Peshwa era","year":1732,"title_en":"Shaniwar Wada completed","title_mr":"शनिवारवाडा पूर्ण","summary_en":"Fort palace of the Peshwas.","summary_mr":"पेशव्यांचा वाडा.","sources":[{"label":"Test gazetteer","url":"https://example.org/g"}],"checked_at":"2026-11-13"}]"""))
        launch(library = TestData.library.copy(history = sample, historyLoaded = true))
        openTile("History")
        rule.onNodeWithText("Shaniwar Wada completed").assertIsDisplayed()
        rule.onNodeWithText("1 source").assertIsDisplayed()
        rule.onNodeWithText("मराठी").performClick(); rule.waitForIdle()
        rule.onNodeWithText("शनिवारवाडा पूर्ण").assertIsDisplayed()
        rule.onNodeWithText("Shaniwar Wada completed").assertDoesNotExist()
        rule.onNodeWithText("शनिवारवाडा पूर्ण").performClick(); rule.waitForIdle()
        val source = hasContentDescription("Open source: Test gazetteer")
        rule.onNode(mainList).performScrollToNode(source); rule.onNode(source).assertIsDisplayed()
    }

    @Test fun historyDefaultsToMarathiOnMarathiPhones() {
        val sample = parseHistory(Json.parseToJsonElement("""[{"id":"h1","era":"Peshwa era","year":1732,"title_en":"Shaniwar Wada completed","title_mr":"शनिवारवाडा पूर्ण","summary_en":"s","sources":["https://example.org/g"],"checked_at":"2026-11-13"}]"""))
        launch(library = TestData.library.copy(history = sample, historyLoaded = true), lang = "mr")
        openTile("History")
        rule.onNodeWithText("शनिवारवाडा पूर्ण").assertIsDisplayed()
    }

    @Test fun shoppingWithoutDataSaysSoHonestly() {
        launch()
        openTile("Shopping")
        rule.onNodeWithText("The shopping guide is still being checked.").assertIsDisplayed()
    }

    @Test fun aboutShowsCheckedDatesAndPrivacy() {
        launch()
        rule.onNodeWithContentDescription("About Peak Pune").performClick(); rule.waitForIdle()
        rule.onNodeWithText("Publication audit of 13 November 2026").assertIsDisplayed()
        scrollTo("No accounts", substring = true)
        rule.onNodeWithText("No accounts", substring = true).assertIsDisplayed()
    }

    @Test @Config(fontScale = 1.3f) fun largeTextStillShowsEveryTile() {
        launch()
        listOf("Places", "Loops and treks", "Pune Metro", "History", "Shopping", "Meetups").forEach { title ->
            rule.onNode(mainList).performScrollToNode(tile(title)); rule.onNode(tile(title)).assertIsDisplayed()
        }
        // The tile's own text (not only its description) lays out in full at 130%.
        rule.onNode(mainList).performScrollToNode(tile("Pune Metro"))
        rule.onNodeWithText("Journey planner, works offline", useUnmergedTree = true).assertIsDisplayed()
    }
}
