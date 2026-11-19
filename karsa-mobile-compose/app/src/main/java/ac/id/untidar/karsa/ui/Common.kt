package ac.id.untidar.karsa.ui

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.LocalContentColor
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawWithCache
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.foundation.LocalIndication
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import ac.id.untidar.karsa.icons.KarsaIcons
import ac.id.untidar.karsa.icons.LucideIcon
import ac.id.untidar.karsa.theme.Brand100
import ac.id.untidar.karsa.theme.Brand400
import ac.id.untidar.karsa.theme.Brand500
import ac.id.untidar.karsa.theme.Brand600
import ac.id.untidar.karsa.theme.Brand700
import ac.id.untidar.karsa.theme.Butter100
import ac.id.untidar.karsa.theme.Butter700
import ac.id.untidar.karsa.theme.Danger100
import ac.id.untidar.karsa.theme.Danger500
import ac.id.untidar.karsa.theme.Espresso
import ac.id.untidar.karsa.theme.Espresso2
import ac.id.untidar.karsa.theme.Ink
import ac.id.untidar.karsa.theme.Ink2
import ac.id.untidar.karsa.theme.Leaf100
import ac.id.untidar.karsa.theme.Leaf600
import ac.id.untidar.karsa.theme.Line
import ac.id.untidar.karsa.theme.Muted
import ac.id.untidar.karsa.theme.Paper2
import ac.id.untidar.karsa.theme.Paper3
import ac.id.untidar.karsa.theme.Plum100
import ac.id.untidar.karsa.theme.Plum600
import ac.id.untidar.karsa.theme.Tide100
import ac.id.untidar.karsa.theme.Tide600
import ac.id.untidar.karsa.theme.displayStyle
import ac.id.untidar.karsa.theme.sansStyle

/* ───────────── Shadows ───────────── */

fun Modifier.cardShadow(shape: Shape, elevation: Dp = 10.dp): Modifier = this
    .shadow(
        elevation = elevation,
        shape = shape,
        clip = false,
        ambientColor = Espresso.copy(alpha = 0.05f),
        spotColor = Espresso.copy(alpha = 0.28f),
    )

fun Modifier.popShadow(shape: Shape): Modifier = this
    .shadow(
        elevation = 24.dp,
        shape = shape,
        clip = false,
        ambientColor = Espresso.copy(alpha = 0.18f),
        spotColor = Espresso.copy(alpha = 0.55f),
    )

fun Modifier.brandShadow(shape: Shape): Modifier = this
    .shadow(
        elevation = 12.dp,
        shape = shape,
        clip = false,
        ambientColor = Brand500.copy(alpha = 0.35f),
        spotColor = Brand500.copy(alpha = 0.85f),
    )

@Composable
fun Modifier.pressScale(interactionSource: MutableInteractionSource, pressedScale: Float = 0.98f): Modifier {
    val pressed by interactionSource.collectIsPressedAsState()
    val scale by animateFloatAsState(
        targetValue = if (pressed) pressedScale else 1f,
        animationSpec = tween(durationMillis = 120),
        label = "press",
    )
    return this.graphicsLayer {
        scaleX = scale
        scaleY = scale
    }
}

/* ───────────── Button ───────────── */

enum class ButtonVariant { Primary, Dark, Soft, Outline, Ghost, Danger, DangerSoft }
enum class ButtonSize { Sm, Md, Lg }

