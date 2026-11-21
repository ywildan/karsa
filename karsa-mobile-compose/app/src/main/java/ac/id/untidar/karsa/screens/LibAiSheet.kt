package ac.id.untidar.karsa.screens

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import ac.id.untidar.karsa.auth.KarsaAuth
import ac.id.untidar.karsa.icons.KarsaIcons
import ac.id.untidar.karsa.icons.LucideIcon
import ac.id.untidar.karsa.lib.AiController
import ac.id.untidar.karsa.lib.LibAiTurnDto
import ac.id.untidar.karsa.lib.LibAiWebSourceDto
import ac.id.untidar.karsa.theme.Brand100
import ac.id.untidar.karsa.theme.Brand50
import ac.id.untidar.karsa.theme.Brand500
import ac.id.untidar.karsa.theme.Brand600
import ac.id.untidar.karsa.theme.Brand700
import ac.id.untidar.karsa.theme.Danger100
import ac.id.untidar.karsa.theme.Danger500
import ac.id.untidar.karsa.theme.Espresso
import ac.id.untidar.karsa.theme.Ink
import ac.id.untidar.karsa.theme.Ink2
import ac.id.untidar.karsa.theme.Line
import ac.id.untidar.karsa.theme.Muted
import ac.id.untidar.karsa.theme.Paper2
import ac.id.untidar.karsa.theme.Paper3
import ac.id.untidar.karsa.theme.Tide100
import ac.id.untidar.karsa.theme.Tide600
import ac.id.untidar.karsa.theme.displayStyle
import ac.id.untidar.karsa.theme.sansStyle
import ac.id.untidar.karsa.ui.Badge
import ac.id.untidar.karsa.ui.BadgeTone
import ac.id.untidar.karsa.ui.ButtonSize
import ac.id.untidar.karsa.ui.ButtonVariant
import ac.id.untidar.karsa.ui.KarsaButton
import ac.id.untidar.karsa.ui.KarsaCard
import ac.id.untidar.karsa.ui.KarsaDialog
import ac.id.untidar.karsa.ui.KarsaSheet
import ac.id.untidar.karsa.ui.Segmented
import ac.id.untidar.karsa.ui.SegmentedOption
import ac.id.untidar.karsa.ui.Spinner
import ac.id.untidar.karsa.ui.inlineMarkdown
import java.util.Locale

private const val PLAN_URL = "https://karsa-landing.vercel.app/paket"

