package com.overtimelabs.peakpune

import android.content.Context
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.toArgb
import com.overtimelabs.peakpune.data.Library
import com.overtimelabs.peakpune.ui.AppState
import com.overtimelabs.peakpune.ui.PeakPuneApp
import com.overtimelabs.peakpune.ui.theme.PP

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.light(PP.Paper.toArgb(), PP.Ink.toArgb()),
            navigationBarStyle = SystemBarStyle.light(PP.Paper.toArgb(), PP.Ink.toArgb()),
        )
        // All content ships inside the app; loading is local and quick.
        val library = Library.load { name -> runCatching { assets.open("data/$name").bufferedReader().use { it.readText() } }.getOrNull() }
        val state = AppState(library, getSharedPreferences("peakpune", Context.MODE_PRIVATE))
        setContent { Box(Modifier.fillMaxSize().safeDrawingPadding()) { PeakPuneApp(state) } }
    }
}