@Composable
fun KarsaButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    variant: ButtonVariant = ButtonVariant.Primary,
    size: ButtonSize = ButtonSize.Md,
    full: Boolean = false,
    loading: Boolean = false,
    enabled: Boolean = true,
    leading: (@Composable () -> Unit)? = null,
    trailing: (@Composable () -> Unit)? = null,
) {
    val interaction = remember { MutableInteractionSource() }
    val active = enabled && !loading
    val shape = when (size) {
        ButtonSize.Sm -> CircleShape
        ButtonSize.Md -> RoundedCornerShape(16.dp)
        ButtonSize.Lg -> RoundedCornerShape(20.dp)
    }
    val height = when (size) {
        ButtonSize.Sm -> 36.dp
        ButtonSize.Md -> 48.dp
        ButtonSize.Lg -> 56.dp
    }
    val padding = when (size) {
        ButtonSize.Sm -> 14.dp
        ButtonSize.Md -> 20.dp
        ButtonSize.Lg -> 24.dp
    }
    val textSize = when (size) {
        ButtonSize.Sm -> 13
        ButtonSize.Md -> 15
        ButtonSize.Lg -> 16
    }
    val gap = when (size) {
        ButtonSize.Sm -> 6.dp
        ButtonSize.Md -> 8.dp
        ButtonSize.Lg -> 10.dp
    }

    val background = when {
        !active -> if (variant == ButtonVariant.Ghost || variant == ButtonVariant.Outline) Color.Transparent else Paper3
        variant == ButtonVariant.Primary -> Brand500
        variant == ButtonVariant.Dark -> Espresso
        variant == ButtonVariant.Soft -> Brand100
        variant == ButtonVariant.Outline -> Color.White
        variant == ButtonVariant.Ghost -> Color.Transparent
        variant == ButtonVariant.Danger -> Danger500
        variant == ButtonVariant.DangerSoft -> Danger100
        else -> Color.Transparent
    }
    val contentColor = when {
        !active -> Muted
        variant == ButtonVariant.Primary || variant == ButtonVariant.Dark || variant == ButtonVariant.Danger -> Color.White
        variant == ButtonVariant.Soft -> Brand700
        variant == ButtonVariant.Outline -> Ink
        variant == ButtonVariant.Ghost -> Ink2
        variant == ButtonVariant.DangerSoft -> Danger500
        else -> Ink
    }
    val borderColor = when {
        variant == ButtonVariant.Outline -> Line
        else -> Color.Transparent
    }

    var base = modifier
        .then(if (full) Modifier.fillMaxWidth() else Modifier)
        .height(height)
        .then(if (variant == ButtonVariant.Primary && active) Modifier.brandShadow(shape) else Modifier)
        .clip(shape)
        .background(background)
        .then(if (variant == ButtonVariant.Outline) Modifier.border(1.dp, borderColor, shape) else Modifier)
        .pressScale(interaction)
        .clickable(
            interactionSource = interaction,
            indication = LocalIndication.current,
            enabled = active,
            onClick = onClick,
        )
    if (full) base = base.fillMaxWidth()

    Row(
        modifier = base.padding(horizontal = padding),
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (loading) {
            Spinner(tint = contentColor, modifier = Modifier.size(20.dp))
            Spacer(Modifier.width(gap))
        } else if (leading != null) {
            CompositionLocalProvider(LocalContentColor provides contentColor) { leading() }
            Spacer(Modifier.width(gap))
        }
        Text(
            text = text,
            style = sansStyle(textSize, 600, 1.2f, color = contentColor),
        )
        if (trailing != null) {
            Spacer(Modifier.width(gap))
            CompositionLocalProvider(LocalContentColor provides contentColor) { trailing() }
        }
    }
}

@Composable
fun Spinner(tint: Color, modifier: Modifier = Modifier, strokeWidth: Float = 2f) {
    val transition = rememberInfiniteTransition(label = "spin")
    val angle by transition.animateFloat(
        initialValue = 0f,
        targetValue = 360f,
        animationSpec = infiniteRepeatable(tween(900, easing = androidx.compose.animation.core.LinearEasing)),
        label = "angle",
    )
    LucideIcon(
        paths = KarsaIcons.LoaderCircle,
        modifier = modifier.graphicsLayer { rotationZ = angle },
        tint = tint,
        strokeWidth = strokeWidth,
    )
}

