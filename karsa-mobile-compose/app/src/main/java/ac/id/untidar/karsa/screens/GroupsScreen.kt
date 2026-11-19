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
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
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
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import ac.id.untidar.karsa.LocalApp
import ac.id.untidar.karsa.Role
import ac.id.untidar.karsa.Route
import ac.id.untidar.karsa.ToastTone
import ac.id.untidar.karsa.data.COURSES
import ac.id.untidar.karsa.data.Course
import ac.id.untidar.karsa.data.Msg
import ac.id.untidar.karsa.data.UNREAD
import ac.id.untidar.karsa.data.chatStamp
import ac.id.untidar.karsa.data.courseById
import ac.id.untidar.karsa.data.dayKey
import ac.id.untidar.karsa.data.dayLabel
import ac.id.untidar.karsa.data.fmtTime
import ac.id.untidar.karsa.data.isPjOf
import ac.id.untidar.karsa.data.pjLabel
import ac.id.untidar.karsa.data.studentById
import ac.id.untidar.karsa.icons.KarsaIcons
import ac.id.untidar.karsa.icons.LucideIcon
import ac.id.untidar.karsa.theme.Brand100
import ac.id.untidar.karsa.theme.Brand300
import ac.id.untidar.karsa.theme.Brand500
import ac.id.untidar.karsa.theme.Brand600
import ac.id.untidar.karsa.theme.Brand700
import ac.id.untidar.karsa.theme.Butter700
import ac.id.untidar.karsa.theme.Danger100
import ac.id.untidar.karsa.theme.Danger500
import ac.id.untidar.karsa.theme.Espresso
import ac.id.untidar.karsa.theme.Ink
import ac.id.untidar.karsa.theme.Ink2
import ac.id.untidar.karsa.theme.Leaf600
import ac.id.untidar.karsa.theme.Line
import ac.id.untidar.karsa.theme.Muted
import ac.id.untidar.karsa.theme.Paper
import ac.id.untidar.karsa.theme.Paper2
import ac.id.untidar.karsa.theme.Paper3
import ac.id.untidar.karsa.theme.Plum600
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
import ac.id.untidar.karsa.ui.DialogTone
import ac.id.untidar.karsa.ui.EmptyState
import ac.id.untidar.karsa.ui.EyebrowText
import ac.id.untidar.karsa.ui.Gate
import ac.id.untidar.karsa.ui.KarsaButton
import ac.id.untidar.karsa.ui.KarsaCard
import ac.id.untidar.karsa.ui.KarsaDialog
import ac.id.untidar.karsa.ui.KarsaSheet
import ac.id.untidar.karsa.ui.ListSkeleton
import ac.id.untidar.karsa.ui.LoadStatus
import ac.id.untidar.karsa.ui.PageHeader
import ac.id.untidar.karsa.ui.Rise
import ac.id.untidar.karsa.ui.SearchField
import ac.id.untidar.karsa.ui.Skeleton
import ac.id.untidar.karsa.ui.Tone
import ac.id.untidar.karsa.ui.TopBar
import ac.id.untidar.karsa.ui.rememberLoad
import ac.id.untidar.karsa.ui.toneFor

private fun senderName(msg: Msg, course: Course, role: Role): String = when {
    msg.from == "me" -> "Kamu"
    msg.from == "pj" -> if (isPjOf(course, role)) "Kamu" else course.pjOther
    else -> studentById(msg.from).name
}

private fun isMine(msg: Msg, course: Course, role: Role): Boolean =
    msg.from == "me" || (msg.from == "pj" && isPjOf(course, role))

private fun nameTone(name: String): Color = when (toneFor(name)) {
    Tone.Brand -> Brand600
    Tone.Butter -> Butter700
    Tone.Leaf -> Leaf600
    Tone.Tide -> Tide600
    Tone.Plum -> Plum600
    Tone.Clay -> Ink2
}

