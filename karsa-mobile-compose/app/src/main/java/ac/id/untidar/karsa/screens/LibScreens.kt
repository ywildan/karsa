package ac.id.untidar.karsa.screens

import androidx.compose.foundation.LocalIndication
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import ac.id.untidar.karsa.AuthorStatus
import ac.id.untidar.karsa.LocalApp
import ac.id.untidar.karsa.Route
import ac.id.untidar.karsa.ToastTone
import ac.id.untidar.karsa.data.Article
import ac.id.untidar.karsa.data.ArticleStatus
import ac.id.untidar.karsa.data.Comment
import ac.id.untidar.karsa.data.excerptOf
import ac.id.untidar.karsa.data.fmtDate
import ac.id.untidar.karsa.data.relTime
import ac.id.untidar.karsa.icons.KarsaIcons
import ac.id.untidar.karsa.icons.LucideIcon
import ac.id.untidar.karsa.theme.Brand100
import ac.id.untidar.karsa.theme.Brand400
import ac.id.untidar.karsa.theme.Brand50
import ac.id.untidar.karsa.theme.Brand500
import ac.id.untidar.karsa.theme.Brand600
import ac.id.untidar.karsa.theme.Brand700
import ac.id.untidar.karsa.theme.Butter100
import ac.id.untidar.karsa.theme.Butter400
import ac.id.untidar.karsa.theme.Butter700
import ac.id.untidar.karsa.theme.Espresso
import ac.id.untidar.karsa.theme.Ink
import ac.id.untidar.karsa.theme.Ink2
import ac.id.untidar.karsa.theme.Line
import ac.id.untidar.karsa.theme.Muted
import ac.id.untidar.karsa.theme.Paper
import ac.id.untidar.karsa.theme.Paper2
import ac.id.untidar.karsa.theme.Paper3
import ac.id.untidar.karsa.theme.Tide100
import ac.id.untidar.karsa.theme.Tide600
import ac.id.untidar.karsa.ui.brandShadow
import ac.id.untidar.karsa.theme.displayStyle
import ac.id.untidar.karsa.ui.pressScale
import ac.id.untidar.karsa.theme.sansStyle
import ac.id.untidar.karsa.ui.Avatar
import ac.id.untidar.karsa.ui.Badge
import ac.id.untidar.karsa.ui.BadgeTone
import ac.id.untidar.karsa.ui.ButtonSize
import ac.id.untidar.karsa.ui.ButtonVariant
import ac.id.untidar.karsa.ui.EmptyState
import ac.id.untidar.karsa.ui.EyebrowText
import ac.id.untidar.karsa.ui.Gate
import ac.id.untidar.karsa.ui.KarsaButton
import ac.id.untidar.karsa.ui.KarsaCard
import ac.id.untidar.karsa.ui.KarsaSheet
import ac.id.untidar.karsa.ui.ListSkeleton
import ac.id.untidar.karsa.ui.LoadStatus
import ac.id.untidar.karsa.ui.Markdown
import ac.id.untidar.karsa.ui.MenuEntry
import ac.id.untidar.karsa.ui.PageHeader
import ac.id.untidar.karsa.ui.PopMenu
import ac.id.untidar.karsa.ui.Rise
import ac.id.untidar.karsa.ui.SearchField
import ac.id.untidar.karsa.ui.Skeleton
import ac.id.untidar.karsa.ui.TopBar
import ac.id.untidar.karsa.ui.cardShadow
import ac.id.untidar.karsa.ui.rememberLoad