enum class IconButtonVariant { Plain, Ghost, Dark }

@Composable
fun KarsaIconButton(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    variant: IconButtonVariant = IconButtonVariant.Plain,
    contentDescription: String? = null,
    content: @Composable () -> Unit,
) {
    val interaction = remember { MutableInteractionSource() }
    val background = when (variant) {
        IconButtonVariant.Plain -> Color.White
        IconButtonVariant.Ghost -> Color.Transparent
        IconButtonVariant.Dark -> Espresso
    }
    val tint = when (variant) {
        IconButtonVariant.Dark -> Color.White
        else -> Ink
    }
    Box(
        modifier = modifier
            .size(40.dp)
            .clip(CircleShape)
            .background(background)
            .then(if (variant == IconButtonVariant.Plain) Modifier.border(1.dp, Line, CircleShape) else Modifier)
            .pressScale(interaction, 0.95f)
            .clickable(
                interactionSource = interaction,
                indication = LocalIndication.current,
                onClick = onClick,
            ),
        contentAlignment = Alignment.Center,
    ) {
        CompositionLocalProvider(LocalContentColor provides tint) { content() }
    }
}

/* ───────────── Avatar ───────────── */

enum class Tone { Brand, Butter, Leaf, Tide, Plum, Clay }

private val toneKeys = Tone.entries

fun toneFor(seed: String): Tone {
    var h = 0u
    seed.forEach { ch -> h = h * 31u + ch.code.toUInt() }
    return toneKeys[(h % toneKeys.size.toUInt()).toInt()]
}

fun toneBackground(tone: Tone): Color = when (tone) {
    Tone.Brand -> Brand100
    Tone.Butter -> Butter100
    Tone.Leaf -> Leaf100
    Tone.Tide -> Tide100
    Tone.Plum -> Plum100
    Tone.Clay -> Paper3
}

fun toneForeground(tone: Tone): Color = when (tone) {
    Tone.Brand -> Brand700
    Tone.Butter -> Butter700
    Tone.Leaf -> Leaf600
    Tone.Tide -> Tide600
    Tone.Plum -> Plum600
    Tone.Clay -> Ink2
}

fun initials(name: String): String = name
    .split(Regex("\\s+"))
    .filter { it.isNotEmpty() }
    .take(2)
    .map { it.first().uppercaseChar() }
    .joinToString("")

@Composable
fun Avatar(
    name: String,
    modifier: Modifier = Modifier,
    size: Dp = 40.dp,
    tone: Tone? = null,
    square: Boolean = false,
    border: Dp? = null,
    borderColor: Color = Espresso,
) {
    val resolved = tone ?: toneFor(name)
    val shape = if (square) RoundedCornerShape(14.dp) else CircleShape
    Box(
        modifier = modifier
            .size(size)
            .then(if (border != null) Modifier.border(border, borderColor, shape) else Modifier)
            .clip(shape)
            .background(toneBackground(resolved)),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = initials(name),
            style = displayStyle(
                size = maxOf(11f, size.value * 0.36f).toInt(),
                weight = 700,
                color = toneForeground(resolved),
            ),
        )
    }
}

/* ───────────── Badge ───────────── */

enum class BadgeTone { Brand, Solid, Dark, Leaf, Butter, Danger, Neutral, Plum, Tide }

