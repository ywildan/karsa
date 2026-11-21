package ac.id.untidar.karsa.screens

import android.content.ContentResolver
import android.net.Uri
import android.provider.OpenableColumns
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
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
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.TextRange
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import ac.id.untidar.karsa.AuthorStatus
import ac.id.untidar.karsa.LocalApp
import ac.id.untidar.karsa.Route
import ac.id.untidar.karsa.ToastTone
import ac.id.untidar.karsa.data.ArticleStatus
import ac.id.untidar.karsa.data.FAKULTAS
import ac.id.untidar.karsa.data.KELAS_OPTIONS
import ac.id.untidar.karsa.data.relTime
import ac.id.untidar.karsa.icons.KarsaIcons
import ac.id.untidar.karsa.icons.LucideIcon
import ac.id.untidar.karsa.lib.LibBootstrapDto
import ac.id.untidar.karsa.lib.toArticle
import ac.id.untidar.karsa.net.friendlyError
import ac.id.untidar.karsa.theme.Brand100
import ac.id.untidar.karsa.theme.Brand300
import ac.id.untidar.karsa.theme.Brand50
import ac.id.untidar.karsa.theme.Brand500
import ac.id.untidar.karsa.theme.Brand600
import ac.id.untidar.karsa.theme.Brand700
import ac.id.untidar.karsa.theme.Butter100
import ac.id.untidar.karsa.theme.Butter700
import ac.id.untidar.karsa.theme.Espresso
import ac.id.untidar.karsa.theme.Ink
import ac.id.untidar.karsa.theme.Ink2
import ac.id.untidar.karsa.theme.Leaf100
import ac.id.untidar.karsa.theme.Leaf500
import ac.id.untidar.karsa.theme.Leaf600
import ac.id.untidar.karsa.theme.Line
import ac.id.untidar.karsa.theme.Muted
import ac.id.untidar.karsa.theme.Paper
import ac.id.untidar.karsa.theme.Paper2
import ac.id.untidar.karsa.theme.Paper3
import ac.id.untidar.karsa.theme.Tide100
import ac.id.untidar.karsa.theme.Tide600
import ac.id.untidar.karsa.theme.displayStyle
import ac.id.untidar.karsa.theme.sansStyle
import ac.id.untidar.karsa.ui.Avatar
import ac.id.untidar.karsa.ui.Badge
import ac.id.untidar.karsa.ui.BadgeTone
import ac.id.untidar.karsa.ui.ButtonSize
import ac.id.untidar.karsa.ui.ButtonVariant
import ac.id.untidar.karsa.ui.DialogTone
import ac.id.untidar.karsa.ui.EmptyState
import ac.id.untidar.karsa.ui.Field
import ac.id.untidar.karsa.ui.Gate
import ac.id.untidar.karsa.ui.KarsaButton
import ac.id.untidar.karsa.ui.KarsaCard
import ac.id.untidar.karsa.ui.KarsaDialog
import ac.id.untidar.karsa.ui.KarsaTextField
import ac.id.untidar.karsa.ui.ListSkeleton
import ac.id.untidar.karsa.ui.LoadStatus
import ac.id.untidar.karsa.ui.Markdown
import ac.id.untidar.karsa.ui.MenuEntry
import ac.id.untidar.karsa.ui.PopMenu
import ac.id.untidar.karsa.ui.Segmented
import ac.id.untidar.karsa.ui.SegmentedOption
import ac.id.untidar.karsa.ui.Rise
import ac.id.untidar.karsa.ui.SelectField
import ac.id.untidar.karsa.ui.SheetOption
import ac.id.untidar.karsa.ui.TopBar
import ac.id.untidar.karsa.ui.brandShadow
import ac.id.untidar.karsa.ui.pressScale
import ac.id.untidar.karsa.ui.rememberLoad

private enum class EditorMode { Tulis, Pratinjau }

private class EditorTool(val icon: List<String>, val label: String, val run: () -> Unit)

private enum class MyPostsFilter(val label: String) { All("Semua"), Draft("Draf"), Published("Terbit"), Archived("Arsip") }

private data class PendingPostAction(val article: ac.id.untidar.karsa.data.Article, val action: String)

