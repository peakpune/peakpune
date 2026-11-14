package com.overtimelabs.peakpune.ui.components

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.History
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.ripple
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.overtimelabs.peakpune.ui.theme.PP
import com.overtimelabs.peakpune.ui.theme.body
import com.overtimelabs.peakpune.ui.theme.display

/** A white card with a 4 px Ink outline (`.card`). Pressed, it lifts onto the 6 px hard Ink
 *  shadow the site shows on hover (`--lift`), with a ripple. */
@Composable
fun InkCard(
    modifier: Modifier = Modifier,
    onClick: (() -> Unit)? = null,
    color: Color = PP.White,
    contentPadding: Dp = PP.s5,
    content: @Composable () -> Unit,
) {
    val source = remember { MutableInteractionSource() }
    val pressed by source.collectIsPressedAsState()
    val lift by animateDpAsState(if (pressed && onClick != null) PP.lift else 0.dp, tween(PP.FAST), label = "lift")
    val shape = RoundedCornerShape(PP.rCard)
    Box(modifier.fillMaxWidth()) {
        if (lift > 0.dp) Box(Modifier.matchParentSize().offset(lift / 2, lift / 2).background(PP.Ink, shape))
        Box(
            Modifier
                .offset(-lift / 2, -lift / 2)
                .fillMaxWidth()
                .heightIn(min = PP.tap)
                .clip(shape)
                .background(color)
                .border(PP.outline, PP.Ink, shape)
                .then(if (onClick != null) Modifier.clickable(source, ripple(color = PP.Haldi), role = Role.Button, onClick = onClick) else Modifier)
                .padding(contentPadding),
        ) { content() }
    }
}

/** Small uppercase Brick label above a title (`.eyebrow`). */
@Composable
fun Eyebrow(text: String, color: Color = PP.Brick) =
    Text(text.uppercase(), style = MaterialTheme.typography.labelSmall.copy(color = color))

/** Sage pill for tags (`.tags li`). */
@Composable
fun TagPill(text: String, fill: Color = PP.Sage) = Text(
    text,
    style = body(14, 500, 1.43f, PP.onFill(fill)),
    modifier = Modifier.background(fill, CircleShape).padding(horizontal = PP.s3, vertical = PP.s1),
)

/** Outlined pill badge (`.level`): Easy on Sage, Moderate on Haldi, Hard on Brick. */
@Composable
fun LevelBadge(text: String, fill: Color) = Text(
    text,
    style = body(14, 600, 1.43f, PP.onFill(fill)),
    modifier = Modifier.background(fill, CircleShape).border(1.dp, if (fill == PP.Brick) PP.Brick else PP.Ink, CircleShape).padding(horizontal = PP.s3, vertical = 2.dp),
)

fun difficultyFill(d: String?) = when (d?.lowercase()) {
    "easy" -> PP.Sage
    "moderate" -> PP.Haldi
    "challenging", "hard" -> PP.Brick
    else -> PP.Paper
}

@Composable
fun MetaText(text: String) = Text(text, style = body(14, 500, 1.43f))

/** The Haldi signboard: 5 px Ink border, 8 px hard shadow, tilted 2 degrees (`.sign`). */
@Composable
fun Signboard(text: String, small: String? = null, tilt: Float = -2f) {
    val shape = RoundedCornerShape(PP.rCard)
    Box(Modifier.rotate(tilt).padding(end = PP.signShadow, bottom = PP.signShadow)) {
        Box(Modifier.matchParentSize().offset(PP.signShadow, PP.signShadow).background(PP.Ink, shape))
        Column(
            Modifier.fillMaxWidth().background(PP.Haldi, shape).border(5.dp, PP.Ink, shape).padding(horizontal = PP.s6, vertical = PP.s8),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(text, style = display(26, 700, 1.3f), textAlign = TextAlign.Center)
            if (small != null) {
                Spacer(Modifier.height(PP.s4))
                Text(small.uppercase(), style = body(12, 600, 1.33f, tracking = 1.2f), textAlign = TextAlign.Center)
            }
        }
    }
}

/** A flat category block (`.category`): fills cycle Brick, Haldi, Sage, Clay. */
@Composable
fun CategoryTile(index: Int, title: String, subtitle: String, icon: ImageVector, modifier: Modifier = Modifier, onClick: () -> Unit) {
    val fill = PP.blockCycle[index % PP.blockCycle.size]
    val fg = PP.onFill(fill)
    Column(
        modifier
            .heightIn(min = 128.dp)
            .clip(RoundedCornerShape(PP.rCard))
            .background(fill)
            .clickable(role = Role.Button, onClick = onClick)
            .clearAndSetSemantics { contentDescription = "$title. $subtitle"; role = Role.Button }
            .padding(PP.s5),
        verticalArrangement = Arrangement.SpaceBetween,
    ) {
        Icon(icon, contentDescription = null, tint = fg, modifier = Modifier.size(26.dp))
        Column {
            Spacer(Modifier.height(PP.s4))
            Text(title, style = display(21, 600, 1.24f, fg))
            Spacer(Modifier.height(PP.s1))
            Text(subtitle, style = body(14, 600, 1.43f, fg))
        }
    }
}