@Composable
fun LibAiSheet(
    open: Boolean,
    articleId: String,
    articleTitle: String,
    revision: String?,
    onClose: () -> Unit,
    onOpenParagraph: (Int) -> Unit,
    onArticleChanged: () -> Unit,
) {
    val rev = revision ?: return
    if (rev.isBlank()) return
    val context = LocalContext.current
    val auth = remember { KarsaAuth.get(context) }
    val ai = remember(articleId, rev) {
        AiController(auth.api, articleId, rev, onArticleChanged)
    }
    val scope = rememberCoroutineScope()
    val scroll = rememberScrollState()
    var tab by remember { mutableStateOf(1) }
    var text by remember { mutableStateOf("") }
    var webArmed by remember { mutableStateOf(false) }
    var webDialog by remember { mutableStateOf(false) }
    val focus = remember { FocusRequester() }

    LaunchedEffect(open) {
        if (open) {
            tab = 1
            webArmed = false
            ai.load()
        }
    }
    LaunchedEffect(ai.turns.size, ai.pendingQuestion, tab) {
        if (open && tab == 1) {
            delay(80)
            scroll.animateScrollTo(scroll.maxValue)
        }
    }

    val quota = ai.quota
    val tokenLeft = quota?.tokenRemaining ?: 0
    val webLeft = quota?.websearchRemaining ?: 0
    val freeTier = (quota?.websearchTier ?: "free") == "free"

    fun send() {
        val draft = text
        if (draft.trim().isEmpty() || ai.asking || tokenLeft == 0) return
        val useWeb = webArmed
        webArmed = false
        scope.launch {
            val success = ai.ask(draft, useWeb)
            if (success) {
                text = when {
                    text == draft -> ""
                    text.startsWith(draft) -> text.removePrefix(draft)
                    else -> text
                }
            }
        }
    }

    fun toggleWeb() {
        if (webLeft == 0) {
            webDialog = true
        } else {
            webArmed = !webArmed
        }
    }

    KarsaSheet(
        open = open,
        onClose = onClose,
        title = "Teman baca",
        contentScrollState = scroll,
        footerDivider = false,
        footer = {
            if (tab == 1 && ai.enabled) {
                AiComposer(
                    text = text,
                    onTextChange = { if (it.length <= 600) text = it },
                    quotaLeft = tokenLeft,
                    webArmed = webArmed,
                    asking = ai.asking,
                    focus = focus,
                    onToggleWeb = ::toggleWeb,
                    onSend = ::send,
                    onOpenPlan = { openUrl(context, PLAN_URL) },
                )
            } else {
                AiDisclaimer()
            }
        },
    ) {
        Text(
            articleTitle,
            style = sansStyle(12, 500, 1.4f, color = Muted),
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
        )
        Spacer(Modifier.height(12.dp))
        Segmented(
            options = listOf(
                SegmentedOption(0, "Ringkasan") {
                    LucideIcon(KarsaIcons.Sparkles, modifier = Modifier.size(16.dp), tint = Ink2)
                },
                SegmentedOption(1, "Tanya materi") {
                    LucideIcon(KarsaIcons.MessagesSquare, modifier = Modifier.size(16.dp), tint = Ink2)
                },
            ),
            value = tab,
            onChange = { tab = it },
        )
        Spacer(Modifier.height(16.dp))

        when {
            ai.loading && ai.turns.isEmpty() && ai.summary == null -> AiLoading()
            !ai.enabled && !ai.loading -> AiDisabled(error = ai.error, onRetry = { scope.launch { ai.load() } })
            else -> {
                if (ai.error != null) {
                    AiErrorNotice(ai.error!!) {
                        scope.launch { ai.load() }
                    }
                    Spacer(Modifier.height(12.dp))
                }
                if (tab == 0) {
                    AiSummaryTab(
                        ai = ai,
                        scope = scope,
                        onOpenParagraph = onOpenParagraph,
                        onAskAboutSummary = {
                            tab = 1
                            scope.launch {
                                delay(140)
                                runCatching { focus.requestFocus() }
                            }
                        },
                    )
                } else {
                    AiChatTab(
                        ai = ai,
                        scope = scope,
                        onOpenParagraph = onOpenParagraph,
                        onExample = {
                            text = it
                            runCatching { focus.requestFocus() }
                        },
                    )
                }
            }
        }
    }

    KarsaDialog(
        open = webDialog || ai.webQuotaDialog,
        onClose = {
            webDialog = false
            ai.dismissWebQuota()
        },
        title = "Kuota Web Search Habis",
        desc = if (freeTier) {
            "Jatah gratis bulan ini telah habis. Lihat paket untuk fitur extra web search."
        } else {
            "Jatah hari ini sudah habis, coba lagi besok."
        },
        confirmLabel = if (freeTier) "Lihat paket" else "Mengerti",
        cancelLabel = "Tutup",
        onConfirm = {
            webDialog = false
            ai.dismissWebQuota()
            if (freeTier) openUrl(context, PLAN_URL)
        },
    )
}

@Composable
private fun AiLoading() {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 24.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Spinner(tint = Brand600, modifier = Modifier.size(22.dp))
        Text("Menyiapkan Teman baca…", style = sansStyle(14, 500, 1.4f, color = Muted))
    }
}

@Composable
private fun AiDisabled(error: String?, onRetry: () -> Unit) {
    KarsaCard {
        Column(Modifier.padding(20.dp)) {
            Text("Teman baca masih dalam pengembangan", style = displayStyle(18, 700, 1.25f))
            Text(
                error ?: "Fitur ini belum tersedia untuk artikel ini. Coba lagi nanti.",
                modifier = Modifier.padding(top = 6.dp),
                style = sansStyle(13, 400, 1.55f, color = Muted),
            )
            Spacer(Modifier.height(16.dp))
            KarsaButton(
                text = "Coba lagi",
                onClick = onRetry,
                variant = ButtonVariant.Soft,
                size = ButtonSize.Sm,
            )
        }
    }
}

