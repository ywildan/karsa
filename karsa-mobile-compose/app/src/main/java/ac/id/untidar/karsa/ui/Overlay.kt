package ac.id.untidar.karsa.ui

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.compose.ui.window.Popup
import androidx.compose.ui.window.PopupProperties
import ac.id.untidar.karsa.icons.KarsaIcons
import ac.id.untidar.karsa.icons.LucideIcon
import ac.id.untidar.karsa.theme.Brand100
import ac.id.untidar.karsa.theme.Brand600
import ac.id.untidar.karsa.theme.Brand700
import ac.id.untidar.karsa.theme.Danger100
import ac.id.untidar.karsa.theme.Danger500
import ac.id.untidar.karsa.theme.Espresso
import ac.id.untidar.karsa.theme.Ink
import ac.id.untidar.karsa.theme.Ink2
import ac.id.untidar.karsa.theme.Line
import ac.id.untidar.karsa.theme.Muted
import ac.id.untidar.karsa.theme.Paper
import ac.id.untidar.karsa.theme.Paper2
import ac.id.untidar.karsa.theme.Paper3
import ac.id.untidar.karsa.theme.displayStyle
import ac.id.untidar.karsa.theme.sansStyle
import kotlin.math.roundToInt

/* ───────────── Bottom sheet ───────────── */

@Composable
fun KarsaSheet(
    open: Boolean,
    onClose: () -> Unit,
    title: String? = null,
    footer: (@Composable () -> Unit)? = null,
    content: @Composable ColumnScope.() -> Unit,
) {
    if (!open) return
    Dialog(
        onDismissRequest = onClose,
        properties = DialogProperties(usePlatformDefaultWidth = false, decorFitsSystemWindows = false),
    ) {
        val progress = remember { Animatable(0f) }
        LaunchedEffect(Unit) {
            progress.animateTo(
                targetValue = 1f,
                animationSpec = tween(340, easing = CubicBezierEasing(0.2f, 0.9f, 0.2f, 1f)),
            )
        }
        BoxWithConstraints(Modifier.fillMaxSize()) {
            Box(
                Modifier
                    .fillMaxSize()
                    .background(Espresso.copy(alpha = 0.5f * progress.value))
                    .clickable(
                        interactionSource = remember { MutableInteractionSource() },
                        indication = null,
                        onClick = onClose,
                    ),
            )
            Column(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .fillMaxWidth()
                    .offset(y = maxHeight * (1f - progress.value))
                    .heightIn(max = maxHeight * 0.86f)
                    .clip(RoundedCornerShape(topStart = 32.dp, topEnd = 32.dp))
                    .background(Paper)
                    .navigationBarsPadding(),
            ) {
                Box(
                    Modifier
                        .padding(top = 12.dp)
                        .align(Alignment.CenterHorizontally)
                        .size(width = 40.dp, height = 6.dp)
                        .clip(CircleShape)
                        .background(Paper3),
                )
                if (title != null) {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(start = 24.dp, end = 12.dp, top = 12.dp, bottom = 8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(title, modifier = Modifier.weight(1f), style = displayStyle(20, 700, 1.25f))
                        KarsaIconButton(
                            onClick = onClose,
                            variant = IconButtonVariant.Ghost,
                            contentDescription = "Tutup",
                        ) { LucideIcon(KarsaIcons.X, modifier = Modifier.size(20.dp), tint = Ink) }
                    }
                }
                Column(
                    modifier = Modifier
                        .weight(1f, fill = false)
                        .verticalScroll(rememberScrollState())
                        .padding(start = 24.dp, end = 24.dp, top = 8.dp, bottom = 24.dp),
                    content = content,
                )
                if (footer != null) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .drawBehind {
                                drawLine(Line, start = androidx.compose.ui.geometry.Offset(0f, 0f), end = androidx.compose.ui.geometry.Offset(size.width, 0f), strokeWidth = 1.dp.toPx())
                            }
                            .padding(start = 24.dp, end = 24.dp, top = 16.dp, bottom = 24.dp),
                    ) { footer() }
                }
            }
        }
    }
}

