package com.overtimelabs.peakpune.ui.theme

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.ColorScheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Typography
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontVariation
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.overtimelabs.peakpune.R

/** Brand tokens, copied from public/tokens.css. Change them there first. */
object PP {
    val Ink = Color(0xFF1C1410) // Chai Ink: text, rules, outlines
    val Paper = Color(0xFFF6EFE2) // Peth Paper: ground
    val Brick = Color(0xFFB8381F) // Wada Brick: current tab, eyebrows, links
    val Haldi = Color(0xFFE8A317) // fills only, never small text on paper
    val Sage = Color(0xFFC9D6B5) // Mutha Sage
    val Clay = Color(0xFFD9B99B) // Misal Clay
    val White = Color(0xFFFFFFFF)
    val InkSoft = Color(0xFF50453E) // --ink-soft: small note text
    val Rule = Color(0x261C1410) // --rule: Ink at 15 %
    val BrickDark = Color(0xFF98290F) // --brick-dark

    /** Category blocks cycle these flat fills. */
    val blockCycle = listOf(Brick, Haldi, Sage, Clay)

    /** Text on Brick is white; on Haldi, Sage, Clay, Paper and white it is Ink. */
    fun onFill(fill: Color) = if (fill == Brick || fill == Ink || fill == BrickDark) White else Ink

    // 4 px grid, radii, outlines, hard shadows.
    val s1 = 4.dp; val s2 = 8.dp; val s3 = 12.dp; val s4 = 16.dp; val s5 = 20.dp; val s6 = 24.dp; val s8 = 32.dp; val s10 = 40.dp; val s12 = 48.dp
    val rInput = 10.dp; val rCard = 14.dp
    val outline = 4.dp; val chipBorder = 2.dp
    val lift = 6.dp // --lift: 6px 6px 0 ink
    val signShadow = 8.dp
    val tap = 48.dp

    const val FAST = 200; const val MEDIUM = 250; const val SLOW = 300

    const val SITE = "https://peakpune.com"
    const val REPO = "https://github.com/peakpune/peakpune"
}

// Variable fonts from public/fonts/: each weight is an explicit instance of the wght axis.
private fun fraunces(w: Int) = Font(R.font.fraunces, FontWeight(w), variationSettings = FontVariation.Settings(FontVariation.weight(w)))
private fun inter(w: Int) = Font(R.font.inter, FontWeight(w), variationSettings = FontVariation.Settings(FontVariation.weight(w)))

val Fraunces = FontFamily(fraunces(600), fraunces(700), fraunces(800))
val Inter = FontFamily(inter(400), inter(500), inter(600), inter(700), inter(800))

fun display(size: Int, weight: Int = 800, lineHeight: Float = 1.15f, color: Color = PP.Ink) =
    TextStyle(fontFamily = Fraunces, fontWeight = FontWeight(weight), fontSize = size.sp, lineHeight = (size * lineHeight).sp, color = color)

fun body(size: Int, weight: Int = 400, lineHeight: Float = 1.5f, color: Color = PP.Ink, tracking: Float = 0f) =
    TextStyle(fontFamily = Inter, fontWeight = FontWeight(weight), fontSize = size.sp, lineHeight = (size * lineHeight).sp, color = color, letterSpacing = tracking.sp)

/** Marathi text: the system Devanagari font (Inter has no Devanagari glyphs). */
fun TextStyle.marathi() = copy(fontFamily = FontFamily.Default)

private val scheme: ColorScheme = lightColorScheme(
    primary = PP.Ink, onPrimary = PP.White,
    secondary = PP.Brick, onSecondary = PP.White,
    tertiary = PP.Haldi, onTertiary = PP.Ink,
    background = PP.Paper, onBackground = PP.Ink,
    surface = PP.Paper, onSurface = PP.Ink, onSurfaceVariant = PP.InkSoft,
    surfaceContainerLowest = PP.White, surfaceContainerLow = PP.White, surfaceContainer = PP.Paper,
    surfaceContainerHigh = PP.Paper, surfaceContainerHighest = PP.Clay,
    secondaryContainer = PP.Brick, onSecondaryContainer = PP.White,
    outline = PP.Ink, outlineVariant = PP.Rule,
    error = PP.BrickDark, onError = PP.White,
    surfaceTint = Color.Transparent,
)

private val typography = Typography(
    displaySmall = display(38, lineHeight = 1.1f),
    headlineMedium = display(30, lineHeight = 1.12f),
    headlineSmall = display(24, lineHeight = 1.2f),
    titleLarge = display(22, 600, 1.3f),
    titleMedium = display(19, 600, 1.3f),
    titleSmall = body(15, 700, 1.35f),
    bodyLarge = body(17, 500, 1.55f),
    bodyMedium = body(16, 400, 1.5f),
    bodySmall = body(14, 400, 1.45f, PP.InkSoft),
    labelLarge = body(16, 700, 1.25f),
    labelMedium = body(14, 600, 1.4f),
    labelSmall = body(12, 800, 1.33f, PP.Brick, tracking = 1.7f),
)

/** Light theme only, by design: flat fills, no gradients, no dark mode. */
@Composable
fun PeakPuneTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = scheme,
        typography = typography,
        shapes = Shapes(small = RoundedCornerShape(PP.rInput), medium = RoundedCornerShape(PP.rCard), large = RoundedCornerShape(PP.rCard)),
        content = content,
    )
}