@Composable
fun LibHome() {
    val state = LocalApp.current
    val load = rememberLoad()
    var q by remember { mutableStateOf("") }
    var gate by remember { mutableStateOf(false) }

    val list = state.articles.filter { article ->
        article.status != ArticleStatus.Draft &&
            (q.isBlank() || article.title.lowercase().contains(q.trim().lowercase()))
    }

    fun needAccess(block: () -> Unit) {
        if (state.authorStatus == AuthorStatus.Approved) block() else gate = true
    }

    Column(Modifier.fillMaxSize()) {
        PageHeader(
            title = "Karsa Lib",
            eyebrow = { EyebrowText("Perpustakaan prodi") },
            subtitle = "Ilmu tumbuh saat dibagikan.",
            right = {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                    HeaderTulisButton { needAccess { state.go(Route.Editor()) } }
                    PopMenu(
                        entries = listOf(
                            MenuEntry("Tulisan saya", KarsaIcons.FileText, { state.go(Route.MyPosts) }),
                            MenuEntry("Impor .docx", KarsaIcons.FileUp, { needAccess { state.go(Route.Import) } }),
                            MenuEntry("Profil penulis", KarsaIcons.UserPen, { state.go(Route.Author) }),
                        ),
                    )
                }
            },
        )

        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp)
                .padding(bottom = 112.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            when (state.authorStatus) {
                AuthorStatus.None -> Rise {
                    AuthorBanner(
                        background = Butter100,
                        iconTile = Espresso,
                        iconTint = Butter400,
                        title = "Ingin ikut menulis?",
                        body = "Ajukan akses penulis agar tulisanmu dibaca seluruh prodi.",
                        bodyColor = Butter700,
                        action = {
                            KarsaButton(
                                text = "Ajukan",
                                onClick = { state.go(Route.Author) },
                                variant = ButtonVariant.Dark,
                                size = ButtonSize.Sm,
                            )
                        },
                    )
                }
                AuthorStatus.Pending -> Rise {
                    AuthorBanner(
                        background = Tide100,
                        iconTile = Color.White,
                        iconTint = Tide600,
                        title = "Pengajuan sedang ditinjau",
                        body = "Admin prodi biasanya merespons dalam 1×24 jam.",
                        bodyColor = Tide600,
                        action = null,
                        footer = {
                            Text(
                                "Simulasikan disetujui (demo)",
                                modifier = Modifier.clickable {
                                    state.authorStatus = AuthorStatus.Approved
                                    state.notify("Akses penulis disetujui. Selamat menulis!", ToastTone.Success)
                                },
                                style = sansStyle(12, 700, 1.3f, color = Tide600).copy(
                                    textDecoration = androidx.compose.ui.text.style.TextDecoration.Underline,
                                ),
                            )
                        },
                    )
                }
                AuthorStatus.Approved -> Unit
            }

            SearchField(value = q, onChange = { q = it }, placeholder = "Cari judul artikel di prodimu")

            Gate(status = load.status, onRetry = load.retry, skeleton = { ListSkeleton(count = 3) }) {
                if (list.isEmpty()) {
                    KarsaCard {
                        if (state.articles.isEmpty()) {
                            EmptyState(
                                title = "Belum ada artikel",
                                desc = "Jadilah yang pertama membagikan catatan belajarmu di prodi ini.",
                                icon = { LucideIcon(KarsaIcons.BookOpenText, modifier = Modifier.size(36.dp), tint = Brand600) },
                                action = {
                                    KarsaButton(
                                        text = "Tulis artikel",
                                        onClick = { needAccess { state.go(Route.Editor()) } },
                                        leading = { LucideIcon(KarsaIcons.PenLine, modifier = Modifier.size(16.dp), tint = Color.White) },
                                    )
                                },
                            )
                        } else {
                            EmptyState(
                                title = "Artikel tidak ditemukan",
                                desc = "Tidak ada judul yang cocok dengan “$q”.",
                                icon = { LucideIcon(KarsaIcons.SearchX, modifier = Modifier.size(36.dp), tint = Brand600) },
                                action = {
                                    KarsaButton(
                                        text = "Hapus pencarian",
                                        onClick = { q = "" },
                                        variant = ButtonVariant.Soft,
                                    )
                                },
                            )
                        }
                    }
                } else {
                    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                        list.forEachIndexed { index, article ->
                            Rise(delayMillis = index * 50) {
                                ArticleCard(
                                    article = article,
                                    comments = state.comments.count { it.articleId == article.id },
                                    onOpen = { state.go(Route.Article(article.id)) },
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    KarsaSheet(open = gate, onClose = { gate = false }, title = "Perlu akses penulis") {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Box(
                modifier = Modifier
                    .size(64.dp)
                    .clip(RoundedCornerShape(24.dp))
                    .background(Butter100),
                contentAlignment = Alignment.Center,
            ) {
                LucideIcon(KarsaIcons.Feather, modifier = Modifier.size(32.dp), tint = Butter700)
            }
            Spacer(Modifier.height(16.dp))
            Text(
                "Menulis di Karsa Lib membutuhkan akses penulis. Lengkapi profil penulis, lalu admin prodi akan meninjaunya.",
                modifier = Modifier.width(280.dp),
                style = sansStyle(15, 400, 1.625f, color = Ink2),
                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
            )
            Spacer(Modifier.height(24.dp))
            KarsaButton(
                text = "Ajukan akses penulis",
                onClick = {
                    gate = false
                    state.go(Route.Author)
                },
                size = ButtonSize.Lg,
                full = true,
            )
            Spacer(Modifier.height(10.dp))
            KarsaButton(
                text = "Nanti saja",
                onClick = { gate = false },
                variant = ButtonVariant.Ghost,
                full = true,
            )
        }
    }
}

@Composable
private fun HeaderTulisButton(onClick: () -> Unit) {
    val interaction = remember { MutableInteractionSource() }
    Row(
        modifier = Modifier
            .height(44.dp)
            .clip(CircleShape)
            .brandShadow(CircleShape)
            .background(Brand500)
            .pressScale(interaction)
            .clickable(
                interactionSource = interaction,
                indication = LocalIndication.current,
                onClick = onClick,
            )
            .padding(horizontal = 20.dp),
        horizontalArrangement = Arrangement.spacedBy(6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        LucideIcon(KarsaIcons.PenLine, modifier = Modifier.size(16.dp), tint = Color.White)
        Text("Tulis", style = sansStyle(14, 600, 1.2f, color = Color.White))
    }
}

@Composable
private fun AuthorBanner(
    background: Color,
    iconTile: Color,
    iconTint: Color,
    title: String,
    body: String,
    bodyColor: Color,
    action: (@Composable () -> Unit)?,
    footer: (@Composable () -> Unit)? = null,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(28.dp))
            .background(background)
            .padding(start = 16.dp, end = 20.dp, top = 16.dp, bottom = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .size(48.dp)
                .clip(RoundedCornerShape(16.dp))
                .background(iconTile),
            contentAlignment = Alignment.Center,
        ) {
            LucideIcon(KarsaIcons.Feather, modifier = Modifier.size(24.dp), tint = iconTint)
        }
        Column(Modifier.weight(1f)) {
            Text(title, style = displayStyle(17, 700, 1.25f))
            Text(body, style = sansStyle(13, 400, 1.375f, color = bodyColor))
            footer?.invoke()
        }
        action?.invoke()
    }
}

@Composable
fun ArticleCard(article: Article, comments: Int, onOpen: () -> Unit) {
    val interaction = remember { MutableInteractionSource() }
    KarsaCard(
        modifier = Modifier
            .fillMaxWidth()
            .pressScale(interaction, 0.99f)
            .clickable(
                interactionSource = interaction,
                indication = LocalIndication.current,
                onClick = onOpen,
            ),
    ) {
        Column(Modifier.padding(20.dp)) {
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
                Avatar(name = article.author, size = 38.dp)
                Column(Modifier.weight(1f)) {
                    Text(
                        article.author,
                        style = sansStyle(14, 700, 1.25f),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Text(
                        "${article.prodi} · ${relTime(article.ts)}",
                        style = sansStyle(12, 400, 1.4f, color = Muted),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
                Badge(article.tag, tone = BadgeTone.Neutral)
            }
            Spacer(Modifier.height(16.dp))
            Text(article.title, style = displayStyle(20, 700, 1.2f, -0.02f))
            Spacer(Modifier.height(8.dp))
            Text(
                excerptOf(article.body),
                style = sansStyle(14, 400, 1.625f, color = Ink2),
                maxLines = 3,
                overflow = TextOverflow.Ellipsis,
            )
            Spacer(Modifier.height(16.dp))
            Box(Modifier.fillMaxWidth().height(1.dp).background(Line))
            Spacer(Modifier.height(14.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(20.dp), verticalAlignment = Alignment.CenterVertically) {
                StatItem(KarsaIcons.Eye, "${article.readers} pembaca")
                StatItem(KarsaIcons.MessageCircle, "$comments komentar")
            }
        }
    }
}

@Composable
private fun StatItem(icon: List<String>, text: String) {
    Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
        LucideIcon(icon, modifier = Modifier.size(16.dp), tint = Muted)
        Text(text, style = sansStyle(13, 600, 1.3f, color = Muted))
    }
}

@Composable
fun ArticleScreen(id: String) {
    val state = LocalApp.current
    val load = rememberLoad(delayMillis = 500)
    val article = state.articles.firstOrNull { it.id == id } ?: return
    var text by remember { mutableStateOf("") }
    var replyTo by remember { mutableStateOf<Comment?>(null) }

    val list = state.comments.filter { it.articleId == id }
    val top = list.filter { it.parentId == null }
    fun repliesOf(parentId: String): List<Comment> = list.filter { it.parentId == parentId }

    fun send() {
        val trimmed = text.trim()
        if (trimmed.isEmpty()) return
        state.addComment(id, trimmed, replyTo?.parentId ?: replyTo?.id)
        text = ""
        replyTo = null
        state.notify("Komentar terkirim", ToastTone.Success)
    }

    Column(Modifier.fillMaxSize().background(Paper).imePadding()) {
        TopBar(
            onBack = { state.back() },
            title = "Artikel",
            right = {
                KarsaIconButtonShare {
                    state.notify("Tautan artikel disalin")
                }
            },
        )
        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp)
                .padding(bottom = 24.dp),
        ) {
            Gate(
                status = load.status,
                onRetry = load.retry,
                skeleton = {
                    Column(Modifier.padding(top = 8.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                        Skeleton(Modifier.fillMaxWidth().height(36.dp))
                        Skeleton(Modifier.fillMaxWidth(0.75f).height(36.dp))
                        Skeleton(Modifier.fillMaxWidth(0.5f).height(48.dp), CircleShape)
                        Skeleton(Modifier.fillMaxWidth().height(16.dp))
                        Skeleton(Modifier.fillMaxWidth().height(16.dp))
                        Skeleton(Modifier.fillMaxWidth(0.66f).height(16.dp))
                    }
                },
            ) {
                Rise {
                    Column(Modifier.padding(top = 4.dp)) {
                        Badge(article.tag, tone = BadgeTone.Brand)
                        Spacer(Modifier.height(12.dp))
                        Text(article.title, style = displayStyle(28, 800, 1.1f, -0.02f))
                        Spacer(Modifier.height(20.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
                            Avatar(name = article.author, size = 44.dp)
                            Column {
                                Text(article.author, style = sansStyle(15, 700, 1.25f))
                                Text(article.prodi, style = sansStyle(12, 400, 1.4f, color = Muted))
                            }
                        }
                        Spacer(Modifier.height(16.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                            LucideIcon(KarsaIcons.Eye, modifier = Modifier.size(16.dp), tint = Muted)
                            Text("${article.readers} pembaca unik", style = sansStyle(13, 600, 1.3f, color = Muted))
                            Text("·", style = sansStyle(13, 600, 1.3f, color = Muted))
                            Text(fmtDate(article.ts), style = sansStyle(13, 600, 1.3f, color = Muted))
                        }
                        Spacer(Modifier.height(20.dp))
                        Box(Modifier.fillMaxWidth().height(1.dp).background(Line))
                        Markdown(article.body)

                        Spacer(Modifier.height(40.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                            Text("Diskusi", style = displayStyle(22, 700, 1.25f))
                            Box(
                                Modifier
                                    .clip(CircleShape)
                                    .background(Paper3)
                                    .padding(horizontal = 10.dp, vertical = 2.dp),
                            ) {
                                Text("${list.size}", style = sansStyle(12, 700, 1.3f, color = Ink2))
                            }
                        }
                        Spacer(Modifier.height(16.dp))
                        if (top.isEmpty()) {
                            KarsaCard {
                                EmptyState(
                                    title = "Belum ada diskusi",
                                    desc = "Tulis komentar pertamamu, tanyakan atau tambahkan sudut pandang.",
                                    icon = { LucideIcon(KarsaIcons.MessageCircle, modifier = Modifier.size(36.dp), tint = Brand600) },
                                )
                            }
                        } else {
                            Column(verticalArrangement = Arrangement.spacedBy(20.dp)) {
                                top.forEach { comment ->
                                    Column {
                                        CommentItem(comment = comment, articleAuthor = article.author, onReply = { replyTo = comment })
                                        val replies = repliesOf(comment.id)
                                        if (replies.isNotEmpty()) {
                                            Column(
                                                modifier = Modifier
                                                    .padding(start = 18.dp, top = 12.dp)
                                                    .fillMaxWidth()
                                                    .drawLeftBorder()
                                                    .padding(start = 16.dp),
                                                verticalArrangement = Arrangement.spacedBy(16.dp),
                                            ) {
                                                replies.forEach { reply ->
                                                    CommentItem(comment = reply, articleAuthor = article.author, small = true, onReply = { replyTo = reply })
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(Paper)
                .drawTopBorder()
                .navigationBarsPadding()
                .padding(horizontal = 16.dp, vertical = 12.dp),
        ) {
            if (replyTo != null) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 8.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(Brand100)
                        .padding(horizontal = 12.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    LucideIcon(KarsaIcons.Reply, modifier = Modifier.size(14.dp), tint = Brand700)
                    Text(
                        "Membalas ${replyTo!!.author}",
                        modifier = Modifier.weight(1f),
                        style = sansStyle(12, 600, 1.4f, color = Brand700),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Box(Modifier.clickable { replyTo = null }) {
                        LucideIcon(KarsaIcons.X, modifier = Modifier.size(16.dp), tint = Brand700)
                    }
                }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                BasicTextField(
                    value = text,
                    onValueChange = { text = it },
                    modifier = Modifier
                        .weight(1f)
                        .height(48.dp)
                        .clip(CircleShape)
                        .background(Color.White)
                        .border(1.dp, Line, CircleShape),
                    textStyle = sansStyle(15, 400, 1.5f, color = Ink),
                    singleLine = true,
                    cursorBrush = SolidColor(Brand500),
                    decorationBox = { inner ->
                        Box(Modifier.fillMaxSize().padding(horizontal = 20.dp), contentAlignment = Alignment.CenterStart) {
                            if (text.isEmpty()) {
                                Text(
                                    if (replyTo != null) "Tulis balasan…" else "Tulis komentar…",
                                    style = sansStyle(15, 400, 1.5f, color = Muted.copy(alpha = 0.8f)),
                                )
                            }
                            inner()
                        }
                    },
                )
                val enabled = text.trim().isNotEmpty()
                Box(
                    modifier = Modifier
                        .size(48.dp)
                        .clip(CircleShape)
                        .then(if (enabled) Modifier.brandShadow(CircleShape) else Modifier)
                        .background(if (enabled) Brand500 else Paper3)
                        .clickable(enabled = enabled, onClick = ::send),
                    contentAlignment = Alignment.Center,
                ) {
                    LucideIcon(
                        KarsaIcons.Send,
                        modifier = Modifier.size(20.dp),
                        tint = if (enabled) Color.White else Muted,
                    )
                }
            }
        }
    }
}

@Composable
private fun KarsaIconButtonShare(onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .size(40.dp)
            .clip(CircleShape)
            .background(Color.White)
            .border(1.dp, Line, CircleShape)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        LucideIcon(KarsaIcons.Share2, modifier = Modifier.size(18.dp), tint = Ink)
    }
}

@Composable
private fun CommentItem(comment: Comment, articleAuthor: String, small: Boolean = false, onReply: () -> Unit) {
    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        Avatar(name = comment.author, size = if (small) 32.dp else 38.dp)
        Column(Modifier.weight(1f)) {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                Text(if (comment.mine) "Kamu" else comment.author, style = sansStyle(14, 700, 1.3f))
                if (comment.author == articleAuthor) {
                    Badge("PENULIS", tone = BadgeTone.Brand)
                }
                Text(relTime(comment.ts), style = sansStyle(12, 400, 1.3f, color = Muted))
            }
            Spacer(Modifier.height(4.dp))
            Text(
                comment.text,
                style = sansStyle(if (small) 14 else 15, 400, 1.625f, color = Ink2),
            )
            Spacer(Modifier.height(6.dp))
            Row(
                modifier = Modifier.clickable(onClick = onReply),
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                LucideIcon(KarsaIcons.Reply, modifier = Modifier.size(14.dp), tint = Muted)
                Text("Balas", style = sansStyle(13, 600, 1.3f, color = Muted))
            }
        }
    }
}

private fun Modifier.drawTopBorder(): Modifier = androidx.compose.ui.draw.drawBehind {
    drawLine(Line, start = androidx.compose.ui.geometry.Offset(0f, 0f), end = androidx.compose.ui.geometry.Offset(size.width, 0f), strokeWidth = 1.dp.toPx())
}

private fun Modifier.drawLeftBorder(): Modifier = androidx.compose.ui.draw.drawBehind {
    drawLine(Line, start = androidx.compose.ui.geometry.Offset(0f, 0f), end = androidx.compose.ui.geometry.Offset(0f, size.height), strokeWidth = 2.dp.toPx())
}