@Composable
fun EditorScreen(id: String? = null, prefillTitle: String? = null, prefillBody: String? = null) {
    val state = LocalApp.current
    val lib = state.lib
    val scope = rememberCoroutineScope()
    val existing = lib.vault.firstOrNull { it.id == id } ?: lib.details[id]
    var title by remember { mutableStateOf(TextFieldValue(existing?.title ?: prefillTitle ?: "")) }
    var body by remember { mutableStateOf(TextFieldValue(existing?.body ?: prefillBody ?: "")) }
    var mode by remember { mutableStateOf(EditorMode.Tulis) }
    var draftId by remember { mutableStateOf(id) }
    var savedTitle by remember { mutableStateOf(title.text) }
    var savedBody by remember { mutableStateOf(body.text) }
    var leave by remember { mutableStateOf(false) }
    var saving by remember { mutableStateOf(false) }
    val bodyFocus = remember { FocusRequester() }

    val dirty = title.text != savedTitle || body.text != savedBody
    val words = body.text.trim().let { if (it.isEmpty()) 0 else it.split(Regex("\\s+")).size }
    val canPublish = title.text.trim().length >= 5 && words >= 10
    val publishedExisting = existing?.status == ArticleStatus.Published || existing?.status == ArticleStatus.Archived

    fun wrap(before: String, after: String = before, placeholder: String = "teks") {
        val text = body.text
        val start = minOf(body.selection.start, body.selection.end)
        val end = maxOf(body.selection.start, body.selection.end)
        val selected = text.substring(start, end).ifEmpty { placeholder }
        val next = text.substring(0, start) + before + selected + after + text.substring(end)
        body = TextFieldValue(next, TextRange(start + before.length, start + before.length + selected.length))
        bodyFocus.requestFocus()
    }

    fun prefix(prefix: String) {
        val text = body.text
        val start = body.selection.start
        val lineStart = text.lastIndexOf('\n', start - 1) + 1
        val next = text.substring(0, lineStart) + prefix + text.substring(lineStart)
        body = TextFieldValue(next, TextRange(start + prefix.length))
        bodyFocus.requestFocus()
    }

    val tools = listOf(
        EditorTool(KarsaIcons.Heading1, "Judul besar (H1)") { prefix("# ") },
        EditorTool(KarsaIcons.Heading2, "Subjudul (H2)") { prefix("## ") },
        null,
        EditorTool(KarsaIcons.Bold, "Tebal") { wrap("**") },
        EditorTool(KarsaIcons.Italic, "Miring") { wrap("*") },
        EditorTool(KarsaIcons.Code, "Kode") { wrap("`", "`", "kode") },
        null,
        EditorTool(KarsaIcons.List, "Daftar") { prefix("- ") },
        EditorTool(KarsaIcons.Quote, "Kutipan") { prefix("> ") },
        EditorTool(KarsaIcons.Link2, "Tautan") { wrap("[", "](https://)", "teks tautan") },
    )

    fun persist(publish: Boolean) {
        if (saving) return
        if (title.text.isBlank() && body.text.isBlank()) {
            state.notify("Tulis judul atau isi dulu sebelum menyimpan draf", ToastTone.Error)
            return
        }
        saving = true
        scope.launch {
            try {
                val saved = lib.saveArticle(draftId, title.text.trim(), body.text)
                draftId = saved.id
                savedTitle = title.text
                savedBody = body.text
                if (publish) {
                    val article = lib.vaultAction(saved, "PUBLISH")
                    state.notify("Artikel terbit. Selamat!", ToastTone.Success)
                    state.replace(Route.Article(article.id))
                } else {
                    state.notify("Draf tersimpan di Tulisan saya", ToastTone.Success)
                }
                lib.loadVault()
            } catch (error: Exception) {
                state.notify(friendlyError(error), ToastTone.Error)
            } finally {
                saving = false
            }
        }
    }

    fun onBack() {
        if (saving) return
        if (dirty && (title.text.isNotEmpty() || body.text.isNotEmpty())) leave = true else state.back()
    }

    // System back/gesture must pass through the unsaved-changes dialog too.
    BackHandler { onBack() }

    Column(Modifier.fillMaxSize().background(Paper).imePadding()) {
        TopBar(
            onBack = ::onBack,
            title = when {
                existing == null -> "Tulis artikel"
                publishedExisting -> "Sunting artikel"
                else -> "Sunting draf"
            },
            subtitle = when {
                saving -> "Menyimpan…"
                dirty -> "Belum disimpan"
                draftId != null -> "Tersimpan"
                else -> "Draf baru"
            },
            right = {
                KarsaButton(
                    text = if (publishedExisting) "Simpan perubahan" else "Simpan draf",
                    onClick = { persist(false) },
                    variant = ButtonVariant.Soft,
                    size = ButtonSize.Sm,
                    loading = saving,
                    enabled = !saving,
                    leading = { LucideIcon(KarsaIcons.Save, modifier = Modifier.size(16.dp), tint = Brand700) },
                )
            },
        )
        Column(Modifier.padding(horizontal = 16.dp)) {
            Segmented(
                options = listOf(
                    SegmentedOption(EditorMode.Tulis, "Tulis") {
                        LucideIcon(KarsaIcons.PenLine, modifier = Modifier.size(16.dp), tint = Ink2)
                    },
                    SegmentedOption(EditorMode.Pratinjau, "Pratinjau") {
                        LucideIcon(KarsaIcons.FileText, modifier = Modifier.size(16.dp), tint = Ink2)
                    },
                ),
                value = mode,
                onChange = { mode = it },
            )
            Spacer(Modifier.height(12.dp))
            Row(
                modifier = Modifier
                    .horizontalScroll(rememberScrollState())
                    .alpha(if (mode == EditorMode.Tulis) 1f else 0.4f)
                    .clip(RoundedCornerShape(16.dp))
                    .background(Color.White)
                    .border(1.dp, Line, RoundedCornerShape(16.dp))
                    .padding(6.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                tools.forEach { tool ->
                    if (tool == null) {
                        Box(Modifier.padding(horizontal = 4.dp).width(1.dp).height(24.dp).background(Line))
                    } else {
                        Box(
                            modifier = Modifier
                                .size(40.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .clickable(enabled = mode == EditorMode.Tulis, onClick = tool.run),
                            contentAlignment = Alignment.Center,
                        ) {
                            LucideIcon(tool.icon, modifier = Modifier.size(19.dp), tint = Ink2)
                        }
                    }
                }
            }
            Spacer(Modifier.height(12.dp))
        }

        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp),
        ) {
            if (mode == EditorMode.Tulis) {
                BasicTextField(
                    value = title,
                    onValueChange = { title = it },
                    modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
                    textStyle = displayStyle(28, 800, 1.1f, -0.02f),
                    minLines = 2,
                    cursorBrush = SolidColor(Brand500),
                    decorationBox = { inner ->
                        Box {
                            if (title.text.isEmpty()) {
                                Text(
                                    "Judul artikel",
                                    style = displayStyle(28, 800, 1.1f, -0.02f, Muted.copy(alpha = 0.45f)),
                                )
                            }
                            inner()
                        }
                    },
                )
                Box(Modifier.fillMaxWidth().padding(vertical = 12.dp).height(1.dp).background(Line))
                BasicTextField(
                    value = body,
                    onValueChange = { body = it },
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(min = 280.dp)
                        .padding(vertical = 8.dp)
                        .focusRequester(bodyFocus),
                    textStyle = sansStyle(16, 400, 1.8f, color = Ink2),
                    minLines = 10,
                    cursorBrush = SolidColor(Brand500),
                    decorationBox = { inner ->
                        Box {
                            if (body.text.isEmpty()) {
                                Text(
                                    "Mulai menulis… Gunakan toolbar di atas untuk judul, tebal, kode, daftar, kutipan, dan tautan.",
                                    style = sansStyle(16, 400, 1.8f, color = Muted.copy(alpha = 0.6f)),
                                )
                            }
                            inner()
                        }
                    },
                )
            } else {
                Column(Modifier.padding(top = 4.dp)) {
                    if (title.text.isNotEmpty() || body.text.isNotEmpty()) {
                        Text(
                            title.text.ifBlank { "Tanpa judul" },
                            style = displayStyle(28, 800, 1.1f, -0.02f),
                        )
                        Box(Modifier.fillMaxWidth().padding(vertical = 12.dp).height(1.dp).background(Line))
                        Markdown(body.text.ifBlank { "_Belum ada isi._" })
                    } else {
                        EmptyState(
                            title = "Belum ada yang dipratinjau",
                            desc = "Tulis judul dan isi dulu, lalu kembali ke sini.",
                            icon = { LucideIcon(KarsaIcons.FileText, modifier = Modifier.size(36.dp), tint = Brand600) },
                        )
                    }
                }
            }
            Spacer(Modifier.height(16.dp))
        }

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(Paper)
                .topLine()
                .navigationBarsPadding()
                .padding(start = 16.dp, end = 16.dp, top = 12.dp, bottom = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(Modifier.weight(1f).padding(start = 4.dp)) {
                Text("$words kata", style = sansStyle(13, 700, 1.3f))
                Text("${maxOf(1, (words / 200f).toInt())} mnt baca", style = sansStyle(12, 400, 1.3f, color = Muted))
            }
            if (!publishedExisting) {
                KarsaButton(
                    text = if (saving) "Memproses…" else "Terbitkan",
                    onClick = { persist(true) },
                    enabled = canPublish && !saving,
                    loading = saving,
                    leading = { LucideIcon(KarsaIcons.Send, modifier = Modifier.size(16.dp), tint = Color.White) },
                )
            }
        }
    }

    KarsaDialog(
        open = leave,
        onClose = { leave = false },
        tone = DialogTone.Danger,
        title = "Buang perubahan?",
        desc = "Ada perubahan yang belum disimpan. Simpan sebagai draf agar tidak hilang.",
        confirmLabel = "Buang",
        cancelLabel = "Lanjut menulis",
        onConfirm = {
            leave = false
            state.back()
        },
    )
}