@Composable
fun Badge(
    text: String,
    modifier: Modifier = Modifier,
    tone: BadgeTone = BadgeTone.Brand,
    icon: (@Composable () -> Unit)? = null,
) {
    val background = when (tone) {
        BadgeTone.Brand -> Brand100
        BadgeTone.Solid -> Brand500
        BadgeTone.Dark -> Espresso
        BadgeTone.Leaf -> Leaf100
        BadgeTone.Butter -> Butter100
        BadgeTone.Danger -> Danger100
        BadgeTone.Neutral -> Paper2
        BadgeTone.Plum -> Plum100
        BadgeTone.Tide -> Tide100
    }
    val foreground = when (tone) {
        BadgeTone.Brand -> Brand700
        BadgeTone.Solid -> Color.White
        BadgeTone.Dark -> Color.White
        BadgeTone.Leaf -> Leaf600
        BadgeTone.Butter -> Butter700
        BadgeTone.Danger -> Danger500
        BadgeTone.Neutral -> Ink2
        BadgeTone.Plum -> Plum600
        BadgeTone.Tide -> Tide600
    }
    Row(
        modifier = modifier
            .clip(CircleShape)
            .background(background)
            .padding(horizontal = 10.dp, vertical = 4.dp),
        horizontalArrangement = Arrangement.spacedBy(4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (icon != null) {
            CompositionLocalProvider(LocalContentColor provides foreground) { icon() }
        }
        Text(text, style = sansStyle(11, 700, 1.2f, 0.025f, foreground))
    }
}

@Composable
fun PointBadge(points: Int, modifier: Modifier = Modifier, large: Boolean = false) {
    val background = when {
        points >= 4 -> Brand500
        points == 3 -> Brand100
        points == 2 -> Butter100
        else -> Paper2
    }
    val foreground = when {
        points >= 4 -> Color.White
        points == 3 -> Brand700
        points == 2 -> Butter700
        else -> Ink2
    }
    Box(
        modifier = modifier
            .size(if (large) 56.dp else 44.dp)
            .clip(RoundedCornerShape(if (large) 18.dp else 14.dp))
            .background(background),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = "+$points",
            style = displayStyle(if (large) 24 else 18, 800, 1f, color = foreground),
        )
    }
}

/* ───────────── Card / Chip / Segmented ───────────── */

@Composable
fun KarsaCard(
    modifier: Modifier = Modifier,
    shape: Shape = RoundedCornerShape(28.dp),
    content: @Composable () -> Unit,
) {
    Column(
        modifier = modifier
            .cardShadow(shape)
            .clip(shape)
            .background(Color.White)
            .border(1.dp, Ink.copy(alpha = 0.05f), shape),
    ) {
        content()
    }
}

@Composable
fun Chip(
    text: String,
    modifier: Modifier = Modifier,
    selected: Boolean = false,
    icon: (@Composable () -> Unit)? = null,
    onClick: (() -> Unit)? = null,
) {
    val interaction = remember { MutableInteractionSource() }
    Row(
        modifier = modifier
            .height(36.dp)
            .clip(CircleShape)
            .background(if (selected) Espresso else Color.White)
            .then(if (selected) Modifier else Modifier.border(1.dp, Line, CircleShape))
            .pressScale(interaction, 0.95f)
            .then(
                if (onClick != null) {
                    Modifier.clickable(
                        interactionSource = interaction,
                        indication = LocalIndication.current,
                        onClick = onClick,
                    )
                } else Modifier,
            )
            .padding(horizontal = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (icon != null) {
            CompositionLocalProvider(LocalContentColor provides if (selected) Color.White else Ink2) { icon() }
        }
        Text(
            text = text,
            style = sansStyle(13, 600, 1.2f, color = if (selected) Color.White else Ink2),
            maxLines = 1,
        )
    }
}

class SegmentedOption<T>(val value: T, val label: String, val icon: (@Composable () -> Unit)? = null)

@Composable
fun <T> Segmented(
    options: List<SegmentedOption<T>>,
    value: T,
    onChange: (T) -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier
            .clip(CircleShape)
            .background(Paper3.copy(alpha = 0.7f))
            .padding(4.dp),
        horizontalArrangement = Arrangement.spacedBy(0.dp),
    ) {
        options.forEach { option ->
            val selected = option.value == value
            val interaction = remember { MutableInteractionSource() }
            Row(
                modifier = Modifier
                    .weight(1f)
                    .height(36.dp)
                    .clip(CircleShape)
                    .then(if (selected) Modifier.shadow(2.dp, CircleShape) else Modifier)
                    .background(if (selected) Color.White else Color.Transparent)
                    .clickable(
                        interactionSource = interaction,
                        indication = LocalIndication.current,
                    ) { onChange(option.value) }
                    .padding(horizontal = 12.dp),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                if (option.icon != null) {
                    CompositionLocalProvider(LocalContentColor provides if (selected) Ink else Ink2) { option.icon() }
                    Spacer(Modifier.width(6.dp))
                }
                Text(
                    text = option.label,
                    style = sansStyle(13, 600, 1.2f, color = if (selected) Ink else Ink2),
                    maxLines = 1,
                )
            }
        }
    }
}