/** Section heading with an optional "more" link (`.section-head`). */
@Composable
fun SectionHead(title: String, note: String? = null, more: String? = null, onMore: (() -> Unit)? = null) {
    Column(Modifier.fillMaxWidth().padding(start = PP.s4, end = PP.s4, top = PP.s8, bottom = PP.s4)) {
        Row(verticalAlignment = Alignment.Bottom) {
            Text(title, style = MaterialTheme.typography.headlineSmall, modifier = Modifier.weight(1f).semantics { heading() })
            if (more != null && onMore != null) LinkButton(more, onMore)
        }
        if (note != null) { Spacer(Modifier.height(PP.s1)); Text(note, style = MaterialTheme.typography.bodySmall) }
    }
}

@Composable
fun LinkButton(text: String, onClick: () -> Unit) = Text(
    text,
    style = body(15, 600, 1.4f, PP.Brick),
    modifier = Modifier.heightIn(min = PP.tap).clip(CircleShape).clickable(role = Role.Button, onClick = onClick).padding(horizontal = PP.s3, vertical = 14.dp),
)

/** A notice box (`.flag`) for honesty notes such as stale sources. */
@Composable
fun FlagNote(text: String, fill: Color = PP.Clay, icon: ImageVector = Icons.Outlined.History) {
    Row(Modifier.fillMaxWidth().background(fill, RoundedCornerShape(PP.rInput)).padding(horizontal = PP.s4, vertical = PP.s3)) {
        Icon(icon, contentDescription = null, tint = PP.onFill(fill), modifier = Modifier.size(20.dp))
        Spacer(Modifier.width(PP.s3))
        Text(text, style = body(15, 500, 1.45f, PP.onFill(fill)))
    }
}

/** Ink pill button with white text (`.primary`). */
@Composable
fun PrimaryButton(text: String, onClick: () -> Unit, modifier: Modifier = Modifier, icon: ImageVector? = null, enabled: Boolean = true) = Button(
    onClick = onClick,
    enabled = enabled,
    modifier = modifier.heightIn(min = PP.tap),
    shape = CircleShape,
    border = BorderStroke(PP.chipBorder, PP.Ink),
    colors = ButtonDefaults.buttonColors(containerColor = PP.Ink, contentColor = PP.White),
) {
    if (icon != null) { Icon(icon, null, Modifier.size(20.dp)); Spacer(Modifier.width(PP.s2)) }
    Text(text, style = body(16, 700, 1.25f, PP.White))
}

/** Paper pill with an Ink outline (`.chip`). */
@Composable
fun SecondaryButton(text: String, onClick: () -> Unit, modifier: Modifier = Modifier, icon: ImageVector? = null, enabled: Boolean = true) = OutlinedButton(
    onClick = onClick,
    enabled = enabled,
    modifier = modifier.heightIn(min = PP.tap),
    shape = CircleShape,
    border = BorderStroke(PP.chipBorder, if (enabled) PP.Ink else PP.Rule),
    colors = ButtonDefaults.outlinedButtonColors(containerColor = PP.Paper, contentColor = PP.Ink),
) {
    if (icon != null) { Icon(icon, null, Modifier.size(20.dp)); Spacer(Modifier.width(PP.s2)) }
    Text(text, style = body(15, 700, 1.25f, if (enabled) PP.Ink else PP.InkSoft))
}

/** Selectable chip: Paper with an Ink outline; selected is solid Ink with white text. */
@Composable
fun FilterPill(text: String, selected: Boolean, onClick: () -> Unit) {
    val bg by animateColorAsState(if (selected) PP.Ink else PP.Paper, tween(PP.FAST), label = "chip")
    Text(
        text,
        style = body(14, 600, 1.4f, if (selected) PP.White else PP.Ink),
        modifier = Modifier
            .heightIn(min = PP.tap)
            .padding(vertical = 4.dp)
            .clip(CircleShape)
            .background(bg)
            .border(PP.chipBorder, PP.Ink, CircleShape)
            .clickable(role = Role.Checkbox, onClick = onClick)
            .semantics { this.selected = selected }
            .padding(horizontal = PP.s4, vertical = 10.dp),
    )
}

/** Pill tabs with a solid Brick pill for the current one, as the site's navigation. */
@Composable
fun PillTabs(tabs: List<String>, selected: Int, onSelect: (Int) -> Unit, modifier: Modifier = Modifier) {
    val haptics = LocalHapticFeedback.current
    Row(
        modifier.fillMaxWidth().padding(horizontal = PP.s4).border(PP.chipBorder, PP.Ink, CircleShape).padding(PP.s1).height(IntrinsicSize.Min),
        horizontalArrangement = Arrangement.spacedBy(PP.s1),
    ) {
        tabs.forEachIndexed { i, t ->
            val on = i == selected
            val bg by animateColorAsState(if (on) PP.Brick else Color.Transparent, tween(PP.MEDIUM), label = "tab")
            Box(
                Modifier
                    .weight(1f)
                    .heightIn(min = PP.tap)
                    .clip(CircleShape)
                    .background(bg)
                    .clickable(role = Role.Tab) { if (!on) { haptics.performHapticFeedback(HapticFeedbackType.SegmentTick); onSelect(i) } }
                    .semantics { this.selected = on },
                contentAlignment = Alignment.Center,
            ) { Text(t, style = body(15, if (on) 700 else 600, 1.3f, if (on) PP.White else PP.Ink), textAlign = TextAlign.Center, modifier = Modifier.padding(horizontal = PP.s2, vertical = PP.s2)) }
        }
    }
}