/* ───────────── Dialog konfirmasi ───────────── */

enum class DialogTone { Primary, Danger }

@Composable
fun KarsaDialog(
    open: Boolean,
    onClose: () -> Unit,
    title: String,
    onConfirm: () -> Unit,
    desc: String? = null,
    confirmLabel: String = "Ya",
    cancelLabel: String = "Batal",
    tone: DialogTone = DialogTone.Primary,
    content: (@Composable () -> Unit)? = null,
) {
    if (!open) return
    Dialog(
        onDismissRequest = onClose,
        properties = DialogProperties(usePlatformDefaultWidth = false, decorFitsSystemWindows = false),
    ) {
        val progress = remember { Animatable(0f) }
        LaunchedEffect(Unit) {
            progress.animateTo(
                targetValue = 1f,
                animationSpec = tween(220, easing = CubicBezierEasing(0.2f, 0.9f, 0.2f, 1f)),
            )
        }
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Espresso.copy(alpha = 0.55f * progress.value))
                .clickable(
                    interactionSource = remember { MutableInteractionSource() },
                    indication = null,
                    onClick = onClose,
                )
                .padding(24.dp),
            contentAlignment = Alignment.Center,
        ) {
            val shape = RoundedCornerShape(32.dp)
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .graphicsLayer {
                        alpha = progress.value
                        val scale = 0.94f + 0.06f * progress.value
                        scaleX = scale
                        scaleY = scale
                        translationY = (-4).dp.toPx() * (1f - progress.value)
                    }
                    .popShadow(shape)
                    .clip(shape)
                    .background(Color.White)
                    .clickable(
                        interactionSource = remember { MutableInteractionSource() },
                        indication = null,
                        onClick = {},
                    )
                    .padding(24.dp),
            ) {
                Box(
                    modifier = Modifier
                        .size(48.dp)
                        .clip(RoundedCornerShape(16.dp))
                        .background(if (tone == DialogTone.Danger) Danger100 else Brand100),
                    contentAlignment = Alignment.Center,
                ) {
                    if (tone == DialogTone.Danger) {
                        LucideIcon(KarsaIcons.TriangleAlert, modifier = Modifier.size(24.dp), tint = Danger500)
                    } else {
                        LucideIcon(KarsaIcons.Info, modifier = Modifier.size(24.dp), tint = Brand600)
                    }
                }
                Spacer(Modifier.height(16.dp))
                Text(title, style = displayStyle(22, 700, 1.25f))
                if (desc != null) {
                    Spacer(Modifier.height(8.dp))
                    Text(desc, style = sansStyle(14, 400, 1.625f, color = Ink2))
                }
                content?.invoke()
                Spacer(Modifier.height(24.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Box(Modifier.weight(1f)) {
                        KarsaButton(
                            text = cancelLabel,
                            onClick = onClose,
                            variant = ButtonVariant.Outline,
                            full = true,
                        )
                    }
                    Box(Modifier.weight(1f)) {
                        KarsaButton(
                            text = confirmLabel,
                            onClick = onConfirm,
                            variant = if (tone == DialogTone.Danger) ButtonVariant.Danger else ButtonVariant.Primary,
                            full = true,
                        )
                    }
                }
            }
        }
    }
}

/* ───────────── Select field (dibuka sebagai sheet) ───────────── */

class SheetOption(val value: String, val label: String, val sub: String? = null)

