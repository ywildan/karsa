package ac.id.untidar.karsa.screens

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.LinearOutSlowInEasing
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.StartOffset
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.TransformOrigin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.zIndex
import kotlinx.coroutines.delay
import ac.id.untidar.karsa.LocalApp
import ac.id.untidar.karsa.icons.KarsaIcons
import ac.id.untidar.karsa.icons.LucideIcon
import ac.id.untidar.karsa.theme.Brand100
import ac.id.untidar.karsa.theme.Brand400
import ac.id.untidar.karsa.theme.Brand500
import ac.id.untidar.karsa.theme.Brand600
import ac.id.untidar.karsa.theme.Brand700
import ac.id.untidar.karsa.theme.Butter100
import ac.id.untidar.karsa.theme.Butter400
import ac.id.untidar.karsa.theme.Butter700
import ac.id.untidar.karsa.theme.Espresso
import ac.id.untidar.karsa.theme.Ink
import ac.id.untidar.karsa.theme.Leaf100
import ac.id.untidar.karsa.theme.Leaf500
import ac.id.untidar.karsa.theme.Line
import ac.id.untidar.karsa.theme.Muted
import ac.id.untidar.karsa.theme.Paper
import ac.id.untidar.karsa.theme.Paper2
import ac.id.untidar.karsa.theme.Paper3
import ac.id.untidar.karsa.theme.Plum100
import ac.id.untidar.karsa.theme.Plum600
import ac.id.untidar.karsa.theme.displayStyle
import ac.id.untidar.karsa.theme.sansStyle
import ac.id.untidar.karsa.ui.cardShadow

private data class SplashSlide(
    val title: String,
    val desc: String,
    val card: @Composable (Modifier) -> Unit,
)