@Composable
fun MyPostsScreen() {
    val state = LocalApp.current
    val lib = state.lib
    val scope = rememberCoroutineScope()
    var seg by remember { mutableStateOf(MyPostsFilter.All) }
    var busy by remember { mutableStateOf<String?>(null) }
    var pending by remember { mutableStateOf<PendingPostAction?>(null) }
    val list = lib.vault.filter {
        when (seg) {
            MyPostsFilter.All -> true
            MyPostsFilter.Draft -> it.status == ArticleStatus.Draft
            MyPostsFilter.Published -> it.status == ArticleStatus.Published
            MyPostsFilter.Archived -> it.status == ArticleStatus.Archived
        }
    }

    LaunchedEffect(Unit) {
        if (lib.bootstrap == null) lib.loadBootstrap()
        lib.loadVault()
    }

    fun write() {
        if (lib.canWrite) {
            state.go(Route.Editor())
        } else {
            state.notify("Ajukan akses penulis terlebih dahulu", ToastTone.Error)
        }
    }

    fun execute(article: ac.id.untidar.karsa.data.Article, action: String) {
        if (busy != null) return
        busy = article.id
        scope.launch {
            try {
                when (action) {
                    "DELETE" -> {
                        lib.deleteDraft(article)
                        state.notify("Draf dihapus.", ToastTone.Success)
                    }
                    "ARCHIVE" -> {
                        lib.vaultAction(article, action)
                        state.notify("Artikel diarsipkan.", ToastTone.Success)
                    }
                    "RESTORE" -> {
                        lib.vaultAction(article, action)
                        state.notify("Artikel diterbitkan kembali.", ToastTone.Success)
                    }
                    else -> {
                        lib.vaultAction(article, action)
                        state.notify("Artikel berhasil diterbitkan.", ToastTone.Success)
                    }
                }
            } catch (error: Exception) {
                state.notify(friendlyError(error), ToastTone.Error)
            } finally {
                busy = null
            }
        }
    }

    fun ask(article: ac.id.untidar.karsa.data.Article, action: String) {
        if (action == "EDIT") {
            state.go(Route.Editor(id = article.id))
        } else {
            pending = PendingPostAction(article, action)
        }
    }

    Column(Modifier.fillMaxSize().background(Paper)) {
        TopBar(
            onBack = { state.back() },
            title = "Tulisan saya",
            subtitle = "${lib.vault.size} tulisan",
            right = {
                if (lib.canWrite) {
                    KarsaButton(
                        text = "Tulis",
                        onClick = ::write,
                        size = ButtonSize.Sm,
                        leading = { LucideIcon(KarsaIcons.PenLine, modifier = Modifier.size(16.dp), tint = Color.White) },
                    )
                }
            },
        )
        if (lib.bootstrapStatus == LoadStatus.Loading && lib.vault.isEmpty()) {
            Column(Modifier.padding(horizontal = 20.dp)) {
                ListSkeleton(count = 2, lines = 1)
            }
            return@Column
        }
        if (!lib.canWrite) {
            Column(Modifier.padding(20.dp)) {
                KarsaCard {
                    EmptyState(
                        title = "Akses menulis belum aktif",
                        desc = "Ajukan akses penulis untuk mulai membuat draf dan menerbitkan tulisan.",
                        icon = { LucideIcon(KarsaIcons.Feather, modifier = Modifier.size(36.dp), tint = Brand600) },
                        action = {
                            KarsaButton(
                                text = "Ajukan akses penulis",
                                onClick = { state.go(Route.Author) },
                            )
                        },
                    )
                }
            }
            return@Column
        }
        Column(Modifier.padding(horizontal = 20.dp)) {
            Segmented(
                options = MyPostsFilter.entries.map { SegmentedOption(it, it.label) },
                value = seg,
                onChange = { seg = it },
            )
            Spacer(Modifier.height(12.dp))
        }
        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp)
                .padding(bottom = 24.dp),
        ) {
            when {
                lib.vaultStatus == LoadStatus.Loading && lib.vault.isEmpty() -> ListSkeleton(count = 2, lines = 1)
                lib.vaultStatus == LoadStatus.Error && lib.vault.isEmpty() -> KarsaCard {
                    EmptyState(
                        title = "Tulisan belum termuat",
                        desc = "Periksa koneksi lalu coba lagi.",
                        icon = { LucideIcon(KarsaIcons.TriangleAlert, modifier = Modifier.size(36.dp), tint = Brand600) },
                        action = {
                            KarsaButton(
                                text = "Coba lagi",
                                onClick = { lib.loadVault() },
                                variant = ButtonVariant.Soft,
                            )
                        },
                    )
                }
                list.isEmpty() -> KarsaCard {
                    val (title, desc) = when (seg) {
                        MyPostsFilter.All -> "Belum ada tulisan" to "Catatan kuliah, ringkasan, atau tips belajarmu layak dibaca teman-teman."
                        MyPostsFilter.Draft -> "Belum ada draf" to "Mulai menulis dengan tombol Tulis."
                        MyPostsFilter.Published -> "Belum ada artikel terbit" to "Terbitkan drafmu untuk berbagi dengan teman satu prodi."
                        MyPostsFilter.Archived -> "Arsip masih kosong" to "Artikel yang kamu arsipkan tersimpan di sini."
                    }
                    EmptyState(
                        title = title,
                        desc = desc,
                        icon = { LucideIcon(KarsaIcons.FileText, modifier = Modifier.size(36.dp), tint = Brand600) },
                        action = {
                            KarsaButton(
                                text = "Mulai menulis",
                                onClick = ::write,
                                leading = { LucideIcon(KarsaIcons.PenLine, modifier = Modifier.size(16.dp), tint = Color.White) },
                            )
                        },
                    )
                }
                else -> Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    list.forEach { article ->
                        Rise {
                            val interaction = remember { androidx.compose.foundation.interaction.MutableInteractionSource() }
                            val draft = article.status == ArticleStatus.Draft
                            val archived = article.status == ArticleStatus.Archived
                            KarsaCard(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .pressScale(interaction, 0.99f)
                                    .clickable(
                                        interactionSource = interaction,
                                        indication = androidx.compose.foundation.LocalIndication.current,
                                    ) {
                                        when {
                                            busy != null -> Unit
                                            draft -> state.go(Route.Editor(id = article.id))
                                            archived -> state.notify("Terbitkan kembali untuk membuka artikel ini.")
                                            else -> state.go(Route.Article(article.id))
                                        }
                                    },
                            ) {
                                Column(Modifier.padding(16.dp)) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically,
                                    ) {
                                        Badge(
                                            when {
                                                draft -> "DRAF"
                                                archived -> "DIARSIPKAN"
                                                else -> "TERBIT"
                                            },
                                            tone = when {
                                                draft -> BadgeTone.Butter
                                                archived -> BadgeTone.Neutral
                                                else -> BadgeTone.Leaf
                                            },
                                        )
                                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                                            Text(relTime(article.updatedAt), style = sansStyle(12, 400, 1.3f, color = Muted))
                                            if (busy == article.id) {
                                                ac.id.untidar.karsa.ui.Spinner(
                                                    tint = Brand600,
                                                    modifier = Modifier.size(18.dp),
                                                )
                                            } else {
                                                PopMenu(
                                                    entries = buildList {
                                                        if (!archived) {
                                                            add(MenuEntry("Edit tulisan", KarsaIcons.Pencil, { ask(article, "EDIT") }))
                                                        }
                                                        when {
                                                            draft -> {
                                                                add(MenuEntry("Terbitkan", KarsaIcons.Send, { ask(article, "PUBLISH") }))
                                                                add(MenuEntry("Hapus draf", KarsaIcons.Trash2, { ask(article, "DELETE") }, danger = true))
                                                            }
                                                            archived -> add(MenuEntry("Terbitkan kembali", KarsaIcons.Upload, { ask(article, "RESTORE") }))
                                                            else -> add(MenuEntry("Arsipkan", KarsaIcons.FileUp, { ask(article, "ARCHIVE") }))
                                                        }
                                                    },
                                                )
                                            }
                                        }
                                    }
                                    Spacer(Modifier.height(12.dp))
                                    Text(article.title, style = displayStyle(18, 700, 1.25f))
                                    Spacer(Modifier.height(6.dp))
                                    Text(
                                        when {
                                            draft -> "Ketuk untuk melanjutkan menulis"
                                            archived -> "Diarsipkan · bisa diterbitkan kembali"
                                            else -> "${article.readers} pembaca · ${article.commentsCount} komentar"
                                        },
                                        style = sansStyle(12, 600, 1.4f, color = Muted),
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    val pendingAction = pending
    KarsaDialog(
        open = pendingAction != null,
        onClose = { pending = null },
        tone = if (pendingAction?.action == "DELETE") DialogTone.Danger else DialogTone.Primary,
        title = when (pendingAction?.action) {
            "DELETE" -> "Hapus draf?"
            "ARCHIVE" -> "Arsipkan artikel?"
            "RESTORE" -> "Terbitkan kembali?"
            "PUBLISH" -> "Terbitkan artikel?"
            else -> ""
        },
        desc = when (pendingAction?.action) {
            "DELETE" -> "Draf ini akan dihapus permanen."
            "ARCHIVE" -> "Artikel tidak lagi muncul di beranda. Kamu bisa menerbitkannya kembali."
            "RESTORE" -> "Artikel akan dapat dibaca lagi oleh seluruh mahasiswa di prodimu."
            "PUBLISH" -> "Artikel akan dapat dibaca oleh seluruh mahasiswa di prodimu."
            else -> null
        },
        confirmLabel = if (pendingAction?.action == "DELETE") "Hapus" else "Lanjutkan",
        onConfirm = {
            val action = pending
            pending = null
            if (action != null) execute(action.article, action.action)
        },
    )
}

private data class PickedFile(val name: String, val size: Long)

@Composable
fun ImportScreen() {
    val state = LocalApp.current
    val lib = state.lib
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var picked by remember { mutableStateOf<PickedFile?>(null) }
    var pickedUri by remember { mutableStateOf<Uri?>(null) }
    var busy by remember { mutableStateOf(false) }

    val launcher = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri != null) {
            picked = context.contentResolver.pickedMeta(uri)
            pickedUri = uri
        }
    }

    fun runImport() {
        val file = picked ?: return
        val uri = pickedUri ?: return
        if (file.size > 5L * 1024 * 1024) {
            state.notify("Ukuran dokumen melebihi 5 MB.", ToastTone.Error)
            return
        }
        busy = true
        scope.launch {
            try {
                val bytes = withContext(Dispatchers.IO) {
                    context.contentResolver.openInputStream(uri)?.use { it.readBytes() }
                } ?: throw IllegalStateException("Berkas tidak dapat dibaca.")
                val result = lib.importDocx(file.name, bytes)
                val article = result.article.toArticle(lib.uid, fullBody = true)
                lib.loadVault()
                state.notify(
                    if (result.droppedImages > 0) {
                        "Dokumen menjadi draf. ${result.droppedImages} gambar belum ikut tersimpan."
                    } else {
                        "Dokumen berhasil diimpor sebagai draf."
                    },
                    ToastTone.Success,
                )
                state.replace(
                    Route.Editor(
                        id = article.id,
                        prefillTitle = article.title,
                        prefillBody = article.body,
                    ),
                )
            } catch (error: Exception) {
                state.notify(friendlyError(error), ToastTone.Error)
            } finally {
                busy = false
            }
        }
    }

    Column(Modifier.fillMaxSize().background(Paper)) {
        TopBar(onBack = { state.back() }, title = "Impor .docx", subtitle = "Ubah dokumen Word menjadi artikel")
        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp)
                .padding(top = 8.dp, bottom = 32.dp),
        ) {
            val hasFile = picked != null
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(32.dp))
                    .background(if (hasFile) Leaf100.copy(alpha = 0.5f) else Brand50)
                    .border(2.dp, if (hasFile) Leaf500.copy(alpha = 0.5f) else Brand300, RoundedCornerShape(32.dp))
                    .clickable { launcher.launch(arrayOf("application/vnd.openxmlformats-officedocument.wordprocessingml.document")) }
                    .padding(horizontal = 24.dp, vertical = 40.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Box(
                    modifier = Modifier
                        .size(64.dp)
                        .clip(RoundedCornerShape(24.dp))
                        .then(if (hasFile) Modifier else Modifier.brandShadow(RoundedCornerShape(24.dp)))
                        .background(if (hasFile) Leaf500 else Brand500),
                    contentAlignment = Alignment.Center,
                ) {
                    LucideIcon(
                        if (hasFile) KarsaIcons.FileText else KarsaIcons.Upload,
                        modifier = Modifier.size(32.dp),
                        tint = Color.White,
                    )
                }
                Spacer(Modifier.height(16.dp))
                if (picked != null) {
                    Text(
                        picked!!.name,
                        style = displayStyle(18, 700, 1.25f),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Text(
                        "${String.format(java.util.Locale.US, "%.1f", picked!!.size / 1024.0)} KB · ketuk untuk ganti berkas",
                        style = sansStyle(14, 400, 1.5f, color = Muted),
                    )
                } else {
                    Text("Pilih berkas .docx", style = displayStyle(20, 700, 1.25f))
                    Text("Ukuran maksimal 5 MB", style = sansStyle(14, 400, 1.5f, color = Muted))
                }
            }
            Spacer(Modifier.height(20.dp))
            KarsaCard {
                Column(Modifier.padding(20.dp)) {
                    Text("Yang perlu kamu tahu", style = displayStyle(16, 700, 1.25f))
                    Spacer(Modifier.height(12.dp))
                    listOf(
                        "Baris pertama dipakai sebagai judul artikel.",
                        "Heading, tebal, miring, dan daftar dipertahankan.",
                        "Gambar dan tabel belum didukung dan akan dilewati.",
                    ).forEach { line ->
                        Row(Modifier.padding(vertical = 5.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            Box(Modifier.padding(top = 9.dp).size(6.dp).background(Brand500, CircleShape))
                            Text(line, style = sansStyle(14, 400, 1.625f, color = Ink2))
                        }
                    }
                }
            }
            Spacer(Modifier.height(20.dp))
            KarsaButton(
                text = "Impor ke editor",
                onClick = ::runImport,
                size = ButtonSize.Lg,
                full = true,
                enabled = picked != null,
                loading = busy,
                leading = { LucideIcon(KarsaIcons.FileUp, modifier = Modifier.size(20.dp), tint = Color.White) },
            )
        }
    }
}