/* ───────────── Inputs ───────────── */

@Composable
fun Field(
    label: String? = null,
    hint: String? = null,
    right: (@Composable () -> Unit)? = null,
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    Column(modifier) {
        if (label != null || right != null) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(label.orEmpty(), style = sansStyle(13, 600, 1.2f, color = Ink2))
                right?.invoke()
            }
        }
        content()
        if (hint != null) {
            Text(
                text = hint,
                modifier = Modifier.padding(top = 6.dp),
                style = sansStyle(12, 400, 1.4f, color = Muted),
            )
        }
    }
}

@Composable
fun KarsaTextField(
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    placeholder: String? = null,
    singleLine: Boolean = true,
    minHeight: Dp = 52.dp,
    autoFocus: Boolean = false,
    visualTransformation: VisualTransformation = VisualTransformation.None,
    keyboardOptions: KeyboardOptions = KeyboardOptions.Default,
    textStyle: TextStyle = sansStyle(15, 400, 1.5f, color = Ink),
    trailing: (@Composable () -> Unit)? = null,
) {
    val interaction = remember { MutableInteractionSource() }
    val focused by interaction.collectIsFocusedAsState()
    val background by animateColorAsState(if (focused) Color.White else Paper2, label = "fieldBg")
    val ring by animateColorAsState(if (focused) Brand400 else Color.Transparent, label = "fieldRing")
    val focusRequester = remember { FocusRequester() }

    BasicTextField(
        value = value,
        onValueChange = onValueChange,
        modifier = modifier
            .fillMaxWidth()
            .heightIn(min = minHeight)
            .clip(RoundedCornerShape(16.dp))
            .background(background)
            .border(2.dp, ring, RoundedCornerShape(16.dp))
            .then(if (autoFocus) Modifier.focusRequester(focusRequester) else Modifier),
        textStyle = textStyle,
        singleLine = singleLine,
        cursorBrush = androidx.compose.ui.graphics.SolidColor(Brand500),
        visualTransformation = visualTransformation,
        keyboardOptions = keyboardOptions,
        interactionSource = interaction,
        decorationBox = { inner ->
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(min = minHeight)
                    .padding(horizontal = 16.dp),
                verticalAlignment = if (singleLine) Alignment.CenterVertically else Alignment.Top,
            ) {
                Box(Modifier.weight(1f).padding(vertical = if (singleLine) 0.dp else 14.dp)) {
                    if (value.isEmpty() && placeholder != null) {
                        Text(placeholder, style = textStyle.copy(color = Muted.copy(alpha = 0.8f)))
                    }
                    inner()
                }
                trailing?.invoke()
            }
        },
    )
    if (autoFocus) {
        androidx.compose.runtime.LaunchedEffect(Unit) { focusRequester.requestFocus() }
    }
}