@Composable
fun SplashScreen() {
    val state = LocalApp.current
    val progress = rememberSplashProgress(onDone = { state.finishSplash() })
    val slides = remember {
        listOf(
            SplashSlide("Input poin", "Catat kontribusi mahasiswa") { InputPoinCard(it) },
            SplashSlide("Partisipasi teratas", "Podium & peringkat kelas") { PodiumCard(it) },
            SplashSlide("Grup kelas", "Percakapan kelas tetap dekat") { GrupCard(it) },
            SplashSlide("Karsa Lib", "Ilmu tumbuh saat dibagikan") { KarsaLibCard(it) },
            SplashSlide("Unduh & sinkron", "Materi siap dibaca offline") { SyncCard(it) },
        )
    }
    var active by remember { mutableIntStateOf(0) }
    LaunchedEffect(slides.size) {
        while (true) {
            delay(1700)
            active = (active + 1) % slides.size
        }
    }

    Box(
        Modifier
            .fillMaxSize()
            .background(Brush.verticalGradient(listOf(Brand400, Brand500, Brand600))),
    ) {
        Canvas(Modifier.matchParentSize()) {
            drawCircle(
                color = Color.White.copy(alpha = 0.10f),
                radius = 88.dp.toPx(),
                center = Offset(size.width - 44.dp.toPx(), 44.dp.toPx()),
                style = Stroke(width = 18.dp.toPx()),
            )
            drawCircle(
                color = Color.White.copy(alpha = 0.09f),
                radius = 80.dp.toPx(),
                center = Offset(24.dp.toPx(), 176.dp.toPx()),
                style = Stroke(width = 14.dp.toPx()),
            )
        }

        Column(
            modifier = Modifier
                .align(Alignment.TopCenter)
                .fillMaxWidth()
                .fillMaxHeight(0.38f)
                .statusBarsPadding()
                .padding(top = 12.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            PulseLogo(66.dp, ringColor = Color.White, bg = Color.White, mark = Brand500)
            Spacer(Modifier.height(16.dp))
            Text("SiKarsa", style = displayStyle(34, 800, 1f, -0.02f, Color.White))
            Spacer(Modifier.height(4.dp))
            Text(
                "Poin keaktifan, materi, dan diskusi kelas.",
                style = sansStyle(12, 400, 1.4f, color = Color.White.copy(alpha = 0.75f)),
            )
        }

        Column(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .fillMaxHeight(0.62f)
                .clip(RoundedCornerShape(topStart = 32.dp, topEnd = 32.dp))
                .background(Paper)
                .navigationBarsPadding()
                .padding(horizontal = 24.dp, vertical = 20.dp),
        ) {
            Spacer(Modifier.weight(0.25f))

            Box(Modifier.fillMaxWidth().height(234.dp).padding(top = 6.dp)) {
                slides.forEachIndexed { index, slide ->
                    val rel = (index - active + slides.size) % slides.size
                    val scale by animateFloatAsState(1.6f - rel * 0.09f, tween(500), label = "slideScale")
                    val dy by animateDpAsState((rel * 16).dp, tween(500), label = "slideDy")
                    val alpha by animateFloatAsState(if (rel < 3) 1f - rel * 0.28f else 0f, tween(500), label = "slideAlpha")
                    slide.card(
                        Modifier
                            .align(Alignment.TopCenter)
                            .width(150.dp)
                            .height(130.dp)
                            .zIndex((10 - rel).toFloat())
                            .graphicsLayer {
                                transformOrigin = TransformOrigin(0.5f, 0f)
                                scaleX = scale
                                scaleY = scale
                                translationY = dy.toPx()
                                this.alpha = alpha
                            },
                    )
                }
            }

            AnimatedContent(
                targetState = active,
                transitionSpec = { fadeIn(tween(220)) togetherWith fadeOut(tween(160)) },
                label = "slideCaption",
            ) { index ->
                Column(
                    Modifier.fillMaxWidth(),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Text(slides[index].title, style = displayStyle(14, 800, 1.2f))
                    Text(slides[index].desc, style = sansStyle(10, 400, 1.4f, color = Muted))
                }
            }

            Row(
                Modifier.fillMaxWidth().padding(top = 8.dp),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                slides.indices.forEach { index ->
                    val selected = index == active
                    val dotWidth by animateDpAsState(if (selected) 16.dp else 4.dp, tween(250), label = "dotWidth")
                    Box(
                        Modifier
                            .padding(horizontal = 2.dp)
                            .width(dotWidth)
                            .height(4.dp)
                            .clip(CircleShape)
                            .background(if (selected) Brand500 else Ink.copy(alpha = 0.18f)),
                    )
                }
            }

            Spacer(Modifier.weight(1f))
            ShimmerProgress(progress)
        }
    }
}

@Composable
private fun rememberSplashProgress(durationMs: Int = 4200, onDone: () -> Unit): Float {
    val done by rememberUpdatedState(onDone)
    val progress = remember { Animatable(0f) }
    LaunchedEffect(Unit) {
        progress.animateTo(
            targetValue = 1f,
            animationSpec = tween(durationMs, easing = CubicBezierEasing(0.4f, 0f, 0.2f, 1f)),
        )
        delay(450)
        done()
    }
    return progress.value
}

/** Logo bunga empat kelopak, digambar sebagai outline seperti referensi. */
@Composable
private fun BloomLogo(logoSize: Dp, bg: Color, mark: Color) {
    Canvas(Modifier.size(logoSize).background(bg, CircleShape)) {
        val s = size.minDimension
        val stroke = Stroke(width = s * 0.04f, cap = StrokeCap.Round)
        repeat(4) { i ->
            rotate(degrees = i * 90f, pivot = center) {
                drawOval(
                    color = mark,
                    topLeft = Offset(s * 0.385f, s * 0.104f),
                    size = Size(s * 0.23f, s * 0.375f),
                    style = stroke,
                )
            }
        }
    }
}

@Composable
private fun PulseLogo(
    logoSize: Dp,
    ringColor: Color,
    bg: Color,
    mark: Color,
) {
    val enter = remember { Animatable(0f) }
    LaunchedEffect(Unit) {
        enter.animateTo(
            targetValue = 1f,
            animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy, stiffness = 180f),
        )
    }
    val pulse = rememberInfiniteTransition(label = "splashPulse")
    val ring1 by pulse.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(tween(2400, easing = LinearOutSlowInEasing)),
        label = "ring1",
    )
    val ring2 by pulse.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(2400, easing = LinearOutSlowInEasing),
            initialStartOffset = StartOffset(1200),
        ),
        label = "ring2",
    )

    Box(Modifier.size(logoSize), contentAlignment = Alignment.Center) {
        listOf(ring1, ring2).forEach { p ->
            Box(
                Modifier
                    .size(logoSize)
                    .graphicsLayer {
                        scaleX = 1f + p * 1.1f
                        scaleY = 1f + p * 1.1f
                        alpha = (1f - p) * 0.6f
                    }
                    .border(2.dp, ringColor, CircleShape),
            )
        }
        Box(
            Modifier.graphicsLayer {
                scaleX = enter.value
                scaleY = enter.value
                rotationZ = (1f - enter.value) * -120f
                alpha = enter.value.coerceIn(0f, 1f)
            },
        ) {
            BloomLogo(logoSize, bg, mark)
        }
    }
}