private fun Modifier.topLine(): Modifier = drawBehind {
    drawLine(
        Line,
        start = androidx.compose.ui.geometry.Offset(0f, 0f),
        end = androidx.compose.ui.geometry.Offset(size.width, 0f),
        strokeWidth = 1.dp.toPx(),
    )
}

private fun ContentResolver.pickedMeta(uri: Uri): PickedFile {
    var name = "dokumen.docx"
    var size = 0L
    query(uri, null, null, null, null)?.use { cursor ->
        if (cursor.moveToFirst()) {
            val nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
            if (nameIndex >= 0 && !cursor.isNull(nameIndex)) name = cursor.getString(nameIndex)
            val sizeIndex = cursor.getColumnIndex(OpenableColumns.SIZE)
            if (sizeIndex >= 0 && !cursor.isNull(sizeIndex)) size = cursor.getLong(sizeIndex)
        }
    }
    return PickedFile(name, size)
}

@Composable
fun AuthorScreen() {
    val state = LocalApp.current
    val lib = state.lib

    LaunchedEffect(Unit) { if (lib.bootstrap == null) lib.loadBootstrap() }

    Column(Modifier.fillMaxSize().background(Paper)) {
        TopBar(
            onBack = { state.back() },
            title = "Akses menulis",
            subtitle = when {
                lib.profile == null -> "Lengkapi profil Karsa Lib"
                lib.canWrite -> "Penulis aktif"
                lib.requestStatus == "PENDING" -> "Menunggu tinjauan"
                else -> "Ajukan akses penulis"
            },
        )
        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp)
                .padding(top = 8.dp, bottom = 24.dp),
        ) {
            when (lib.bootstrapStatus) {
                LoadStatus.Loading -> ListSkeleton(count = 2, lines = 2)
                LoadStatus.Error -> KarsaCard {
                    EmptyState(
                        title = "Data Karsa Lib belum termuat",
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
                LoadStatus.Ready -> when {
                    lib.profile == null -> ProfileSetupContent(onSaved = { state.back() })
                    lib.canWrite -> WriterHub()
                    else -> AuthorRequestContent()
                }
            }
        }
    }
}

