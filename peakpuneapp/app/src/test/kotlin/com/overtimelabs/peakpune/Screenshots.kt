package com.overtimelabs.peakpune

import android.content.Context
import android.graphics.Bitmap
import androidx.compose.ui.graphics.asAndroidBitmap
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.test.SemanticsMatcher
import androidx.compose.ui.test.captureToImage
import androidx.compose.ui.test.hasContentDescription
import androidx.compose.ui.test.hasScrollAction
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.onRoot
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollToNode
import androidx.compose.ui.test.performTextInput
import com.overtimelabs.peakpune.ui.AppState
import com.overtimelabs.peakpune.ui.PeakPuneApp
import org.junit.Assume.assumeTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode
import java.io.File
import java.time.OffsetDateTime

/** Store-style screenshots of the real Compose UI, rendered by Robolectric's native graphics.
 *  Runs only when -PscreenshotsDir is given. */
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [35], qualifiers = "w393dp-h852dp-xhdpi")
class Screenshots {
    @get:Rule val rule = createComposeRule()
    private val out = System.getProperty("peak.screenshots")?.let(::File)
    private val mainList = hasScrollAction() and SemanticsMatcher.keyIsDefined(SemanticsProperties.VerticalScrollAxisRange)

    private fun launch(welcome: Boolean = true) {
        assumeTrue(out != null)
        val prefs = RuntimeEnvironment.getApplication().getSharedPreferences("shots", Context.MODE_PRIVATE)
        prefs.edit().clear().putBoolean(AppState.KEY_WELCOME, welcome).commit()
        val state = AppState(TestData.library, prefs, { OffsetDateTime.parse("2026-11-14T08:00:00+05:30").toInstant() }, "en")
        rule.setContent { PeakPuneApp(state) }
        rule.waitForIdle()
    }

    private fun shot(name: String) {
        rule.waitForIdle()
        out!!.mkdirs()
        File(out, "$name.png").outputStream().use { rule.onRoot().captureToImage().asAndroidBitmap().compress(Bitmap.CompressFormat.PNG, 100, it) }
    }

    private fun tab(label: String) { rule.onNode(hasText(label) and SemanticsMatcher.expectValue(SemanticsProperties.Role, Role.Tab)).performClick(); rule.waitForIdle() }
    private fun scroll(m: SemanticsMatcher) { rule.onNode(mainList).performScrollToNode(m); rule.waitForIdle() }

    @Test fun s01_welcome() { launch(welcome = false); shot("01-welcome") }
    @Test fun s02_home() { launch(); shot("02-home") }
    @Test fun s03_homeTiles() { launch(); scroll(hasContentDescription("Meetups. ", substring = true)); shot("03-home-browse") }
    @Test fun s04_explore() { launch(); tab("Explore"); shot("04-explore") }
    @Test fun s05_placeDetail() {
        launch(); tab("Explore")
        val name = TestData.library.place("place-shaniwar-wada")!!.name
        scroll(hasText(name)); rule.onNodeWithText(name).performClick(); rule.waitForIdle()
        shot("05-place-detail")
        scroll(hasText("Checked on", substring = true)); shot("06-place-sources")
    }
    @Test fun s07_outdoors() { launch(); tab("Outdoors"); shot("07-outdoors") }
    @Test fun s08_plans() { launch(); tab("Plans"); shot("08-plans") }
    @Test fun s09_eventDetail() {
        launch(); tab("Plans")
        val name = TestData.library.events.first { it.id == "event-karawaan-kamshet-paragliding-2026-11-21" }.name
        scroll(hasText(name)); rule.onNodeWithText(name).performClick(); rule.waitForIdle()
        shot("09-event-detail")
    }
    @Test fun s10_metro() {
        launch(); tab("Metro")
        listOf("Boarding station" to "Kasarwadi", "Destination station" to "Bund Garden").forEach { (field, station) ->
            rule.onNodeWithContentDescription("$field: not chosen").performClick(); rule.waitForIdle()
            rule.onNodeWithText("Search stations").performTextInput(station); rule.waitForIdle()
            rule.onNode(hasText(station) and SemanticsMatcher.expectValue(SemanticsProperties.Role, Role.Button)).performClick(); rule.waitForIdle()
        }
        shot("10-metro-route")
        scroll(hasText("₹30")); shot("11-metro-fare")
    }
    @Test fun s12_history() { launch(); scroll(hasContentDescription("History. ", substring = true)); rule.onNode(hasContentDescription("History. ", substring = true)).performClick(); shot("12-history") }
    @Test fun s13_about() { launch(); rule.onNodeWithContentDescription("About Peak Pune").performClick(); shot("13-about") }
}