@Composable
private fun ShimmerProgress(progress: Float) {
    val shift by rememberInfiniteTransition(label = "splashShimmer").animateFloat(
        initialValue = -0.4f,
        targetValue = 1.4f,
        animationSpec = infiniteRepeatable(tween(1300, easing = LinearEasing)),
        label = "shimmer",
    )
    val label = when {
        progress < 0.35f -> "MENYIAPKAN RUANG KELASMU"
        progress < 0.70f -> "MENYINKRONKAN MATERI"
        progress < 1f -> "MEMUAT POIN KEAKTIFAN"
        else -> "SIAP DIGUNAKAN"
    }
    Column {
        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.Bottom,
        ) {
            Text(label, style = sansStyle(9, 600, 1.4f, 0.22f, Muted))
            Text("${(progress * 100).toInt()}%", style = displayStyle(14, 800, 1f, 0f, Ink))
        }
        Spacer(Modifier.height(6.dp))
        Box(Modifier.fillMaxWidth().height(6.dp).clip(CircleShape).background(Paper3)) {
            Box(
                Modifier
                    .fillMaxHeight()
                    .fillMaxWidth(progress.coerceIn(0f, 1f))
                    .clip(CircleShape)
                    .drawWithContent {
                        drawContent()
                        val w = size.width
                        drawRect(
                            brush = Brush.horizontalGradient(
                                colors = listOf(Color.Transparent, Color.White.copy(alpha = 0.85f), Color.Transparent),
                                startX = w * shift - 60f,
                                endX = w * shift + 60f,
                            ),
                        )
                    }
                    .background(Brand500),
            )
        }
    }
}

/* ───────────── Kartu fitur di carousel ───────────── */

@Composable
private fun SplashCard(modifier: Modifier = Modifier, content: @Composable ColumnScope.() -> Unit) {
    val shape = RoundedCornerShape(18.dp)
    Column(
        modifier
            .cardShadow(shape)
            .clip(shape)
            .background(Color.White)
            .border(1.dp, Ink.copy(alpha = 0.04f), shape)
            .padding(10.dp),
        content = content,
    )
}

@Composable
private fun InputPoinCard(modifier: Modifier = Modifier) = SplashCard(modifier) {
    Row(Modifier.fillMaxWidth(), Arrangement.SpaceBetween, Alignment.CenterVertically) {
        Text("Input poin", style = displayStyle(12, 800, 1.15f))
        Row(
            modifier = Modifier
                .background(Espresso, CircleShape)
                .padding(horizontal = 6.dp, vertical = 2.dp),
            horizontalArrangement = Arrangement.spacedBy(3.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            LucideIcon(KarsaIcons.ShieldCheck, Modifier.size(8.dp), tint = Color.White, strokeWidth = 2.4f)
            Text("PJ KELAS", style = sansStyle(7, 700, 1.2f, color = Color.White))
        }
    }
    Spacer(Modifier.height(6.dp))
    StepRow("Mata kuliah", "Bahasa Indonesia · K1")
    StepRow("Mahasiswa", "Rani Wulandari · NIM ••••1204")
    Spacer(Modifier.height(6.dp))
    Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
        (1..4).forEach { n ->
            val selected = n == 4
            Box(
                modifier = Modifier
                    .weight(1f)
                    .clip(RoundedCornerShape(10.dp))
                    .background(if (selected) Brand500 else Paper2)
                    .padding(vertical = 5.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    n.toString(),
                    style = displayStyle(11, 800, 1f, color = if (selected) Color.White else Ink),
                )
            }
        }
    }
}