@Composable
fun ProfileSetupContent(onSaved: () -> Unit) {
    val state = LocalApp.current
    val lib = state.lib
    val bootstrap = lib.bootstrap ?: return
    val scope = rememberCoroutineScope()
    var nama by remember { mutableStateOf(lib.profile?.displayName ?: state.displayName) }
    var facultyId by remember { mutableStateOf(lib.profile?.facultyId ?: "") }
    var programId by remember { mutableStateOf(lib.profile?.programId ?: "") }
    var classId by remember { mutableStateOf(lib.profile?.classId ?: "") }
    var confirm by remember { mutableStateOf(false) }
    var saving by remember { mutableStateOf(false) }
    val programs = bootstrap.programs.filter { it.facultyId == facultyId }
    val classes = bootstrap.classes.filter { it.programId == programId }
    val facultyName = bootstrap.faculties.firstOrNull { it.id == facultyId }?.name ?: ""
    val programName = bootstrap.programs.firstOrNull { it.id == programId }?.name ?: ""
    val valid = nama.trim().length >= 2 && facultyId.isNotBlank() && programId.isNotBlank()

    fun save() {
        if (!valid || saving) return
        saving = true
        scope.launch {
            try {
                lib.createProfile(nama.trim(), facultyId, programId, classId.ifBlank { null })
                state.notify("Profil Karsa Lib tersimpan", ToastTone.Success)
                confirm = false
                onSaved()
            } catch (error: Exception) {
                state.notify(friendlyError(error), ToastTone.Error)
            } finally {
                saving = false
            }
        }
    }

    KarsaCard {
        Column(Modifier.padding(20.dp)) {
            Row(horizontalArrangement = Arrangement.spacedBy(14.dp), verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier.size(44.dp).clip(RoundedCornerShape(16.dp)).background(Brand100),
                    contentAlignment = Alignment.Center,
                ) {
                    LucideIcon(KarsaIcons.BookOpen, modifier = Modifier.size(22.dp), tint = Brand600)
                }
                Column(Modifier.weight(1f)) {
                    Text("Siapkan ruang belajarmu", style = displayStyle(18, 700, 1.2f))
                    Text(
                        "Pilih identitas program studi agar feed menampilkan artikel yang tepat.",
                        style = sansStyle(13, 400, 1.5f, color = Muted),
                    )
                }
            }
            Spacer(Modifier.height(20.dp))
            Field(label = "Nama yang ditampilkan") {
                KarsaTextField(
                    value = nama,
                    onValueChange = { if (it.length <= 80) nama = it },
                    placeholder = "Nama yang tampil di artikel",
                )
            }
            Spacer(Modifier.height(18.dp))
            SelectField(
                value = facultyId,
                options = bootstrap.faculties.map { SheetOption(it.id, it.name) },
                onChange = {
                    facultyId = it
                    if (programId !in bootstrap.programs.filter { p -> p.facultyId == it }.map { p -> p.id }) {
                        programId = ""
                    }
                    classId = ""
                },
                label = "Fakultas",
                placeholder = "Pilih fakultas",
                sheetTitle = "Pilih fakultas",
            )
            Spacer(Modifier.height(18.dp))
            SelectField(
                value = programId,
                options = programs.map { SheetOption(it.id, it.name) },
                onChange = {
                    programId = it
                    classId = ""
                },
                label = "Program studi",
                placeholder = if (facultyId.isNotBlank()) "Pilih program studi" else "Pilih fakultas dulu",
                disabled = facultyId.isBlank(),
                sheetTitle = "Pilih program studi",
            )
            Spacer(Modifier.height(18.dp))
            SelectField(
                value = classId,
                options = listOf(SheetOption("", "Tidak memilih kelas")) + classes.map {
                    SheetOption(it.id, lib.classLabel(it))
                },
                onChange = { classId = it },
                label = "Kelas",
                placeholder = if (programId.isNotBlank()) "Pilih kelas" else "Pilih program studi dulu",
                disabled = programId.isBlank(),
                optional = true,
                sheetTitle = "Pilih kelas",
            )
            Spacer(Modifier.height(16.dp))
            Text(
                if (bootstrap.faculties.isEmpty() || bootstrap.programs.isEmpty()) {
                    "Pilihan fakultas atau prodi belum tersedia. Admin Karsa perlu mengatur data tersebut lebih dulu."
                } else {
                    "Fakultas dan program studi tidak dapat diubah setelah disimpan. Pilihan prodi menentukan artikel yang bisa kamu lihat."
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(16.dp))
                    .background(Paper2)
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                style = sansStyle(12, 400, 1.55f, color = Ink2),
            )
            Spacer(Modifier.height(20.dp))
            KarsaButton(
                text = "Simpan profil",
                onClick = { confirm = true },
                size = ButtonSize.Lg,
                full = true,
                enabled = valid && !saving,
                loading = saving,
            )
        }
    }

    KarsaDialog(
        open = confirm,
        onClose = { confirm = false },
        title = "Identitasmu sudah benar?",
        desc = "$nama\n$facultyName\n$programName\n\nFakultas dan prodi tidak dapat diganti setelah disimpan.",
        confirmLabel = "Ya, simpan",
        cancelLabel = "Periksa kembali",
        onConfirm = { save() },
    )
}

