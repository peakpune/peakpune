package com.overtimelabs.peakpune.ui

import android.content.SharedPreferences
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.runtime.staticCompositionLocalOf
import com.overtimelabs.peakpune.data.Library
import java.time.Instant
import java.util.Locale

enum class HistoryLang { EN, MR }

/** App-wide state. Everything stays on the device: two small preferences and the bundled
 *  library. Nothing is sent anywhere. */
class AppState(
    val library: Library,
    private val prefs: SharedPreferences,
    /** The clock. Tests pass a fixed time; expiry and freshness read it. */
    val now: () -> Instant = Instant::now,
    systemLanguage: String = Locale.getDefault().language,
) {
    var welcomeSeen by mutableStateOf(prefs.getBoolean(KEY_WELCOME, false))
        private set

    var historyLang by mutableStateOf(
        when (prefs.getString(KEY_LANG, null)) {
            "mr" -> HistoryLang.MR
            "en" -> HistoryLang.EN
            else -> if (systemLanguage == "mr") HistoryLang.MR else HistoryLang.EN // defaults to the system locale
        },
    )
        private set

    /** Selected bottom-navigation tab. */
    var tab by mutableIntStateOf(0)

    fun finishWelcome() {
        welcomeSeen = true
        prefs.edit().putBoolean(KEY_WELCOME, true).apply()
    }

    fun setLang(lang: HistoryLang) {
        historyLang = lang
        prefs.edit().putString(KEY_LANG, if (lang == HistoryLang.MR) "mr" else "en").apply()
    }

    companion object {
        const val KEY_WELCOME = "welcome_seen"
        const val KEY_LANG = "history_lang"
    }
}

val LocalAppState = staticCompositionLocalOf<AppState> { error("AppState not provided") }