@Composable
private fun StepRow(title: String, sub: String) {
    Row(Modifier.padding(vertical = 2.dp), verticalAlignment = Alignment.CenterVertically) {
        Box(
            Modifier.size(16.dp).background(Leaf500, CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            LucideIcon(KarsaIcons.Check, Modifier.size(9.dp), tint = Color.White, strokeWidth = 3f)
        }
        Spacer(Modifier.width(6.dp))
        Column {
            Text(title, style = sansStyle(9, 700, 1.2f))
            Text(sub, style = sansStyle(8, 400, 1.2f, color = Muted), maxLines = 1)
        }
    }
}

@Composable
private fun PodiumCard(modifier: Modifier = Modifier) = SplashCard(modifier) {
    Text("Partisipasi teratas", style = displayStyle(10, 800, 1.1f))
    Spacer(Modifier.height(4.dp))
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.Bottom) {
        PodiumColumn("DA", "Dimas", 34.dp, Espresso, Color.White, Plum100, Plum600, "2", Modifier.weight(1f))
        PodiumColumn("RW", "Rani", 46.dp, Brand500, Color.White, Butter100, Butter700, "1", Modifier.weight(1f), crown = true)
        PodiumColumn("KM", "Kamu", 22.dp, Butter100, Butter700, Leaf100, Leaf500, "3", Modifier.weight(1f), ring = true)
    }
}

@Composable
private fun PodiumColumn(
    initials: String,
    name: String,
    barHeight: Dp,
    barColor: Color,
    barText: Color,
    avatarBg: Color,
    avatarText: Color,
    rank: String,
    modifier: Modifier,
    crown: Boolean = false,
    ring: Boolean = false,
) {
    Column(modifier, horizontalAlignment = Alignment.CenterHorizontally) {
        Box(Modifier.height(11.dp), contentAlignment = Alignment.Center) {
            if (crown) {
                LucideIcon(KarsaIcons.Crown, Modifier.size(10.dp), tint = Butter400, strokeWidth = 2.2f)
            }
        }
        Box(
            Modifier
                .size(24.dp)
                .then(if (ring) Modifier.border(2.dp, Brand500, CircleShape) else Modifier)
                .background(avatarBg, CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            Text(initials, style = sansStyle(8, 800, 1f, color = avatarText))
        }
        Text(name, style = sansStyle(7, 700, 1.2f), maxLines = 1)
        Box(
            Modifier
                .fillMaxWidth()
                .height(barHeight)
                .clip(RoundedCornerShape(topStart = 10.dp, topEnd = 10.dp))
                .background(barColor),
            contentAlignment = Alignment.Center,
        ) {
            Text(rank, style = displayStyle(14, 800, 1f, color = barText))
        }
    }
}

@Composable
private fun GrupCard(modifier: Modifier = Modifier) = SplashCard(modifier) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Box(
            Modifier.size(36.dp).background(Brand100, RoundedCornerShape(12.dp)),
            contentAlignment = Alignment.Center,
        ) {
            Text("BI", style = displayStyle(10, 800, 1f, color = Brand700))
        }
        Spacer(Modifier.width(8.dp))
        Column(Modifier.weight(1f)) {
            Text("Bahasa Indonesia", style = displayStyle(10, 800, 1.2f), maxLines = 1)
            Text("K1 · Kamu PJ · 3 anggota", style = sansStyle(8, 400, 1.3f, color = Muted), maxLines = 1)
            Text(
                "Dimas A.: tugasnya sudah dikumpul?",
                style = sansStyle(8, 400, 1.3f, color = Ink.copy(alpha = 0.8f)),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
    }
}

@Composable
private fun KarsaLibCard(modifier: Modifier = Modifier) = SplashCard(modifier) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Box(
            Modifier.size(24.dp).background(Leaf100, CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            Text("SA", style = sansStyle(7, 800, 1f, color = Leaf500))
        }
        Spacer(Modifier.width(6.dp))
        Column(Modifier.weight(1f)) {
            Text("Salsa Anindya", style = sansStyle(9, 800, 1.2f), maxLines = 1)
            Text("Akuntansi · 8 Okt", style = sansStyle(7, 400, 1.2f, color = Muted), maxLines = 1)
        }
    }
    Spacer(Modifier.height(6.dp))
    Text(
        "Akun Aset, Liabilitas, dan Modal",
        style = displayStyle(10, 800, 1.15f),
        maxLines = 2,
        overflow = TextOverflow.Ellipsis,
    )
    Text(
        "Akun riil pada posisi keuangan terdiri dari tiga kelompok utama…",
        style = sansStyle(8, 400, 1.3f, color = Muted),
        maxLines = 2,
        overflow = TextOverflow.Ellipsis,
    )
    HorizontalDivider(Modifier.padding(vertical = 6.dp), color = Paper2)
    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            LucideIcon(KarsaIcons.Eye, Modifier.size(9.dp), tint = Muted, strokeWidth = 2f)
            Spacer(Modifier.width(2.dp))
            Text("12 pembaca", style = sansStyle(8, 400, 1.2f, color = Muted))
        }
        Row(verticalAlignment = Alignment.CenterVertically) {
            LucideIcon(KarsaIcons.MessageCircle, Modifier.size(9.dp), tint = Muted, strokeWidth = 2f)
            Spacer(Modifier.width(2.dp))
            Text("3 komentar", style = sansStyle(8, 400, 1.2f, color = Muted))
        }
    }
}