@Composable
private fun WriterHub() {
    val state = LocalApp.current
    val lib = state.lib
    val status = state.authorStatus
    val (tile, tint) = when (status) {
        AuthorStatus.Approved -> Leaf100 to Leaf600
        AuthorStatus.Pending -> Tide100 to Tide600
        AuthorStatus.None -> Butter100 to Butter700
    }

    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        KarsaCard {
            Row(Modifier.padding(18.dp), horizontalArrangement = Arrangement.spacedBy(16.dp), verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier.size(48.dp).clip(RoundedCornerShape(16.dp)).background(tile),
                    contentAlignment = Alignment.Center,
                ) {
                    LucideIcon(KarsaIcons.ShieldCheck, modifier = Modifier.size(24.dp), tint = tint)
                }
                Column(Modifier.weight(1f)) {
                    Text("Akses menulis aktif", style = sansStyle(12, 600, 1.4f, color = Muted))
                    Text(state.authorProfile.nama, style = displayStyle(18, 700, 1.25f))
                    val meta = listOf(state.authorProfile.prodi, state.authorProfile.kelas)
                        .filter { it.isNotBlank() }
                        .joinToString(" · ")
                    if (meta.isNotBlank()) {
                        Text(meta, style = sansStyle(12, 400, 1.4f, color = Muted))
                    }
                }
            }
        }

        KarsaButton(
            text = "Tulis artikel",
            onClick = { state.go(Route.Editor()) },
            size = ButtonSize.Lg,
            full = true,
            leading = { LucideIcon(KarsaIcons.PenLine, modifier = Modifier.size(18.dp), tint = Color.White) },
        )
        KarsaButton(
            text = "Tulisan saya",
            onClick = { state.go(Route.MyPosts) },
            variant = ButtonVariant.Soft,
            size = ButtonSize.Lg,
            full = true,
            leading = { LucideIcon(KarsaIcons.FileText, modifier = Modifier.size(18.dp), tint = Brand700) },
        )
        if (lib.uid.isNotBlank()) {
            KarsaButton(
                text = "Lihat profil penulis",
                onClick = { state.go(Route.AuthorProfile(lib.uid)) },
                variant = ButtonVariant.Outline,
                size = ButtonSize.Lg,
                full = true,
                leading = { LucideIcon(KarsaIcons.UserRound, modifier = Modifier.size(18.dp), tint = Ink) },
            )
        }
    }
}