private data class Preview(val text: String, val ts: Long, val italic: Boolean = false)

@Composable
fun GroupList() {
    val state = LocalApp.current
    val load = rememberLoad()
    var q by remember { mutableStateOf("") }

    val list = COURSES.filter { course ->
        q.isBlank() || "${course.name} ${course.kelas}".lowercase().contains(q.trim().lowercase())
    }

    fun preview(course: Course): Preview {
        val last = state.chats[course.id].orEmpty().lastOrNull() ?: return Preview("Belum ada pesan", 0)
        if (last.deleted) return Preview("Pesan ini telah dihapus", last.ts, italic = true)
        if (last.hidden || last.from in state.blocked) return Preview("Pesan disembunyikan", last.ts, italic = true)
        val who = senderName(last, course, state.role)
        return Preview("${if (who == "Kamu") "Kamu" else who.split(" ").first()}: ${last.text}", last.ts)
    }

    Column(Modifier.fillMaxSize().background(Paper)) {
        PageHeader(
            title = "Grup kelas",
            eyebrow = { EyebrowText("Percakapan") },
            subtitle = "Percakapan kelas tetap dekat.",
        )
        Column(Modifier.padding(horizontal = 20.dp).padding(bottom = 16.dp)) {
            SearchField(value = q, onChange = { q = it }, placeholder = "Cari matkul atau kelas")
        }
        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp)
                .padding(bottom = 140.dp),
        ) {
            Gate(status = load.status, onRetry = load.retry, skeleton = { ListSkeleton(count = 4, lines = 1) }) {
                if (list.isEmpty()) {
                    KarsaCard {
                        if (COURSES.isEmpty()) {
                            EmptyState(
                                title = "Belum bergabung ke grup",
                                desc = "Grup otomatis muncul setelah kamu terdaftar di mata kuliah semester ini.",
                                icon = { LucideIcon(KarsaIcons.MessagesSquare, modifier = Modifier.size(36.dp), tint = Brand600) },
                            )
                        } else {
                            EmptyState(
                                title = "Grup tidak ditemukan",
                                desc = "Tidak ada matkul atau kelas bernama “$q”.",
                                icon = { LucideIcon(KarsaIcons.SearchX, modifier = Modifier.size(36.dp), tint = Brand600) },
                                action = {
                                    KarsaButton("Hapus pencarian", onClick = { q = "" }, variant = ButtonVariant.Soft)
                                },
                            )
                        }
                    }
                } else {
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        list.forEachIndexed { index, course ->
                            Rise(delayMillis = index * 45) { GroupRow(course = course, preview = preview(course)) }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun GroupRow(course: Course, preview: Preview) {
    val state = LocalApp.current
    val interaction = remember { MutableInteractionSource() }
    val unread = UNREAD[course.id] ?: 0
    KarsaCard(
        modifier = Modifier
            .fillMaxWidth()
            .pressScale(interaction, 0.99f)
            .clickable(
                interactionSource = interaction,
                indication = LocalIndication.current,
            ) { state.go(Route.Chat(course.id)) },
    ) {
        Row(Modifier.padding(16.dp), horizontalArrangement = Arrangement.spacedBy(14.dp)) {
            Avatar(name = course.name, size = 52.dp, tone = course.tone, square = true)
            Column(Modifier.weight(1f)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.Top,
                ) {
                    Row(
                        modifier = Modifier.weight(1f),
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(
                            course.name,
                            style = sansStyle(16, 700, 1.25f),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            modifier = Modifier.weight(1f, fill = false),
                        )
                        if (course.locked) {
                            LucideIcon(KarsaIcons.Lock, modifier = Modifier.size(14.dp), tint = Muted)
                        }
                    }
                    Text(
                        if (preview.ts > 0) chatStamp(preview.ts) else "",
                        style = sansStyle(11, 600, 1.3f, color = if (unread > 0) Brand600 else Muted),
                    )
                }
                Text(
                    "${course.kelas} · ${pjLabel(course, state.role)} · ${course.members} anggota",
                    style = sansStyle(12, 400, 1.4f, color = Muted),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Spacer(Modifier.height(8.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        preview.text,
                        style = sansStyle(
                            14,
                            400,
                            1.4f,
                            color = if (preview.italic) Muted else Ink2,
                        ),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f),
                    )
                    if (unread > 0) {
                        Box(
                            modifier = Modifier
                                .height(20.dp)
                                .widthIn(min = 20.dp)
                                .clip(CircleShape)
                                .background(Brand500)
                                .padding(horizontal = 6.dp),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text("$unread", style = sansStyle(11, 700, 1f, color = Color.White))
                        }
                    }
                }
            }
        }
    }
}

private class ActionRowModel(val icon: List<String>, val label: String, val sub: String? = null, val danger: Boolean = false, val onClick: () -> Unit)

@Composable
private fun ActionRow(model: ActionRowModel) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .clickable(onClick = model.onClick)
            .padding(horizontal = 12.dp, vertical = 12.dp),
        horizontalArrangement = Arrangement.spacedBy(14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .size(40.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(if (model.danger) Danger100 else Paper2),
            contentAlignment = Alignment.Center,
        ) {
            LucideIcon(
                model.icon,
                modifier = Modifier.size(20.dp),
                tint = if (model.danger) Danger500 else Ink2,
            )
        }
        Column(Modifier.weight(1f)) {
            Text(
                model.label,
                style = sansStyle(15, 600, 1.3f, color = if (model.danger) Danger500 else Ink),
            )
            if (model.sub != null) {
                Text(model.sub, style = sansStyle(12, 400, 1.4f, color = Muted))
            }
        }
    }
}

private val REPORT_REASONS = listOf(
    "Spam atau promosi",
    "Ujaran kasar atau pelecehan",
    "Konten tidak pantas",
    "Informasi menyesatkan",
    "Lainnya",
)

@Composable
fun ChatScreen(id: String) {
    val state = LocalApp.current
    val load = rememberLoad(delayMillis = 500)
    val course = COURSES.firstOrNull { it.id == id } ?: return
    val msgs = state.chats[id].orEmpty()
    val pj = isPjOf(course, state.role)
    val canSend = !course.locked || pj

    var text by remember { mutableStateOf("") }
    var editing by remember { mutableStateOf<Msg?>(null) }
    var selected by remember { mutableStateOf<Msg?>(null) }
    var reportFor by remember { mutableStateOf<Msg?>(null) }
    var reason by remember { mutableStateOf("") }
    var blockFor by remember { mutableStateOf<Msg?>(null) }
    var deleteFor by remember { mutableStateOf<Msg?>(null) }
    val listState = rememberLazyListState()
    val scope = rememberCoroutineScope()
    val clipboard = LocalClipboardManager.current

    val pinned = msgs.lastOrNull { it.pinned && !it.deleted }
    val pinnedIndex = msgs.indexOfFirst { it.id == pinned?.id }

    LaunchedEffect(load.status, msgs.size) {
        if (load.status == LoadStatus.Ready && msgs.isNotEmpty()) {
            listState.scrollToItem(msgs.lastIndex)
        }
    }

    fun submit() {
        val trimmed = text.trim()
        if (trimmed.isEmpty()) return
        val target = editing
        if (target != null) {
            state.editMsg(id, target.id, trimmed)
            editing = null
            state.notify("Pesan diperbarui", ToastTone.Success)
        } else {
            state.sendMsg(id, trimmed)
        }
        text = ""
    }

    Column(Modifier.fillMaxSize().background(Paper).imePadding()) {
        TopBar(
            onBack = { state.back() },
            leading = { Avatar(name = course.name, size = 40.dp, tone = course.tone, square = true) },
            title = course.name,
            subtitle = "${course.kelas} · ${course.members} anggota",
            right = {
                if (course.locked) LucideIcon(KarsaIcons.Lock, modifier = Modifier.size(16.dp), tint = Muted)
            },
        )

        if (pinned != null && load.status == LoadStatus.Ready) {
            Row(
                modifier = Modifier
                    .padding(horizontal = 16.dp)
                    .padding(bottom = 8.dp)
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(16.dp))
                    .background(Color.White)
                    .border(1.dp, Line, RoundedCornerShape(16.dp))
                    .clickable {
                        scope.launch { if (pinnedIndex >= 0) listState.animateScrollToItem(pinnedIndex) }
                    }
                    .padding(horizontal = 12.dp, vertical = 10.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Box(
                    modifier = Modifier
                        .size(32.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(Brand100),
                    contentAlignment = Alignment.Center,
                ) {
                    LucideIcon(KarsaIcons.Pin, modifier = Modifier.size(16.dp), tint = Brand600)
                }
                Column(Modifier.weight(1f)) {
                    Text("DISEMATKAN", style = sansStyle(11, 700, 1.4f, 0.05f, Brand700))
                    Text(
                        pinned.text,
                        style = sansStyle(13, 400, 1.4f, color = Ink2),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
            }
        }

        Box(Modifier.weight(1f).fillMaxWidth().background(Paper2.copy(alpha = 0.6f))) {
            Gate(
                status = load.status,
                onRetry = load.retry,
                skeleton = {
                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                        listOf(60, 78, 52, 70).forEachIndexed { index, width ->
                            Box(
                                Modifier.fillMaxWidth(),
                                contentAlignment = if (index % 3 == 2) Alignment.CenterEnd else Alignment.CenterStart,
                            ) {
                                Skeleton(
                                    Modifier.fillMaxWidth(width / 100f).height(56.dp),
                                    RoundedCornerShape(24.dp),
                                )
                            }
                        }
                    }
                },
            ) {
                if (msgs.isEmpty()) {
                    EmptyState(
                        title = "Belum ada pesan",
                        desc = "Mulai percakapan pertama di grup ini.",
                        icon = { LucideIcon(KarsaIcons.MessagesSquare, modifier = Modifier.size(36.dp), tint = Brand600) },
                    )
                } else {
                    LazyColumn(
                        state = listState,
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 16.dp, vertical = 16.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        itemsIndexed(msgs, key = { _, msg -> msg.id }) { index, msg ->
                            val previous = msgs.getOrNull(index - 1)
                            val newDay = previous == null || dayKey(previous.ts) != dayKey(msg.ts)
                            MessageRow(
                                msg = msg,
                                course = course,
                                showDay = newDay,
                                blocked = msg.from in state.blocked,
                                onOpen = { selected = msg },
                                onShowHidden = { state.hideMsg(id, msg.id, false) },
                            )
                        }
                    }
                }
            }
        }

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(Paper)
                .topLine()
                .navigationBarsPadding()
                .padding(horizontal = 16.dp, vertical = 12.dp),
        ) {
            if (!canSend) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(16.dp))
                        .background(Paper2)
                        .padding(horizontal = 16.dp, vertical = 14.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    LucideIcon(KarsaIcons.Lock, modifier = Modifier.size(20.dp), tint = Muted)
                    Text(
                        "Grup dikunci. Hanya PJ yang dapat mengirim pesan. Hubungi ${course.pjOther} bila ada pertanyaan.",
                        style = sansStyle(13, 400, 1.375f, color = Ink2),
                    )
                }
            } else {
                if (course.locked) {
                    Row(
                        Modifier.padding(bottom = 8.dp, start = 4.dp),
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        LucideIcon(KarsaIcons.Lock, modifier = Modifier.size(14.dp), tint = Muted)
                        Text(
                            "Grup dikunci. Hanya kamu sebagai PJ yang dapat mengirim.",
                            style = sansStyle(12, 600, 1.4f, color = Muted),
                        )
                    }
                }
                if (editing != null) {
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
                        LucideIcon(KarsaIcons.Pencil, modifier = Modifier.size(14.dp), tint = Brand700)
                        Text(
                            "Mengedit: ${editing!!.text}",
                            modifier = Modifier.weight(1f),
                            style = sansStyle(12, 600, 1.4f, color = Brand700),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                        Box(
                            Modifier.clickable {
                                editing = null
                                text = ""
                            },
                        ) {
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
                                    Text("Tulis pesan…", style = sansStyle(15, 400, 1.5f, color = Muted.copy(alpha = 0.8f)))
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
                            .clickable(enabled = enabled, onClick = ::submit),
                        contentAlignment = Alignment.Center,
                    ) {
                        LucideIcon(KarsaIcons.Send, modifier = Modifier.size(20.dp), tint = if (enabled) Color.White else Muted)
                    }
                }
            }
        }
    }

    val sel = selected
    KarsaSheet(open = sel != null, onClose = { selected = null }, title = "Aksi pesan") {
        if (sel != null) {
            val mine = isMine(sel, course, state.role)
            val selStudent = if (sel.from != "me" && sel.from != "pj") studentById(sel.from) else null
            Column {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(16.dp))
                        .background(Color.White)
                        .border(1.dp, Line, RoundedCornerShape(16.dp))
                        .padding(14.dp),
                ) {
                    Text(
                        senderName(sel, course, state.role),
                        style = sansStyle(12, 700, 1.4f, color = Muted),
                    )
                    Text(
                        sel.text,
                        style = sansStyle(14, 400, 1.4f, color = Ink2),
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
                Spacer(Modifier.height(12.dp))
                ActionRow(
                    ActionRowModel(KarsaIcons.Copy, "Salin teks") {
                        clipboard.setText(AnnotatedString(sel.text))
                        selected = null
                        state.notify("Pesan disalin")
                    },
                )
                if (pj) {
                    ActionRow(
                        ActionRowModel(
                            if (sel.pinned) KarsaIcons.PinOff else KarsaIcons.Pin,
                            if (sel.pinned) "Lepas sematan" else "Sematkan pesan",
                            sub = "Pesan tampil di bagian atas grup",
                        ) {
                            state.pinMsg(id, sel.id)
                            selected = null
                            state.notify(if (sel.pinned) "Sematan dilepas" else "Pesan disematkan")
                        },
                    )
                }
                if (mine) {
                    ActionRow(
                        ActionRowModel(KarsaIcons.Pencil, "Edit pesan") {
                            editing = sel
                            text = sel.text
                            selected = null
                        },
                    )
                    ActionRow(
                        ActionRowModel(KarsaIcons.Trash2, "Hapus pesan", "Diganti penanda “telah dihapus”", danger = true) {
                            deleteFor = sel
                            selected = null
                        },
                    )
                } else {
                    ActionRow(
                        ActionRowModel(KarsaIcons.EyeOff, "Sembunyikan pesan", "Hanya disembunyikan dari tampilanmu") {
                            state.hideMsg(id, sel.id, true)
                            selected = null
                            state.notify("Pesan disembunyikan")
                        },
                    )
                    ActionRow(
                        ActionRowModel(KarsaIcons.Flag, "Laporkan pesan") {
                            reportFor = sel
                            reason = ""
                            selected = null
                        },
                    )
                    if (selStudent != null) {
                        ActionRow(
                            ActionRowModel(
                                KarsaIcons.Ban,
                                "Blokir ${selStudent.name.split(" ").first()}",
                                danger = true,
                            ) {
                                blockFor = sel
                                selected = null
                            },
                        )
                    }
                }
            }
        }
    }

    KarsaSheet(
        open = reportFor != null,
        onClose = { reportFor = null },
        title = "Laporkan pesan",
        footer = {
            KarsaButton(
                text = "Kirim laporan",
                onClick = {
                    reportFor = null
                    state.notify("Laporan terkirim. Terima kasih sudah menjaga kelas.", ToastTone.Success)
                },
                size = ButtonSize.Lg,
                full = true,
                enabled = reason.isNotEmpty(),
            )
        },
    ) {
        Text(
            "Pilih alasan yang paling sesuai. Identitasmu tidak terlihat oleh pelapor lain.",
            style = sansStyle(14, 400, 1.5f, color = Muted),
        )
        Spacer(Modifier.height(12.dp))
        REPORT_REASONS.forEach { item ->
            val active = reason == item
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 4.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .background(if (active) Brand100 else Color.White)
                    .then(if (active) Modifier else Modifier.border(1.dp, Line, RoundedCornerShape(16.dp)))
                    .clickable { reason = item }
                    .padding(horizontal = 16.dp, vertical = 14.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Box(
                    modifier = Modifier
                        .size(20.dp)
                        .clip(CircleShape)
                        .border(2.dp, if (active) Brand500 else Paper3, CircleShape),
                    contentAlignment = Alignment.Center,
                ) {
                    if (active) Box(Modifier.size(10.dp).clip(CircleShape).background(Brand500))
                }
                Text(
                    item,
                    style = sansStyle(15, 600, 1.3f, color = if (active) Brand700 else Ink),
                )
            }
        }
    }

    KarsaDialog(
        open = blockFor != null,
        onClose = { blockFor = null },
        tone = DialogTone.Danger,
        title = if (blockFor != null) "Blokir ${studentById(blockFor!!.from).name}?" else "",
        desc = "Pesan darinya akan disembunyikan di semua grup. Kamu bisa membuka blokir lewat PJ kelas.",
        confirmLabel = "Blokir",
        onConfirm = {
            val target = blockFor
            if (target != null) state.blockUser(target.from)
            blockFor = null
            state.notify("Pengguna diblokir", ToastTone.Neutral)
        },
    )

    KarsaDialog(
        open = deleteFor != null,
        onClose = { deleteFor = null },
        tone = DialogTone.Danger,
        title = "Hapus pesan ini?",
        desc = "Pesan diganti penanda “Pesan ini telah dihapus” untuk semua anggota grup.",
        confirmLabel = "Hapus",
        onConfirm = {
            val target = deleteFor
            if (target != null) state.deleteMsg(id, target.id)
            deleteFor = null
            state.notify("Pesan dihapus")
        },
    )
}

@Composable
private fun MessageRow(
    msg: Msg,
    course: Course,
    showDay: Boolean,
    blocked: Boolean,
    onOpen: () -> Unit,
    onShowHidden: () -> Unit,
) {
    val state = LocalApp.current
    val mine = isMine(msg, course, state.role)
    val name = senderName(msg, course, state.role)
    Column {
        if (showDay) {
            Box(Modifier.fillMaxWidth().padding(vertical = 6.dp), contentAlignment = Alignment.Center) {
                Box(
                    Modifier
                        .clip(CircleShape)
                        .background(Color.White)
                        .padding(horizontal = 12.dp, vertical = 4.dp),
                ) {
                    Text(dayLabel(msg.ts), style = sansStyle(11, 700, 1.3f, color = Muted))
                }
            }
        }
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = if (mine) Arrangement.End else Arrangement.Start,
            verticalAlignment = Alignment.Bottom,
        ) {
            if (!mine) {
                Avatar(name = name, size = 30.dp, modifier = Modifier.padding(end = 8.dp, bottom = 2.dp))
            }
            when {
                msg.deleted -> Row(
                    modifier = Modifier
                        .clip(RoundedCornerShape(20.dp))
                        .border(1.dp, Paper3, RoundedCornerShape(20.dp))
                        .padding(horizontal = 16.dp, vertical = 10.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    LucideIcon(KarsaIcons.Ban, modifier = Modifier.size(14.dp), tint = Muted)
                    Text("Pesan ini telah dihapus", style = sansStyle(13, 400, 1.3f, color = Muted))
                }
                blocked -> Row(
                    modifier = Modifier
                        .clip(RoundedCornerShape(20.dp))
                        .background(Paper3.copy(alpha = 0.5f))
                        .padding(horizontal = 16.dp, vertical = 10.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    LucideIcon(KarsaIcons.Ban, modifier = Modifier.size(14.dp), tint = Muted)
                    Text("Pesan dari pengguna yang diblokir", style = sansStyle(13, 400, 1.3f, color = Muted))
                }
                msg.hidden -> Row(
                    modifier = Modifier
                        .clip(RoundedCornerShape(20.dp))
                        .background(Paper3.copy(alpha = 0.5f))
                        .padding(start = 16.dp, end = 8.dp, top = 6.dp, bottom = 6.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    LucideIcon(KarsaIcons.EyeOff, modifier = Modifier.size(14.dp), tint = Muted)
                    Text("Pesan disembunyikan", style = sansStyle(13, 400, 1.3f, color = Muted))
                    Box(
                        Modifier
                            .clip(CircleShape)
                            .background(Color.White)
                            .clickable(onClick = onShowHidden)
                            .padding(horizontal = 12.dp, vertical = 6.dp),
                    ) {
                        Text("Tampilkan", style = sansStyle(12, 700, 1.3f, color = Ink2))
                    }
                }
                else -> {
                    val shape = if (mine) {
                        RoundedCornerShape(topStart = 22.dp, topEnd = 22.dp, bottomEnd = 8.dp, bottomStart = 22.dp)
                    } else {
                        RoundedCornerShape(topStart = 22.dp, topEnd = 22.dp, bottomEnd = 22.dp, bottomStart = 8.dp)
                    }
                    Column(
                        modifier = Modifier
                            .widthIn(max = 300.dp)
                            .clip(shape)
                            .background(if (mine) Brand500 else Color.White)
                            .then(
                                if (msg.pinned && !mine) Modifier.border(2.dp, Brand300, shape)
                                else if (!mine) Modifier.border(1.dp, Ink.copy(alpha = 0.05f), shape)
                                else Modifier,
                            )
                            .clickable(onClick = onOpen)
                            .padding(horizontal = 16.dp, vertical = 10.dp),
                    ) {
                        if (!mine) {
                            Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                                Text(name, style = sansStyle(12, 700, 1.4f, color = nameTone(name)))
                                if (msg.from == "pj") {
                                    Badge("PJ", tone = BadgeTone.Brand)
                                }
                            }
                            Spacer(Modifier.height(2.dp))
                        }
                        Text(
                            msg.text,
                            style = sansStyle(15, 400, 1.375f, color = if (mine) Color.White else Ink),
                        )
                        Spacer(Modifier.height(4.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(6.dp, Alignment.End),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            if (msg.pinned) {
                                LucideIcon(
                                    KarsaIcons.Pin,
                                    modifier = Modifier.size(12.dp),
                                    tint = if (mine) Color.White.copy(alpha = 0.75f) else Muted,
                                    strokeWidth = 2f,
                                )
                            }
                            if (msg.edited) {
                                Text("diedit", style = sansStyle(11, 400, 1.3f, color = if (mine) Color.White.copy(alpha = 0.75f) else Muted))
                            }
                            Text(
                                fmtTime(msg.ts),
                                style = sansStyle(11, 400, 1.3f, color = if (mine) Color.White.copy(alpha = 0.75f) else Muted),
                            )
                        }
                    }
                }
            }
        }
    }
}

private fun Modifier.topLine(): Modifier = drawBehind {
    drawLine(Line, start = androidx.compose.ui.geometry.Offset(0f, 0f), end = androidx.compose.ui.geometry.Offset(size.width, 0f), strokeWidth = 1.dp.toPx())
}