@Composable
fun SearchField(
    value: String,
    onChange: (String) -> Unit,
    placeholder: String,
    modifier: Modifier = Modifier,
    autoFocus: Boolean = false,
) {
    Box(modifier.fillMaxWidth()) {
        BasicTextField(
            value = value,
            onValueChange = onChange,
            modifier = Modifier
                .fillMaxWidth()
                .height(52.dp)
                .clip(RoundedCornerShape(16.dp))
                .background(Color.White)
                .border(1.dp, Line, RoundedCornerShape(16.dp)),
            textStyle = sansStyle(15, 400, 1.5f, color = Ink),
            singleLine = true,
            cursorBrush = androidx.compose.ui.graphics.SolidColor(Brand500),
            decorationBox = { inner ->
                Row(
                    modifier = Modifier.fillMaxWidth().padding(start = 16.dp, end = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    LucideIcon(KarsaIcons.Search, modifier = Modifier.size(18.dp), tint = Muted)
                    Spacer(Modifier.width(10.dp))
                    Box(Modifier.weight(1f)) {
                        if (value.isEmpty()) Text(placeholder, style = sansStyle(15, 400, 1.5f, color = Muted.copy(alpha = 0.8f)))
                        inner()
                    }
                    if (value.isNotEmpty()) {
                        Box(
                            modifier = Modifier
                                .size(28.dp)
                                .clip(CircleShape)
                                .background(Paper2)
                                .clickable { onChange("") },
                            contentAlignment = Alignment.Center,
                        ) {
                            LucideIcon(KarsaIcons.X, modifier = Modifier.size(16.dp), tint = Ink2)
                        }
                    }
                }
            },
        )
    }
}

/* ───────────── Loading / Empty / Error ───────────── */

@Composable
fun Skeleton(modifier: Modifier = Modifier, shape: Shape = RoundedCornerShape(12.dp)) {
    val transition = rememberInfiniteTransition(label = "shimmer")
    val alpha by transition.animateFloat(
        initialValue = 0.55f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(tween(700), RepeatMode.Reverse),
        label = "shimmerAlpha",
    )
    Box(modifier.clip(shape).background(Paper3.copy(alpha = 0.8f * alpha)))
}

@Composable
fun CardSkeleton(lines: Int = 3, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(28.dp))
            .background(Color.White)
            .border(1.dp, Ink.copy(alpha = 0.05f), RoundedCornerShape(28.dp))
            .padding(20.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Skeleton(Modifier.size(40.dp), CircleShape)
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Skeleton(Modifier.fillMaxWidth(0.5f).height(14.dp))
                Skeleton(Modifier.fillMaxWidth(0.33f).height(12.dp))
            }
        }
        Spacer(Modifier.height(20.dp))
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Skeleton(Modifier.fillMaxWidth(0.8f).height(20.dp))
            repeat(lines) { index ->
                Skeleton(
                    Modifier
                        .fillMaxWidth(if (index == lines - 1) 0.66f else 1f)
                        .height(14.dp),
                )
            }
        }
    }
}

@Composable
fun ListSkeleton(count: Int = 3, lines: Int = 3) {
    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        repeat(count) { CardSkeleton(lines = lines) }
    }
}

@Composable
fun KawungPattern(
    modifier: Modifier = Modifier,
    color: Color = Color.White,
    alpha: Float = 0.2f,
    fade: Boolean = false,
) {
    Canvas(modifier) {
        val tile = 44.dp.toPx()
        val half = tile / 2f
        val stroke = Stroke(width = 1.2.dp.toPx())
        val columns = (size.width / tile).toInt() + 2
        val rows = (size.height / tile).toInt() + 2
        val focus = Offset(size.width / 2f, size.height * 0.45f)
        val maxDistance = Offset(size.width, size.height).minus(focus).getDistance()
        for (row in 0 until rows) {
            for (column in 0 until columns) {
                val cx = column * tile + half
                val cy = row * tile + half
                val factor = if (fade) {
                    (1f - (Offset(cx, cy).minus(focus).getDistance() / maxDistance) * 1.3f).coerceIn(0f, 1f)
                } else 1f
                if (factor <= 0.01f) continue
                val ink = color.copy(alpha = alpha * factor)
                drawOval(ink, Offset(cx - 6.dp.toPx(), cy - 11.dp.toPx()), Size(12.dp.toPx(), 22.dp.toPx()), style = stroke)
                drawOval(ink, Offset(cx - 6.dp.toPx(), cy), Size(12.dp.toPx(), 22.dp.toPx()), style = stroke)
                drawOval(ink, Offset(cx - 11.dp.toPx(), cy - 6.dp.toPx()), Size(22.dp.toPx(), 12.dp.toPx()), style = stroke)
                drawOval(ink, Offset(cx, cy - 6.dp.toPx()), Size(22.dp.toPx(), 12.dp.toPx()), style = stroke)
                drawCircle(color.copy(alpha = alpha * 1.4f * factor), radius = 1.8.dp.toPx(), center = Offset(cx, cy))
            }
        }
    }
}