@Composable
private fun AiErrorNotice(message: String, onRetry: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(18.dp))
            .background(Danger100)
            .padding(horizontal = 14.dp, vertical = 12.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        LucideIcon(KarsaIcons.TriangleAlert, modifier = Modifier.size(18.dp), tint = Danger500)
        Text(
            message,
            modifier = Modifier.weight(1f),
            style = sansStyle(12, 500, 1.45f, color = Danger500),
        )
        Text(
            "Ulangi",
            modifier = Modifier
                .clip(CircleShape)
                .clickable(onClick = onRetry)
                .padding(horizontal = 10.dp, vertical = 6.dp),
            style = sansStyle(12, 700, 1.2f, color = Danger500),
        )
    }
}

@Composable
private fun AiSummaryTab(
    ai: AiController,
    scope: kotlinx.coroutines.CoroutineScope,
    onOpenParagraph: (Int) -> Unit,
    onAskAboutSummary: () -> Unit,
) {
    val summary = ai.summary
    if (summary == null) {
        KarsaCard {
            Column(Modifier.padding(20.dp)) {
                Text("Poin-poin penting artikel", style = displayStyle(19, 700, 1.25f))
                Text(
                    "Buat ringkasan untuk membantu memahami materi. Isi artikel akan dikirim ke penyedia AI Karsa.",
                    modifier = Modifier.padding(top = 6.dp),
                    style = sansStyle(13, 400, 1.6f, color = Muted),
                )
                Spacer(Modifier.height(16.dp))
                KarsaButton(
                    text = if (ai.summarySending) "Menyiapkan ringkasan…" else "Buat ringkasan",
                    onClick = { scope.launch { ai.createSummary() } },
                    full = true,
                    size = ButtonSize.Md,
                    loading = ai.summarySending,
                    enabled = (ai.quota?.summaryRemaining ?: 0) > 0,
                    leading = { LucideIcon(KarsaIcons.Sparkles, modifier = Modifier.size(18.dp), tint = Color.White) },
                )
                if ((ai.quota?.summaryRemaining ?: 0) == 0) {
                    Text(
                        "Kuota membuat ringkasan baru hari ini habis.",
                        modifier = Modifier.padding(top = 10.dp),
                        style = sansStyle(12, 500, 1.4f, color = Danger500),
                    )
                    KarsaButton(
                        text = "Periksa ringkasan tersimpan",
                        onClick = { scope.launch { ai.load() } },
                        variant = ButtonVariant.Ghost,
                        full = true,
                        size = ButtonSize.Sm,
                    )
                }
            }
        }
    } else {
        AiAnswerPanel(
            answer = summary.body,
            sources = summary.sources,
            webSearch = false,
            webSources = emptyList(),
            onOpenParagraph = onOpenParagraph,
        )
        Spacer(Modifier.height(12.dp))
        KarsaButton(
            text = "Tanya tentang ringkasan",
            onClick = onAskAboutSummary,
            variant = ButtonVariant.Soft,
            full = true,
            size = ButtonSize.Md,
            leading = { LucideIcon(KarsaIcons.MessagesSquare, modifier = Modifier.size(17.dp), tint = Brand700) },
        )
    }
}