@Composable
private fun AuthorRequestContent() {
    val state = LocalApp.current
    val lib = state.lib
    val scope = rememberCoroutineScope()
    val pending = lib.requestStatus == "PENDING"

    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        KarsaCard {
            Row(Modifier.padding(16.dp), horizontalArrangement = Arrangement.spacedBy(14.dp), verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier.size(44.dp).clip(RoundedCornerShape(16.dp))
                        .background(if (pending) Tide100 else Butter100),
                    contentAlignment = Alignment.Center,
                ) {
                    LucideIcon(
                        if (pending) KarsaIcons.Clock else KarsaIcons.Feather,
                        modifier = Modifier.size(22.dp),
                        tint = if (pending) Tide600 else Butter700,
                    )
                }
                Column(Modifier.weight(1f)) {
                    Text(
                        if (pending) "Permohonan sedang ditinjau" else "Bagikan ilmu untuk satu prodi",
                        style = displayStyle(17, 700, 1.25f),
                    )
                    Text(
                        if (pending) {
                            "Kamu tetap bisa membaca dan berdiskusi. Tarik layar untuk memperbarui status."
                        } else {
                            "Admin akan meninjau permohonanmu sebelum akses menulis aktif."
                        },
                        style = sansStyle(13, 400, 1.5f, color = Muted),
                    )
                }
            }
        }

        if (lib.decisionNote != null) {
            Text(
                lib.decisionNote!!,
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(16.dp))
                    .background(Butter100)
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                style = sansStyle(13, 500, 1.55f, color = Butter700),
            )
        }

        if (!pending) {
            var motivation by remember { mutableStateOf("") }
            var topics by remember { mutableStateOf("") }
            var instagram by remember { mutableStateOf("") }
            var tiktok by remember { mutableStateOf("") }
            var guidelines by remember { mutableStateOf(false) }
            var saving by remember { mutableStateOf(false) }
            val usernamePattern = Regex("^[a-zA-Z0-9._]{1,30}$")
            val instagramValid = instagram.isBlank() || usernamePattern.matches(instagram.trim().removePrefix("@"))
            val tiktokValid = tiktok.isBlank() || usernamePattern.matches(tiktok.trim().removePrefix("@"))
            val valid = motivation.trim().length >= 20 &&
                topics.trim().length >= 3 &&
                guidelines &&
                instagramValid &&
                tiktokValid

            fun submit() {
                if (!valid || saving) return
                saving = true
                scope.launch {
                    try {
                        lib.requestAuthor(
                            motivation = motivation.trim(),
                            topics = topics.trim(),
                            instagram = instagram.trim().removePrefix("@").ifBlank { null },
                            tiktok = tiktok.trim().removePrefix("@").ifBlank { null },
                        )
                        state.notify("Permohonan terkirim untuk ditinjau.", ToastTone.Success)
                        state.back()
                    } catch (error: Exception) {
                        state.notify(friendlyError(error), ToastTone.Error)
                    } finally {
                        saving = false
                    }
                }
            }

            KarsaCard {
                Column(Modifier.padding(20.dp)) {
                    Field(label = "Mengapa ingin menjadi penulis?") {
                        KarsaTextField(
                            value = motivation,
                            onValueChange = { if (it.length <= 2000) motivation = it },
                            placeholder = "Ceritakan alasan dan rencanamu menulis",
                            singleLine = false,
                            minHeight = 120.dp,
                        )
                    }
                    Spacer(Modifier.height(18.dp))
                    Field(label = "Topik yang ingin ditulis") {
                        KarsaTextField(
                            value = topics,
                            onValueChange = { if (it.length <= 500) topics = it },
                            placeholder = "Misalnya: catatan kuliah, tutorial, pengalaman organisasi",
                            singleLine = false,
                            minHeight = 88.dp,
                        )
                    }
                    Spacer(Modifier.height(18.dp))
                    Field(label = "Username Instagram (opsional)") {
                        KarsaTextField(
                            value = instagram,
                            onValueChange = { if (it.length <= 31) instagram = it },
                            placeholder = "@username",
                        )
                    }
                    Spacer(Modifier.height(18.dp))
                    Field(label = "Username TikTok (opsional)") {
                        KarsaTextField(
                            value = tiktok,
                            onValueChange = { if (it.length <= 31) tiktok = it },
                            placeholder = "@username",
                        )
                    }
                    if (!instagramValid || !tiktokValid) {
                        Spacer(Modifier.height(8.dp))
                        Text(
                            "Isi username dengan huruf, angka, titik, atau garis bawah.",
                            style = sansStyle(12, 500, 1.4f, color = ac.id.untidar.karsa.theme.Danger500),
                        )
                    }
                    Spacer(Modifier.height(18.dp))
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(16.dp))
                            .background(Paper2)
                            .clickable { guidelines = !guidelines }
                            .padding(14.dp),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        verticalAlignment = Alignment.Top,
                    ) {
                        Box(
                            modifier = Modifier
                                .size(22.dp)
                                .clip(RoundedCornerShape(7.dp))
                                .background(if (guidelines) Brand500 else Color.White)
                                .border(1.dp, if (guidelines) Brand500 else Line, RoundedCornerShape(7.dp)),
                            contentAlignment = Alignment.Center,
                        ) {
                            if (guidelines) {
                                LucideIcon(KarsaIcons.Check, modifier = Modifier.size(14.dp), tint = Color.White)
                            }
                        }
                        Text(
                            "Saya akan mengikuti panduan komunitas Karsa Lib.",
                            style = sansStyle(13, 500, 1.5f, color = Ink2),
                        )
                    }
                    Spacer(Modifier.height(20.dp))
                    KarsaButton(
                        text = "Kirim permohonan",
                        onClick = ::submit,
                        size = ButtonSize.Lg,
                        full = true,
                        enabled = valid && !saving,
                        loading = saving,
                        leading = { LucideIcon(KarsaIcons.Send, modifier = Modifier.size(18.dp), tint = Color.White) },
                    )
                }
            }
        }
    }
}