@Composable
fun EmptyState(
    title: String,
    modifier: Modifier = Modifier,
    desc: String? = null,
    icon: (@Composable () -> Unit)? = null,
    action: (@Composable () -> Unit)? = null,
) {
    Rise {
        Column(
            modifier = modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp, vertical = 48.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Box(
                modifier = Modifier
                    .size(80.dp)
                    .clip(RoundedCornerShape(28.dp))
                    .background(Brand100),
                contentAlignment = Alignment.Center,
            ) {
                KawungPattern(Modifier.matchParentSize(), color = Ink, alpha = 0.07f)
                CompositionLocalProvider(LocalContentColor provides Brand600) {
                    icon?.invoke() ?: LucideIcon(KarsaIcons.Inbox, modifier = Modifier.size(36.dp), tint = Brand600)
                }
            }
            Spacer(Modifier.height(20.dp))
            Text(title, style = displayStyle(20, 700))
            if (desc != null) {
                Spacer(Modifier.height(6.dp))
                Text(
                    text = desc,
                    modifier = Modifier.width(260.dp),
                    style = sansStyle(14, 400, 1.625f, color = Muted),
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                )
            }
            if (action != null) {
                Spacer(Modifier.height(20.dp))
                action()
            }
        }
    }
}

@Composable
fun ErrorState(
    onRetry: (() -> Unit)? = null,
    title: String = "Gagal memuat data",
    desc: String = "Sepertinya koneksimu terputus. Periksa jaringan lalu coba lagi.",
) {
    Rise {
        Column(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp, vertical = 48.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Box(
                modifier = Modifier
                    .size(80.dp)
                    .clip(RoundedCornerShape(28.dp))
                    .background(Danger100),
                contentAlignment = Alignment.Center,
            ) {
                LucideIcon(KarsaIcons.TriangleAlert, modifier = Modifier.size(36.dp), tint = Danger500)
            }
            Spacer(Modifier.height(20.dp))
            Text(title, style = displayStyle(20, 700))
            Spacer(Modifier.height(6.dp))
            Text(
                text = desc,
                modifier = Modifier.width(260.dp),
                style = sansStyle(14, 400, 1.625f, color = Muted),
                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
            )
            if (onRetry != null) {
                Spacer(Modifier.height(20.dp))
                KarsaButton(
                    text = "Coba lagi",
                    onClick = onRetry,
                    variant = ButtonVariant.Dark,
                    leading = { LucideIcon(KarsaIcons.RefreshCw, modifier = Modifier.size(16.dp), tint = Color.White) },
                )
            }
        }
    }
}

enum class LoadStatus { Loading, Error, Ready }

@Composable
fun Gate(status: LoadStatus, onRetry: () -> Unit, skeleton: (@Composable () -> Unit)? = null, content: @Composable () -> Unit) {
    when (status) {
        LoadStatus.Loading -> skeleton?.invoke() ?: ListSkeleton()
        LoadStatus.Error -> ErrorState(onRetry = onRetry)
        LoadStatus.Ready -> content()
    }
}

