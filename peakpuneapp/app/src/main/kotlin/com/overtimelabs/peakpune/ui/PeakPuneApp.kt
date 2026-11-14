package com.overtimelabs.peakpune.ui

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Event
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Place
import androidx.compose.material.icons.filled.Terrain
import androidx.compose.material.icons.filled.Train
import androidx.compose.material.icons.outlined.Event
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Info
import androidx.compose.material.icons.outlined.Place
import androidx.compose.material.icons.outlined.Terrain
import androidx.compose.material.icons.outlined.Train
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.Modifier
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.overtimelabs.peakpune.ui.components.Wordmark
import com.overtimelabs.peakpune.ui.screens.AboutScreen
import com.overtimelabs.peakpune.ui.screens.AreaDetail
import com.overtimelabs.peakpune.ui.screens.EventDetail
import com.overtimelabs.peakpune.ui.screens.ExploreScreen
import com.overtimelabs.peakpune.ui.screens.HistoryDetail
import com.overtimelabs.peakpune.ui.screens.HistoryScreen
import com.overtimelabs.peakpune.ui.screens.HomeScreen
import com.overtimelabs.peakpune.ui.screens.MeetupDetail
import com.overtimelabs.peakpune.ui.screens.MetroScreen
import com.overtimelabs.peakpune.ui.screens.OutdoorDetail
import com.overtimelabs.peakpune.ui.screens.OutdoorsScreen
import com.overtimelabs.peakpune.ui.screens.PlaceDetail
import com.overtimelabs.peakpune.ui.screens.PlansScreen
import com.overtimelabs.peakpune.ui.screens.ShopDetail
import com.overtimelabs.peakpune.ui.screens.ShoppingScreen
import com.overtimelabs.peakpune.ui.screens.WelcomeScreen
import com.overtimelabs.peakpune.ui.theme.PP
import com.overtimelabs.peakpune.ui.theme.PeakPuneTheme
import com.overtimelabs.peakpune.ui.theme.body

/** Navigation actions, available to every screen. */
class Nav(private val c: NavHostController) {
    fun place(id: String) = c.navigate("place/$id")
    fun outdoor(id: String) = c.navigate("outdoor/$id")
    fun event(id: String) = c.navigate("event/$id")
    fun meetup(id: String) = c.navigate("meetup/$id")
    fun history() = c.navigate("history")
    fun historyEntry(id: String) = c.navigate("historyEntry/$id")
    fun shopping() = c.navigate("shopping")
    fun area(id: String) = c.navigate("area/$id")
    fun shop(id: String) = c.navigate("shop/$id")
    fun about() = c.navigate("about")
    fun back() { c.popBackStack() }
}

val LocalNav = staticCompositionLocalOf<Nav> { error("Nav not provided") }

private const val AXIS = 300

@Composable
fun PeakPuneApp(state: AppState) {
    PeakPuneTheme {
        CompositionLocalProvider(LocalAppState provides state) {
            AnimatedContent(state.welcomeSeen, transitionSpec = { fadeIn(tween(AXIS)) togetherWith fadeOut(tween(AXIS)) }, label = "welcome") { seen ->
                if (!seen) Box(Modifier) { WelcomeScreen(state::finishWelcome) } else AppNav()
            }
        }
    }
}