/** A list card (`.card`): eyebrow, Fraunces title, summary and a meta line. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun EntryCard(
    eyebrow: String,
    title: String,
    onClick: () -> Unit,
    summary: String? = null,
    footer: String? = null,
    titleStyle: androidx.compose.ui.text.TextStyle = MaterialTheme.typography.titleLarge,
    summaryStyle: androidx.compose.ui.text.TextStyle = body(16, 400, 1.5f, PP.InkSoft),
    meta: @Composable (() -> Unit)? = null,
) = InkCard(onClick = onClick) {
    Column {
        Eyebrow(eyebrow)
        Spacer(Modifier.height(PP.s2))
        Text(title, style = titleStyle)
        if (!summary.isNullOrEmpty()) {
            Spacer(Modifier.height(PP.s2))
            Text(summary, style = summaryStyle)
        }
        if (meta != null) {
            Spacer(Modifier.height(PP.s3))
            FlowRow(horizontalArrangement = Arrangement.spacedBy(PP.s2), verticalArrangement = Arrangement.spacedBy(PP.s2), itemVerticalAlignment = Alignment.CenterVertically) { meta() }
        }
        if (footer != null) { Spacer(Modifier.height(PP.s2)); Text(footer, style = MaterialTheme.typography.bodySmall) }
    }
}

data class Action(val label: String, val icon: ImageVector? = null, val primary: Boolean = false, val onClick: () -> Unit)

/** Empty and "nothing here yet" states, always with a way on. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun EmptyState(title: String, message: String, icon: ImageVector, actions: List<Action> = emptyList()) {
    Column(Modifier.fillMaxWidth().padding(horizontal = PP.s6, vertical = PP.s10), horizontalAlignment = Alignment.CenterHorizontally) {
        Box(Modifier.size(64.dp).background(PP.Sage, CircleShape).border(2.dp, PP.Ink, CircleShape), contentAlignment = Alignment.Center) {
            Icon(icon, null, tint = PP.Ink, modifier = Modifier.size(32.dp))
        }
        Spacer(Modifier.height(PP.s5))
        Text(title, style = display(24, 800, 1.2f), textAlign = TextAlign.Center)
        Spacer(Modifier.height(PP.s2))
        Text(message, style = body(16, 400, 1.5f, PP.InkSoft), textAlign = TextAlign.Center)
        if (actions.isNotEmpty()) {
            Spacer(Modifier.height(PP.s5))
            FlowRow(horizontalArrangement = Arrangement.spacedBy(PP.s3, Alignment.CenterHorizontally)) {
                actions.forEach { if (it.primary) PrimaryButton(it.label, it.onClick) else SecondaryButton(it.label, it.onClick) }
            }
        }
    }
}

/** The Peak Pune mark from site/mark.svg.html: a Haldi signboard with a hill and a Brick sun. */
@Composable
fun PeakMark(height: Dp = 34.dp) {
    Canvas(Modifier.size(width = height * 36f / 40f, height = height)) {
        val k = size.height / 40f
        fun r(x: Float, y: Float, w: Float, h: Float) = Offset(x * k, y * k) to Size(w * k, h * k)
        val (o1, s1) = r(5f, 5f, 29f, 33f)
        drawRoundRect(PP.Ink, o1, s1, CornerRadius(4 * k))
        val (o2, s2) = r(1.5f, 1.5f, 29f, 33f)
        drawRoundRect(PP.Haldi, o2, s2, CornerRadius(4 * k))
        drawRoundRect(PP.Ink, o2, s2, CornerRadius(4 * k), style = Stroke(3 * k))
        drawPath(Path().apply { moveTo(5 * k, 28 * k); lineTo(13 * k, 15 * k); lineTo(18 * k, 22 * k); lineTo(22 * k, 16 * k); lineTo(28 * k, 28 * k); close() }, PP.Ink)
        drawCircle(PP.Brick, 3 * k, Offset(23 * k, 9 * k))
    }
}

/** "Peak Pune" with Pune in Brick (`.wordmark span`). */
@Composable
fun Wordmark() = Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.clearAndSetSemantics { contentDescription = "Peak Pune" }) {
    PeakMark(30.dp)
    Spacer(Modifier.width(PP.s3))
    Text(buildAnnotatedString { append("Peak "); withStyle(SpanStyle(color = PP.Brick)) { append("Pune") } }, style = display(24, 800, 1.1f), maxLines = 1)
}
