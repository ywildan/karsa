package ac.id.untidar.karsa.screens

import androidx.activity.compose.BackHandler
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.tween
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
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.verticalScroll
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
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.font.FontStyle
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
import ac.id.untidar.karsa.net.friendlyError
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
import ac.id.untidar.karsa.ui.Chip
import ac.id.untidar.karsa.ui.ButtonSize
import ac.id.untidar.karsa.ui.ButtonVariant
import ac.id.untidar.karsa.ui.EmptyState
import ac.id.untidar.karsa.ui.EyebrowText
import ac.id.untidar.karsa.ui.Gate
import ac.id.untidar.karsa.ui.DialogTone
import ac.id.untidar.karsa.ui.KarsaButton
import ac.id.untidar.karsa.ui.KarsaCard
import ac.id.untidar.karsa.ui.KarsaDialog
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
import ac.id.untidar.karsa.ui.Spinner
import ac.id.untidar.karsa.ui.TopBar
import ac.id.untidar.karsa.ui.cardShadow
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@Composable
fun LibHome() {
    val state = LocalApp.current
    val lib = state.lib
    var q by remember { mutableStateOf("") }
    var sort by remember { mutableStateOf("latest") }
    var gate by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) { if (lib.bootstrap == null) lib.loadBootstrap() }
    LaunchedEffect(lib.bootstrap, sort, q) {
        if (lib.profile != null) {
            if (q.isNotBlank()) delay(350)
            lib.loadFeed(sort, q)
        }
    }

    fun needAccess(block: () -> Unit) {
        if (lib.canWrite) block() else gate = true
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
                        entries = buildList {
                            if (lib.canWrite) {
                                add(MenuEntry("Tulisan saya", KarsaIcons.FileText, { state.go(Route.MyPosts) }))
                                add(MenuEntry("Impor .docx", KarsaIcons.FileUp, { state.go(Route.Import) }))
                                if (lib.uid.isNotBlank()) {
                                    add(MenuEntry("Profil penulis", KarsaIcons.UserPen, { state.go(Route.AuthorProfile(lib.uid)) }))
                                }
                            } else {
                                add(MenuEntry("Ajukan akses penulis", KarsaIcons.Feather, { state.go(Route.Author) }))
                            }
                        },
                    )
                }
            },
        )

        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp)
                .padding(bottom = 140.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            when (lib.bootstrapStatus) {
                LoadStatus.Loading -> ListSkeleton(count = 3)
                LoadStatus.Error -> KarsaCard {
                    EmptyState(
                        title = "Karsa Lib belum termuat",
                        desc = "Periksa koneksi lalu coba lagi.",
                        icon = { LucideIcon(KarsaIcons.TriangleAlert, modifier = Modifier.size(36.dp), tint = Brand600) },
                        action = {
                            KarsaButton(
                                text = "Coba lagi",
                                onClick = { lib.loadBootstrap() },
                                variant = ButtonVariant.Soft,
                            )
                        },
                    )
                }
                LoadStatus.Ready -> {
                    if (lib.profile == null) {
                        ProfileSetupContent(onSaved = { lib.loadBootstrap() })
                    } else {
                        when (state.authorStatus) {
                            AuthorStatus.None -> Rise {
                                val rejected = lib.requestStatus != null && lib.requestStatus != "PENDING"
                                AuthorBanner(
                                    background = Butter100,
                                    iconTile = Espresso,
                                    iconTint = Butter400,
                                    title = if (rejected) "Permohonan belum disetujui" else "Ingin ikut menulis?",
                                    body = if (rejected) {
                                        lib.decisionNote ?: "Periksa kembali permohonanmu, lalu ajukan ulang."
                                    } else {
                                        "Ajukan akses penulis agar tulisanmu dibaca seluruh prodi."
                                    },
                                    bodyColor = Butter700,
                                    action = {
                                        KarsaButton(
                                            text = if (rejected) "Ajukan ulang" else "Ajukan",
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
                                    body = "Kamu tetap bisa membaca dan berdiskusi. Tarik layar untuk memperbarui status.",
                                    bodyColor = Tide600,
                                    action = null,
                                )
                            }
                            AuthorStatus.Approved -> Unit
                        }

                        SearchField(
                            value = q,
                            onChange = { if (it.length <= 100) q = it },
                            placeholder = "Cari judul artikel di prodimu",
                        )

                        Row(
                            modifier = Modifier.horizontalScroll(rememberScrollState()),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            Chip("Terbaru", selected = sort == "latest", onClick = { sort = "latest" })
                            Chip("Trending 7 hari", selected = sort == "trending_7d", onClick = { sort = "trending_7d" })
                            Chip("Trending 30 hari", selected = sort == "trending_30d", onClick = { sort = "trending_30d" })
                        }

                        when {
                            lib.feedStatus == LoadStatus.Loading && lib.feed.isEmpty() -> ListSkeleton(count = 3)
                            lib.feedStatus == LoadStatus.Error && lib.feed.isEmpty() -> KarsaCard {
                                EmptyState(
                                    title = "Umpan belum termuat",
                                    desc = "Periksa koneksi lalu coba lagi.",
                                    icon = { LucideIcon(KarsaIcons.TriangleAlert, modifier = Modifier.size(36.dp), tint = Brand600) },
                                    action = {
                                        KarsaButton(
                                            text = "Coba lagi",
                                            onClick = { lib.loadFeed(sort, q) },
                                            variant = ButtonVariant.Soft,
                                        )
                                    },
                                )
                            }
                            lib.feed.isEmpty() -> KarsaCard {
                                if (q.isBlank()) {
                                    val writeAction: (@Composable () -> Unit)? = if (lib.canWrite) {
                                        {
                                            KarsaButton(
                                                text = "Tulis artikel",
                                                onClick = { state.go(Route.Editor()) },
                                                leading = { LucideIcon(KarsaIcons.PenLine, modifier = Modifier.size(16.dp), tint = Color.White) },
                                            )
                                        }
                                    } else {
                                        null
                                    }
                                    EmptyState(
                                        title = "Belum ada artikel",
                                        desc = "Saat ada tulisan baru dari prodimu, artikel itu akan muncul di sini.",
                                        icon = { LucideIcon(KarsaIcons.BookOpenText, modifier = Modifier.size(36.dp), tint = Brand600) },
                                        action = writeAction,
                                    )
                                } else {
                                    EmptyState(
                                        title = "Artikel tidak ditemukan",
                                        desc = "Tidak ada judul yang cocok di program studimu. Coba kata kunci lain.",
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
                            else -> Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                                lib.feed.forEachIndexed { index, article ->
                                    Rise(delayMillis = index * 50) {
                                        ArticleCard(
                                            article = article,
                                            comments = article.commentsCount,
                                            onOpen = { state.go(Route.Article(article.id)) },
                                            onAuthor = if (article.authorId.isNotBlank()) {
                                                { state.go(Route.AuthorProfile(article.authorId)) }
                                            } else null,
                                        )
                                    }
                                }
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
fun ArticleCard(article: Article, comments: Int, onOpen: () -> Unit, onAuthor: (() -> Unit)? = null) {
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
                Row(
                    modifier = Modifier
                        .weight(1f)
                        .clickable(enabled = onAuthor != null) { onAuthor?.invoke() },
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
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
    val lib = state.lib
    val scope = rememberCoroutineScope()
    val article = lib.details[id] ?: lib.feed.firstOrNull { it.id == id }
    var text by remember { mutableStateOf("") }
    var replyTo by remember { mutableStateOf<Comment?>(null) }
    var sending by remember { mutableStateOf(false) }
    var deleteTarget by remember { mutableStateOf<Comment?>(null) }
    var reportComment by remember { mutableStateOf<Comment?>(null) }
    var reportArticle by remember { mutableStateOf(false) }
    val exit = remember { Animatable(0f) }
    var closing by remember { mutableStateOf(false) }

    fun close() {
        if (closing) return
        closing = true
        scope.launch {
            exit.animateTo(
                targetValue = 1f,
                animationSpec = tween(220, easing = CubicBezierEasing(0.4f, 0f, 0.2f, 1f)),
            )
            state.back()
        }
    }

    BackHandler { close() }

    LaunchedEffect(id) {
        lib.loadArticle(id)
        lib.loadComments(id)
    }

    val list = lib.comments[id].orEmpty()
    val top = list.filter { it.parentId == null }
    val visibleCount = list.count { !it.deleted }
    fun repliesOf(parentId: String): List<Comment> = list.filter { it.parentId == parentId }

    fun send() {
        val trimmed = text.trim()
        if (trimmed.isEmpty() || sending) return
        sending = true
        scope.launch {
            try {
                lib.addComment(id, trimmed, replyTo?.parentId ?: replyTo?.id)
                text = ""
                replyTo = null
                state.notify("Komentar terkirim", ToastTone.Success)
            } catch (error: Exception) {
                state.notify(friendlyError(error), ToastTone.Error)
            } finally {
                sending = false
            }
        }
    }

    Column(
        Modifier
            .fillMaxSize()
            .background(Paper)
            .imePadding()
            .graphicsLayer {
                alpha = 1f - exit.value
                translationX = 32.dp.toPx() * exit.value
            },
    ) {
        TopBar(
            onBack = ::close,
            title = "Artikel",
            right = {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                    IconCircle(KarsaIcons.Flag) { reportArticle = true }
                    KarsaIconButtonShare { state.notify("Tautan artikel disalin") }
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
            if (article == null) {
                Gate(
                    status = lib.detailStatus[id] ?: LoadStatus.Loading,
                    onRetry = {
                        lib.loadArticle(id)
                        lib.loadComments(id)
                    },
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
                    KarsaCard {
                        EmptyState(
                            title = "Artikel tidak tersedia",
                            desc = "Tulisan ini mungkin sudah dihapus atau tidak lagi dapat dibaca.",
                            icon = { LucideIcon(KarsaIcons.FileText, modifier = Modifier.size(36.dp), tint = Brand600) },
                        )
                    }
                }
            } else {
                Rise {
                    Column(Modifier.padding(top = 4.dp)) {
                        Badge(article.tag, tone = BadgeTone.Brand)
                        Spacer(Modifier.height(12.dp))
                        Text(article.title, style = displayStyle(28, 800, 1.1f, -0.02f))
                        Spacer(Modifier.height(20.dp))
                        Row(
                            modifier = Modifier.clickable(enabled = article.authorId.isNotBlank()) {
                                if (article.authorId.isNotBlank()) {
                                    state.go(Route.AuthorProfile(article.authorId))
                                }
                            },
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
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
                                Text("$visibleCount", style = sansStyle(12, 700, 1.3f, color = Ink2))
                            }
                        }
                        Spacer(Modifier.height(16.dp))
                        when {
                            list.isEmpty() && (lib.commentStatus[id] ?: LoadStatus.Loading) == LoadStatus.Loading -> {
                                ListSkeleton(count = 2, lines = 1)
                            }
                            list.isEmpty() && (lib.commentStatus[id] ?: LoadStatus.Loading) == LoadStatus.Error -> {
                                KarsaCard {
                                    EmptyState(
                                        title = "Diskusi belum termuat",
                                        desc = "Periksa koneksi lalu coba lagi.",
                                        icon = { LucideIcon(KarsaIcons.MessageCircle, modifier = Modifier.size(36.dp), tint = Brand600) },
                                        action = {
                                            KarsaButton(
                                                text = "Coba lagi",
                                                onClick = { lib.loadComments(id) },
                                                variant = ButtonVariant.Soft,
                                            )
                                        },
                                    )
                                }
                            }
                            top.isEmpty() -> KarsaCard {
                                EmptyState(
                                    title = "Belum ada diskusi",
                                    desc = "Tulis komentar pertamamu, tanyakan atau tambahkan sudut pandang.",
                                    icon = { LucideIcon(KarsaIcons.MessageCircle, modifier = Modifier.size(36.dp), tint = Brand600) },
                                )
                            }
                            else -> Column(verticalArrangement = Arrangement.spacedBy(20.dp)) {
                                top.forEach { comment ->
                                    Column {
                                        CommentItem(
                                            comment = comment,
                                            articleAuthor = article.author,
                                            onReply = { replyTo = comment },
                                            onReport = { reportComment = comment },
                                            onDelete = { deleteTarget = comment },
                                        )
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
                                                    CommentItem(
                                                        comment = reply,
                                                        articleAuthor = article.author,
                                                        small = true,
                                                        onReply = { replyTo = comment },
                                                        onReport = { reportComment = reply },
                                                        onDelete = { deleteTarget = reply },
                                                    )
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
                val enabled = text.trim().isNotEmpty() && !sending
                Box(
                    modifier = Modifier
                        .size(48.dp)
                        .clip(CircleShape)
                        .then(if (enabled) Modifier.brandShadow(CircleShape) else Modifier)
                        .background(if (enabled || sending) Brand500 else Paper3)
                        .clickable(enabled = enabled, onClick = ::send),
                    contentAlignment = Alignment.Center,
                ) {
                    if (sending) {
                        Spinner(tint = Color.White, modifier = Modifier.size(18.dp))
                    } else {
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

    LibReportDialog(
        open = reportArticle || reportComment != null,
        title = if (reportComment != null) "Laporkan komentar" else "Laporkan artikel",
        onClose = {
            reportArticle = false
            reportComment = null
        },
        onSubmit = { reason, details ->
            val comment = reportComment
            try {
                lib.report(
                    articleId = if (comment == null) id else null,
                    commentId = comment?.id,
                    reason = reason,
                    details = details,
                )
                state.notify("Laporan terkirim untuk ditinjau.", ToastTone.Success)
                reportArticle = false
                reportComment = null
                true
            } catch (error: Exception) {
                state.notify(friendlyError(error), ToastTone.Error)
                false
            }
        },
    )

    KarsaDialog(
        open = deleteTarget != null,
        onClose = { deleteTarget = null },
        tone = DialogTone.Danger,
        title = "Hapus komentar?",
        desc = "Komentar tidak dapat dipulihkan. Balasan tetap tersimpan agar konteks diskusi tidak hilang.",
        confirmLabel = "Hapus",
        onConfirm = {
            val target = deleteTarget
            deleteTarget = null
            if (target != null) {
                scope.launch {
                    try {
                        lib.deleteComment(id, target.id)
                        state.notify("Komentar dihapus", ToastTone.Success)
                    } catch (error: Exception) {
                        state.notify(friendlyError(error), ToastTone.Error)
                    }
                }
            }
        },
    )
}

@Composable
private fun IconCircle(icon: List<String>, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .size(40.dp)
            .clip(CircleShape)
            .background(Color.White)
            .border(1.dp, Line, CircleShape)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        LucideIcon(icon, modifier = Modifier.size(18.dp), tint = Ink)
    }
}

@Composable
private fun KarsaIconButtonShare(onClick: () -> Unit) {
    IconCircle(KarsaIcons.Share2, onClick)
}

@Composable
private fun CommentItem(
    comment: Comment,
    articleAuthor: String,
    small: Boolean = false,
    onReply: () -> Unit,
    onReport: () -> Unit,
    onDelete: () -> Unit,
) {
    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        Avatar(name = comment.author, size = if (small) 32.dp else 38.dp)
        Column(Modifier.weight(1f)) {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                Text(if (comment.mine) "Kamu" else comment.author, style = sansStyle(14, 700, 1.3f))
                if (comment.author == articleAuthor && !comment.deleted) {
                    Badge("PENULIS", tone = BadgeTone.Brand)
                }
                Text(relTime(comment.ts), style = sansStyle(12, 400, 1.3f, color = Muted))
                Spacer(Modifier.weight(1f))
                if (!comment.deleted) {
                    PopMenu(
                        entries = buildList {
                            add(MenuEntry("Laporkan", KarsaIcons.Flag, onReport))
                            if (comment.mine) {
                                add(MenuEntry("Hapus komentar", KarsaIcons.Trash2, onDelete, danger = true))
                            }
                        },
                    )
                }
            }
            Spacer(Modifier.height(4.dp))
            Text(
                comment.text,
                style = sansStyle(if (small) 14 else 15, 400, 1.625f, color = if (comment.deleted) Muted else Ink2)
                    .copy(fontStyle = if (comment.deleted) FontStyle.Italic else FontStyle.Normal),
            )
            if (!comment.deleted && !small) {
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
}

private fun Modifier.drawTopBorder(): Modifier = drawBehind {
    drawLine(Line, start = androidx.compose.ui.geometry.Offset(0f, 0f), end = androidx.compose.ui.geometry.Offset(size.width, 0f), strokeWidth = 1.dp.toPx())
}

private fun Modifier.drawLeftBorder(): Modifier = drawBehind {
    drawLine(Line, start = androidx.compose.ui.geometry.Offset(0f, 0f), end = androidx.compose.ui.geometry.Offset(0f, size.height), strokeWidth = 2.dp.toPx())
}