@Composable
private fun AppNav() {
    val controller = rememberNavController()
    val nav = Nav(controller)
    CompositionLocalProvider(LocalNav provides nav) {
        // Material shared-axis (X): detail pages slide and fade in from the side, 300 ms.
        NavHost(
            controller, startDestination = "main",
            enterTransition = { slideInHorizontally(tween(AXIS)) { it / 8 } + fadeIn(tween(AXIS)) },
            exitTransition = { slideOutHorizontally(tween(AXIS)) { -it / 8 } + fadeOut(tween(AXIS / 2)) },
            popEnterTransition = { slideInHorizontally(tween(AXIS)) { -it / 8 } + fadeIn(tween(AXIS)) },
            popExitTransition = { slideOutHorizontally(tween(AXIS)) { it / 8 } + fadeOut(tween(AXIS / 2)) },
        ) {
            composable("main") { Shell() }
            composable("place/{id}") { PlaceDetail(it.arguments?.getString("id")!!) }
            composable("outdoor/{id}") { OutdoorDetail(it.arguments?.getString("id")!!) }
            composable("event/{id}") { EventDetail(it.arguments?.getString("id")!!) }
            composable("meetup/{id}") { MeetupDetail(it.arguments?.getString("id")!!) }
            composable("history") { HistoryScreen() }
            composable("historyEntry/{id}") { HistoryDetail(it.arguments?.getString("id")!!) }
            composable("shopping") { ShoppingScreen() }
            composable("area/{id}") { AreaDetail(it.arguments?.getString("id")!!) }
            composable("shop/{id}") { ShopDetail(it.arguments?.getString("id")!!) }
            composable("about") { AboutScreen() }
        }
    }
}

private data class Dest(val label: String, val on: androidx.compose.ui.graphics.vector.ImageVector, val off: androidx.compose.ui.graphics.vector.ImageVector)

private val DESTS = listOf(
    Dest("Home", Icons.Filled.Home, Icons.Outlined.Home),
    Dest("Explore", Icons.Filled.Place, Icons.Outlined.Place),
    Dest("Outdoors", Icons.Filled.Terrain, Icons.Outlined.Terrain),
    Dest("Plans", Icons.Filled.Event, Icons.Outlined.Event),
    Dest("Metro", Icons.Filled.Train, Icons.Outlined.Train),
)

/** Five tabs with a Brick pill for the current one. Tab changes fade through (Material motion)
 *  with a light haptic. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun Shell() {
    val state = LocalAppState.current
    val nav = LocalNav.current
    val haptics = LocalHapticFeedback.current
    Scaffold(
        containerColor = PP.Paper,
        topBar = {
            androidx.compose.foundation.layout.Column {
                TopAppBar(
                    title = { Wordmark() },
                    actions = { IconButton(onClick = nav::about) { Icon(Icons.Outlined.Info, contentDescription = "About Peak Pune") } },
                    colors = TopAppBarDefaults.topAppBarColors(containerColor = PP.Paper),
                )
                HorizontalDivider(thickness = 2.dp, color = PP.Ink)
            }
        },
        bottomBar = {
            androidx.compose.foundation.layout.Column {
                HorizontalDivider(thickness = 2.dp, color = PP.Ink)
                NavigationBar(containerColor = PP.Paper, tonalElevation = 0.dp) {
                    DESTS.forEachIndexed { i, d ->
                        NavigationBarItem(
                            selected = state.tab == i,
                            onClick = { if (state.tab != i) { haptics.performHapticFeedback(HapticFeedbackType.SegmentTick); state.tab = i } },
                            icon = { Icon(if (state.tab == i) d.on else d.off, contentDescription = null) },
                            label = { Text(d.label, style = body(12, if (state.tab == i) 800 else 600)) },
                            colors = NavigationBarItemDefaults.colors(indicatorColor = PP.Brick, selectedIconColor = PP.White, unselectedIconColor = PP.Ink, selectedTextColor = PP.Ink, unselectedTextColor = PP.Ink),
                        )
                    }
                }
            }
        },
    ) { pad ->
        AnimatedContent(
            state.tab, modifier = Modifier.padding(pad), label = "tab",
            // Fade through: outgoing fades out quickly, incoming fades and scales in slightly.
            transitionSpec = { (fadeIn(tween(210, 90)) + scaleIn(tween(210, 90), initialScale = 0.96f)) togetherWith fadeOut(tween(90)) },
        ) { tab ->
            when (tab) {
                0 -> HomeScreen()
                1 -> ExploreScreen()
                2 -> OutdoorsScreen()
                3 -> PlansScreen()
                else -> MetroScreen()
            }
        }
    }
}