@Composable
fun SelectField(
    value: String,
    options: List<SheetOption>,
    onChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    label: String? = null,
    placeholder: String = "Pilih",
    sheetTitle: String? = null,
    disabled: Boolean = false,
    optional: Boolean = false,
) {
    var open by remember { mutableStateOf(false) }
    val current = options.firstOrNull { it.value == value }
    Column(modifier) {
        if (label != null) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(label, style = sansStyle(13, 600, 1.2f, color = Ink2))
                if (optional) Text("Opsional", style = sansStyle(12, 500, 1.2f, color = Muted))
            }
        }
        val shape = RoundedCornerShape(16.dp)
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(52.dp)
                .clip(shape)
                .background(Paper2)
                .clickable(enabled = !disabled) { open = true }
                .padding(horizontal = 16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = current?.label ?: placeholder,
                modifier = Modifier.weight(1f),
                style = sansStyle(15, 400, 1.5f, color = if (current != null) Ink else Muted.copy(alpha = 0.8f)),
                maxLines = 1,
            )
            LucideIcon(KarsaIcons.ChevronDown, modifier = Modifier.size(20.dp), tint = Muted)
        }
        if (disabled) {
            // The disabled trigger keeps the muted input look without intercepting taps.
            Box(Modifier.fillMaxWidth().height(0.dp))
        }
    }

    KarsaSheet(open = open, onClose = { open = false }, title = sheetTitle ?: label) {
        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            options.forEach { option ->
                val selected = option.value == value
                val shape = RoundedCornerShape(16.dp)
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(shape)
                        .background(if (selected) Brand100 else Color.White)
                        .then(if (selected) Modifier else Modifier.border(1.dp, Line, shape))
                        .clickable {
                            onChange(option.value)
                            open = false
                        }
                        .padding(horizontal = 16.dp, vertical = 14.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(Modifier.weight(1f)) {
                        Text(
                            option.label,
                            style = sansStyle(15, 600, 1.4f, color = if (selected) Brand700 else Ink),
                        )
                        if (option.sub != null) {
                            Text(option.sub, style = sansStyle(12, 400, 1.4f, color = Muted))
                        }
                    }
                    if (selected) {
                        LucideIcon(KarsaIcons.Check, modifier = Modifier.size(20.dp), tint = Brand600)
                    }
                }
            }
        }
    }
}

/* ───────────── Menu pop-up ───────────── */

class MenuEntry(
    val label: String,
    val icon: List<String>,
    val onClick: () -> Unit,
    val danger: Boolean = false,
)

@Composable
fun PopMenu(entries: List<MenuEntry>, modifier: Modifier = Modifier) {
    var open by remember { mutableStateOf(false) }
    val offsetPx = with(LocalDensity.current) { 48.dp.roundToPx() }
    Box(modifier) {
        KarsaIconButton(
            onClick = { open = !open },
            contentDescription = "Menu lainnya",
        ) { LucideIcon(KarsaIcons.EllipsisVertical, modifier = Modifier.size(20.dp), tint = Ink) }
        if (open) {
            Popup(
                alignment = Alignment.TopEnd,
                offset = IntOffset(0, offsetPx),
                onDismissRequest = { open = false },
                properties = PopupProperties(focusable = true, dismissOnClickOutside = true),
            ) {
                val shape = RoundedCornerShape(22.dp)
                Column(
                    modifier = Modifier
                        .width(240.dp)
                        .popShadow(shape)
                        .clip(shape)
                        .background(Color.White)
                        .border(1.dp, Ink.copy(alpha = 0.05f), shape)
                        .padding(6.dp),
                    verticalArrangement = Arrangement.spacedBy(2.dp),
                ) {
                    entries.forEach { entry ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(16.dp))
                                .clickable {
                                    open = false
                                    entry.onClick()
                                }
                                .padding(horizontal = 14.dp, vertical = 12.dp),
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(32.dp)
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(Paper2),
                                contentAlignment = Alignment.Center,
                            ) {
                                LucideIcon(
                                    entry.icon,
                                    modifier = Modifier.size(18.dp),
                                    tint = if (entry.danger) Danger500 else Ink2,
                                )
                            }
                            Text(
                                entry.label,
                                style = sansStyle(14, 600, 1.3f, color = if (entry.danger) Danger500 else Ink),
                            )
                        }
                    }
                }
            }
        }
    }
}