/* ───────────── Layout helpers ───────────── */

@Composable
fun PageHeader(
    title: String,
    modifier: Modifier = Modifier,
    eyebrow: (@Composable () -> Unit)? = null,
    subtitle: String? = null,
    right: (@Composable () -> Unit)? = null,
) {
    Row(
        modifier = modifier.fillMaxWidth().padding(start = 20.dp, end = 20.dp, top = 20.dp, bottom = 16.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.Top,
    ) {
        Column(Modifier.weight(1f)) {
            if (eyebrow != null) {
                Row(
                    modifier = Modifier.padding(bottom = 8.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) { eyebrow() }
            }
            Text(title, style = displayStyle(34, 800, 1.02f, -0.02f))
            if (subtitle != null) {
                Spacer(Modifier.height(6.dp))
                Text(subtitle, style = sansStyle(14, 400, 1.5f, color = Muted))
            }
        }
        if (right != null) {
            Row(Modifier.padding(start = 12.dp, top = 4.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) { right() }
        }
    }
}

@Composable
fun TopBar(
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
    title: String? = null,
    subtitle: String? = null,
    leading: (@Composable () -> Unit)? = null,
    right: (@Composable () -> Unit)? = null,
    background: Color = Color.Transparent,
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .height(64.dp)
            .background(background)
            .padding(horizontal = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        KarsaIconButton(onClick = onBack, contentDescription = "Kembali") {
            LucideIcon(KarsaIcons.ArrowLeft, modifier = Modifier.size(20.dp), tint = Ink)
        }
        leading?.invoke()
        Column(Modifier.weight(1f)) {
            if (title != null) Text(title, style = displayStyle(20, 700, 1.25f), maxLines = 1)
            if (subtitle != null) Text(subtitle, style = sansStyle(12, 400, 1.4f, color = Muted), maxLines = 1)
        }
        right?.invoke()
    }
}

@Composable
fun SectionTitle(text: String, modifier: Modifier = Modifier, right: (@Composable () -> Unit)? = null) {
    Row(
        modifier = modifier.fillMaxWidth().padding(horizontal = 4.dp, vertical = 0.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(text, style = displayStyle(18, 700))
        right?.invoke()
    }
}

@Composable
fun EyebrowText(text: String, modifier: Modifier = Modifier) {
    Text(text, modifier = modifier, style = sansStyle(11, 700, 1.4f, 0.16f, Brand700))
}

/* Rise entrance: opacity 0→1 and translateY 14→0. */
@Composable
fun Rise(modifier: Modifier = Modifier, delayMillis: Int = 0, content: @Composable () -> Unit) {
    val anim = remember { androidx.compose.animation.core.Animatable(0f) }
    androidx.compose.runtime.LaunchedEffect(Unit) {
        if (delayMillis > 0) kotlinx.coroutines.delay(delayMillis.toLong())
        anim.animateTo(
            targetValue = 1f,
            animationSpec = tween(
                durationMillis = 450,
                easing = androidx.compose.animation.core.CubicBezierEasing(0.2f, 0.9f, 0.2f, 1f),
            ),
        )
    }
    Box(
        modifier = modifier.graphicsLayer {
            alpha = anim.value
            translationY = 14.dp.toPx() * (1f - anim.value)
        },
    ) { content() }
}

@Composable
fun TermsText() {
    Text(
        text = buildAnnotatedString {
            append("Dengan masuk, kamu menyetujui ")
            withStyle(SpanStyle(fontWeight = FontWeight.W600, color = Ink2)) { append("Syarat Penggunaan") }
            append(" dan ")
            withStyle(SpanStyle(fontWeight = FontWeight.W600, color = Ink2)) { append("Kebijakan Privasi") }
            append(".")
        },
        style = sansStyle(12, 400, 1.5f, color = Muted),
        textAlign = androidx.compose.ui.text.style.TextAlign.Center,
    )
}