@Composable
private fun AiChatTab(
    ai: AiController,
    scope: kotlinx.coroutines.CoroutineScope,
    onOpenParagraph: (Int) -> Unit,
    onExample: (String) -> Unit,
) {
    if (ai.turns.isEmpty() && !ai.asking && (ai.quota?.tokenRemaining ?: 0) > 0) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(22.dp))
                .background(Paper2)
                .padding(18.dp),
        ) {
            Text("Ada bagian yang belum jelas?", style = displayStyle(17, 700, 1.25f))
            Text(
                "Tanyakan materi dari artikel ini. Jawaban menyertakan rujukan paragraf jika tersedia.",
                modifier = Modifier.padding(top = 4.dp),
                style = sansStyle(12, 400, 1.55f, color = Muted),
            )
            Spacer(Modifier.height(12.dp))
            ExamplePrompt("Apa inti artikel ini?", onExample)
            Spacer(Modifier.height(8.dp))
            ExamplePrompt("Jelaskan konsep utama dengan bahasa sederhana.", onExample)
        }
        Spacer(Modifier.height(16.dp))
    }

    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        ai.turns.forEach { turn ->
            AiTurnBlock(turn, onOpenParagraph)
        }
        ai.pendingQuestion?.let { question ->
            QuestionBubble(question)
            AiPendingAnswer(web = ai.pendingWeb)
        }
        ai.failedQuestion?.let {
            FailedAnswer { scope.launch { ai.retryFailed() } }
        }
    }
}

@Composable
private fun AiTurnBlock(turn: LibAiTurnDto, onOpenParagraph: (Int) -> Unit) {
    QuestionBubble(turn.question)
    AiAnswerPanel(
        answer = turn.answer,
        sources = turn.sources,
        webSearch = turn.webSearch,
        webSources = turn.webSources,
        onOpenParagraph = onOpenParagraph,
    )
}

@Composable
private fun QuestionBubble(text: String) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
        Box(
            modifier = Modifier
                .widthIn(max = 280.dp)
                .clip(RoundedCornerShape(topStart = 18.dp, topEnd = 18.dp, bottomStart = 18.dp, bottomEnd = 6.dp))
                .background(Brand100)
                .padding(horizontal = 14.dp, vertical = 10.dp),
        ) {
            Text(text, style = sansStyle(14, 500, 1.5f, color = Ink))
        }
    }
}

@Composable
private fun AiAnswerPanel(
    answer: String,
    sources: List<Int>,
    webSearch: Boolean,
    webSources: List<LibAiWebSourceDto>,
    onOpenParagraph: (Int) -> Unit,
) {
    val context = LocalContext.current
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(18.dp))
            .background(Color.White)
            .border(1.dp, Line, RoundedCornerShape(18.dp))
            .padding(14.dp),
    ) {
        if (webSearch) {
            Badge("DARI WEB", tone = BadgeTone.Tide)
            Spacer(Modifier.height(8.dp))
        }
        AiAnswerText(answer)
        if (sources.isNotEmpty()) {
            Spacer(Modifier.height(10.dp))
            ParagraphChips(sources, onOpenParagraph)
        }
        if (webSources.isNotEmpty()) {
            Spacer(Modifier.height(10.dp))
            Text("Sumber web:", style = sansStyle(11, 700, 1.4f, color = Muted))
            Spacer(Modifier.height(4.dp))
            webSources.forEach { source ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp))
                        .clickable { openUrl(context, source.url) }
                        .padding(vertical = 4.dp),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        source.title.ifBlank { source.url },
                        modifier = Modifier.weight(1f),
                        style = sansStyle(12, 600, 1.4f, color = Brand700),
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                    )
                    LucideIcon(KarsaIcons.ExternalLink, modifier = Modifier.size(12.dp), tint = Brand700)
                }
            }
        }
    }
}

@Composable
private fun AiAnswerText(text: String) {
    val blocks = remember(text) { text.split(Regex("\\n\\s*\\n")).filter { it.isNotBlank() } }
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        blocks.forEach { block ->
            val lines = block.lines().filter { it.isNotBlank() }
            val numbered = lines.isNotEmpty() && lines.all { Regex("^\\d{1,2}\\.\\s+").containsMatchIn(it) }
            if (numbered) {
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    lines.forEach { line ->
                        val match = Regex("^(\\d{1,2})\\.\\s+(.*)$").find(line)
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.Top) {
                            Text(
                                match?.groupValues?.get(1) ?: "•",
                                modifier = Modifier.width(20.dp),
                                style = sansStyle(14, 700, 1.5f, color = Brand600),
                            )
                            Text(
                                inlineMarkdown(match?.groupValues?.get(2) ?: line),
                                style = sansStyle(15, 400, 1.65f, color = Ink2),
                            )
                        }
                    }
                }
            } else {
                Text(
                    inlineMarkdown(block),
                    style = sansStyle(15, 400, 1.65f, color = Ink2),
                )
            }
        }
    }
}