@Composable
private fun SyncCard(modifier: Modifier = Modifier) = SplashCard(modifier) {
    Row(Modifier.fillMaxWidth(), Arrangement.SpaceBetween, Alignment.CenterVertically) {
        Text("Unduhan materi", style = displayStyle(10, 800, 1.1f))
        LucideIcon(KarsaIcons.RefreshCw, Modifier.size(10.dp), tint = Brand500, strokeWidth = 2f)
    }
    Spacer(Modifier.height(4.dp))
    SyncRow("Modul_Pajak_01.pdf", 1f)
    SyncRow("Slide_Minggu_4.pdf", 0.64f)
}

@Composable
private fun SyncRow(name: String, progress: Float) {
    Row(
        Modifier.fillMaxWidth().padding(top = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            Modifier.size(20.dp).background(Butter100, RoundedCornerShape(6.dp)),
            contentAlignment = Alignment.Center,
        ) {
            LucideIcon(KarsaIcons.FileText, Modifier.size(10.dp), tint = Butter700, strokeWidth = 2f)
        }
        Spacer(Modifier.width(6.dp))
        Column(Modifier.weight(1f)) {
            Text(name, style = sansStyle(8, 700, 1.2f), maxLines = 1, overflow = TextOverflow.Ellipsis)
            Spacer(Modifier.height(2.dp))
            Box(Modifier.fillMaxWidth().height(3.dp).clip(CircleShape).background(Paper2)) {
                Box(
                    Modifier
                        .fillMaxHeight()
                        .fillMaxWidth(progress)
                        .clip(CircleShape)
                        .background(Brand500),
                )
            }
        }
        Spacer(Modifier.width(6.dp))
        if (progress >= 1f) {
            LucideIcon(KarsaIcons.Check, Modifier.size(10.dp), tint = Leaf500, strokeWidth = 3f)
        } else {
            LucideIcon(KarsaIcons.LoaderCircle, Modifier.size(10.dp), tint = Muted, strokeWidth = 2f)
        }
    }
}