@Composable
private fun ParagraphChips(sources: List<Int>, onOpenParagraph: (Int) -> Unit) {
    Row(
        modifier = Modifier.horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        sources.distinct().forEach { number ->
            Row(
                modifier = Modifier
                    .clip(CircleShape)
                    .background(Brand50)
                    .clickable { onOpenParagraph(number) }
                    .padding(horizontal = 10.dp, vertical = 6.dp),
                horizontalArrangement = Arrangement.spacedBy(4.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text("Paragraf $number", style = sansStyle(11, 700, 1.2f, color = Brand700))
                LucideIcon(KarsaIcons.ExternalLink, modifier = Modifier.size(11.dp), tint = Brand700)
            }
        }
    }
}

@Composable
private fun ExamplePrompt(text: String, onExample: (String) -> Unit) {
    Text(
        text,
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(Color.White)
            .border(1.dp, Line, RoundedCornerShape(14.dp))
            .clickable { onExample(text) }
            .padding(horizontal = 12.dp, vertical = 10.dp),
        style = sansStyle(13, 500, 1.45f, color = Ink2),
    )
}

@Composable
private fun AiPendingAnswer(web: Boolean) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(18.dp))
            .background(Color.White)
            .border(1.dp, Line, RoundedCornerShape(18.dp))
            .padding(14.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Spinner(tint = Brand600, modifier = Modifier.size(18.dp))
        Text(
            if (web) "Mencari info terbaru…" else "Teman baca sedang menyiapkan jawaban…",
            style = sansStyle(12, 500, 1.45f, color = Muted),
        )
    }
}

@Composable
private fun FailedAnswer(onRetry: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(Danger100)
            .clickable(onClick = onRetry)
            .padding(horizontal = 14.dp, vertical = 12.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        LucideIcon(KarsaIcons.RefreshCw, modifier = Modifier.size(16.dp), tint = Danger500)
        Text(
            "Gagal terkirim — ketuk untuk coba lagi",
            style = sansStyle(12, 600, 1.4f, color = Danger500),
        )
    }
}

@Composable
private fun AiComposer(
    text: String,
    onTextChange: (String) -> Unit,
    quotaLeft: Int,
    webArmed: Boolean,
    asking: Boolean,
    focus: FocusRequester,
    onToggleWeb: () -> Unit,
    onSend: () -> Unit,
    onOpenPlan: () -> Unit,
) {
    val canSend = text.isNotBlank() && !asking && quotaLeft > 0
    val shape = RoundedCornerShape(22.dp)
    val chipBg by animateColorAsState(
        targetValue = if (webArmed) Espresso else Paper2,
        animationSpec = tween(200),
        label = "chipBg",
    )
    val chipFg by animateColorAsState(
        targetValue = if (webArmed) Color.White else Ink2,
        animationSpec = tween(200),
        label = "chipFg",
    )
    val sendBg by animateColorAsState(
        targetValue = if (canSend || asking) Brand600 else Paper3,
        animationSpec = tween(200),
        label = "sendBg",
    )
    val sendFg by animateColorAsState(
        targetValue = if (canSend || asking) Color.White else Muted,
        animationSpec = tween(200),
        label = "sendFg",
    )

    Column(Modifier.fillMaxWidth()) {
        if (quotaLeft == 0) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .shadow(
                        elevation = 6.dp,
                        shape = shape,
                        ambientColor = Ink.copy(alpha = 0.08f),
                        spotColor = Ink.copy(alpha = 0.12f),
                    )
                    .background(Color.White, shape)
                    .border(1.dp, Line, shape)
                    .padding(16.dp),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                LucideIcon(KarsaIcons.Clock, modifier = Modifier.size(16.dp), tint = Muted)
                Text(
                    "Kuota token bulan ini habis.",
                    modifier = Modifier.weight(1f),
                    style = sansStyle(13, 500, 1.4f, color = Ink2),
                )
                Text(
                    "Lihat paket",
                    modifier = Modifier
                        .clip(CircleShape)
                        .clickable(onClick = onOpenPlan)
                        .padding(horizontal = 8.dp, vertical = 6.dp),
                    style = sansStyle(13, 700, 1.2f, color = Brand700),
                )
            }
        } else {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .shadow(
                        elevation = 6.dp,
                        shape = shape,
                        ambientColor = Ink.copy(alpha = 0.08f),
                        spotColor = Ink.copy(alpha = 0.12f),
                    )
                    .background(Color.White, shape)
                    .border(1.dp, Line, shape)
                    .padding(start = 16.dp, end = 12.dp, top = 14.dp, bottom = 10.dp),
            ) {
                Box(
                    modifier = Modifier.fillMaxWidth().padding(end = 4.dp),
                    contentAlignment = Alignment.TopStart,
                ) {
                    if (text.isEmpty()) {
                        Text(
                            "Tanya tentang materi...",
                            style = sansStyle(15, 400, 1.467f, color = Muted),
                        )
                    }
                    BasicTextField(
                        value = text,
                        onValueChange = onTextChange,
                        modifier = Modifier.fillMaxWidth().focusRequester(focus),
                        textStyle = sansStyle(15, 400, 1.467f, color = Ink),
                        cursorBrush = SolidColor(Brand600),
                        minLines = 1,
                        maxLines = 5,
                    )
                }
                Spacer(Modifier.height(12.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Row(
                            modifier = Modifier
                                .clip(CircleShape)
                                .background(chipBg)
                                .clickable(
                                    interactionSource = remember { MutableInteractionSource() },
                                    indication = null,
                                    onClick = onToggleWeb,
                                )
                                .padding(horizontal = 12.dp, vertical = 6.dp),
                            horizontalArrangement = Arrangement.spacedBy(5.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            LucideIcon(
                                KarsaIcons.Search,
                                modifier = Modifier.size(15.dp),
                                tint = chipFg,
                            )
                            Text("Cari web", style = sansStyle(13, 500, 1.2f, color = chipFg))
                        }
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(3.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            LucideIcon(
                                KarsaIcons.Zap,
                                modifier = Modifier.size(14.dp),
                                tint = Ink2,
                            )
                            Text(
                                "Sisa ${formatTokenCompact(quotaLeft)} Token",
                                style = sansStyle(13, 400, 1.2f, color = Ink2),
                            )
                        }
                    }
                    Box(
                        modifier = Modifier
                            .size(40.dp)
                            .clip(CircleShape)
                            .background(sendBg)
                            .clickable(
                                interactionSource = remember { MutableInteractionSource() },
                                indication = null,
                                enabled = canSend,
                                onClick = onSend,
                            ),
                        contentAlignment = Alignment.Center,
                    ) {
                        if (asking) {
                            Spinner(tint = Color.White, modifier = Modifier.size(18.dp))
                        } else {
                            LucideIcon(
                                KarsaIcons.Send,
                                modifier = Modifier.size(18.dp).offset(x = 1.dp),
                                tint = sendFg,
                            )
                        }
                    }
                }
            }
        }
        Spacer(Modifier.height(8.dp))
        AiDisclaimer()
    }
}

@Composable
private fun AiDisclaimer() {
    Text(
        "AI dapat keliru. Periksa kembali artikel dan sumber belajarmu.",
        modifier = Modifier.fillMaxWidth(),
        style = sansStyle(11, 400, 1.4f, color = Ink2.copy(alpha = 0.85f)),
        textAlign = TextAlign.Center,
    )
}

private fun formatTokenCompact(value: Int): String = when {
    value >= 1_000_000 -> String.format(Locale("id", "ID"), "%.1f JT", value / 1_000_000.0)
    value >= 1_000 -> "${value / 1_000} rb"
    else -> "$value"
}

private fun openUrl(context: Context, url: String) {
    val uri = runCatching { Uri.parse(url) }.getOrNull() ?: return
    if (uri.scheme != "https" && uri.scheme != "http") return
    runCatching {
        context.startActivity(
            Intent(Intent.ACTION_VIEW, uri).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
        )
    }
}
