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
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
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
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.delay
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
import ac.id.untidar.karsa.data.dayKey
import ac.id.untidar.karsa.data.dayLabel
import ac.id.untidar.karsa.data.fmtTime
import ac.id.untidar.karsa.data.isPjOf
import ac.id.untidar.karsa.data.pjLabel
import ac.id.untidar.karsa.groups.GroupRoom
import ac.id.untidar.karsa.icons.KarsaIcons
import ac.id.untidar.karsa.net.friendlyError
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
import ac.id.untidar.karsa.ui.Field
import ac.id.untidar.karsa.ui.Gate
import ac.id.untidar.karsa.ui.KarsaButton
import ac.id.untidar.karsa.ui.KarsaCard
import ac.id.untidar.karsa.ui.KarsaDialog
import ac.id.untidar.karsa.ui.KarsaIconButton
import ac.id.untidar.karsa.ui.KarsaSheet
import ac.id.untidar.karsa.ui.KarsaTextField
import ac.id.untidar.karsa.ui.ListSkeleton
import ac.id.untidar.karsa.ui.LoadStatus
import ac.id.untidar.karsa.ui.PageHeader
import ac.id.untidar.karsa.ui.Rise
import ac.id.untidar.karsa.ui.SearchField
import ac.id.untidar.karsa.ui.Skeleton
import ac.id.untidar.karsa.ui.Spinner
import ac.id.untidar.karsa.ui.Tone
import ac.id.untidar.karsa.ui.TopBar
import ac.id.untidar.karsa.ui.rememberLoad
import ac.id.untidar.karsa.ui.toneFor

private fun senderName(msg: Msg, course: Course, role: Role): String = when {
    msg.from == "me" -> "Kamu"
    msg.authorName.isNotBlank() -> msg.authorName
    msg.from == "pj" -> if (isPjOf(course, role)) "Kamu" else course.pjOther
    else -> "Anggota"
}

private fun isMine(msg: Msg, course: Course, role: Role): Boolean =
    msg.from == "me" || (msg.from == "pj" && isPjOf(course, role))

private fun displayName(msg: Msg, course: Course, role: Role): String =
    if (msg.authorName.isNotBlank() && msg.from != "me") msg.authorName else senderName(msg, course, role)

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
    val groups = state.groups
    var q by remember { mutableStateOf("") }

    LaunchedEffect(Unit) {
        if (groups.rooms.isEmpty()) groups.loadRooms()
    }

    val list = groups.rooms.filter { room ->
        q.isBlank() || "${room.course.name} ${room.course.kelas}".lowercase().contains(q.trim().lowercase())
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
            when {
                groups.listStatus == LoadStatus.Loading && groups.rooms.isEmpty() -> ListSkeleton(count = 4, lines = 1)
                groups.listStatus == LoadStatus.Error && groups.rooms.isEmpty() -> KarsaCard {
                    EmptyState(
                        title = "Grup belum termuat",
                        desc = groups.listError ?: "Periksa koneksi lalu coba lagi.",
                        icon = { LucideIcon(KarsaIcons.TriangleAlert, modifier = Modifier.size(36.dp), tint = Brand600) },
                        action = {
                            KarsaButton("Coba lagi", onClick = { groups.loadRooms() }, variant = ButtonVariant.Soft)
                        },
                    )
                }
                list.isEmpty() -> KarsaCard {
                    if (groups.rooms.isEmpty()) {
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
                else -> Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    list.forEachIndexed { index, room ->
                        Rise(delayMillis = index * 45) { GroupRow(room = room) }
                    }
                }
            }
        }
    }
}

@Composable
private fun GroupRow(room: GroupRoom) {
    val state = LocalApp.current
    val course = room.course
    val preview = room.preview
    val interaction = remember { MutableInteractionSource() }
    val unread = 0
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

private data class GroupReportReason(val value: String, val label: String)

private val GROUP_REPORT_REASONS = listOf(
    GroupReportReason("SPAM", "Spam atau promosi"),
    GroupReportReason("HARASSMENT", "Ujaran kasar atau pelecehan"),
    GroupReportReason("INAPPROPRIATE", "Konten tidak pantas"),
    GroupReportReason("MISINFORMATION", "Informasi menyesatkan"),
    GroupReportReason("OTHER", "Lainnya"),
)

@Composable
fun ChatScreen(id: String) {
    val state = LocalApp.current
    val groups = state.groups
    val chat = remember(id) { groups.chat(id) }
    val course = chat.course
    val scope = rememberCoroutineScope()
    val clipboard = LocalClipboardManager.current
    val listState = rememberLazyListState()
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

    var text by remember { mutableStateOf("") }
    var editing by remember { mutableStateOf<Msg?>(null) }
    var selected by remember { mutableStateOf<Msg?>(null) }
    var replyTo by remember { mutableStateOf<Msg?>(null) }
    var reportFor by remember { mutableStateOf<Msg?>(null) }
    var reportReason by remember { mutableStateOf("") }
    var reportDetails by remember { mutableStateOf("") }
    var reportSending by remember { mutableStateOf(false) }
    var hideFor by remember { mutableStateOf<Msg?>(null) }
    var hideReason by remember { mutableStateOf("") }
    var hideError by remember { mutableStateOf<String?>(null) }
    var blockFor by remember { mutableStateOf<Msg?>(null) }
    var unblockFor by remember { mutableStateOf<Msg?>(null) }
    var deleteFor by remember { mutableStateOf<Msg?>(null) }
    var pinsOpen by remember { mutableStateOf(false) }
    var previousCount by remember(id) { mutableIntStateOf(0) }
    val nearBottom by remember {
        derivedStateOf {
            val info = listState.layoutInfo
            val lastVisible = info.visibleItemsInfo.lastOrNull()?.index ?: -1
            lastVisible >= info.totalItemsCount - 2
        }
    }

    LaunchedEffect(id) {
        if (chat.messages.isEmpty() && chat.status != LoadStatus.Ready) groups.loadInitial(id)
    }
    LaunchedEffect(id) {
        while (true) {
            delay(12_000)
            groups.refresh(id, silent = true)
        }
    }
    LaunchedEffect(chat.status) {
        if (chat.status == LoadStatus.Ready && chat.messages.isNotEmpty()) {
            listState.scrollToItem(chat.messages.lastIndex)
        }
    }
    LaunchedEffect(chat.messages.size) {
        if (chat.messages.isNotEmpty() && (previousCount == 0 || nearBottom)) {
            listState.animateScrollToItem(chat.messages.lastIndex)
        }
        previousCount = chat.messages.size
    }

    if (course == null) {
        Column(
            Modifier
                .fillMaxSize()
                .background(Paper)
                .graphicsLayer {
                    alpha = 1f - exit.value
                    translationX = 32.dp.toPx() * exit.value
                },
        ) {
            TopBar(onBack = ::close, title = "Grup kelas")
            Gate(
                status = chat.status,
                onRetry = { groups.loadInitial(id) },
                skeleton = {
                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                        Skeleton(Modifier.fillMaxWidth(0.7f).height(56.dp), RoundedCornerShape(24.dp))
                        Skeleton(Modifier.fillMaxWidth(0.5f).height(56.dp), RoundedCornerShape(24.dp))
                    }
                },
            ) {
                EmptyState(
                    title = "Grup tidak ditemukan",
                    desc = "Kembali ke daftar grup lalu pilih kelas kembali.",
                    icon = { LucideIcon(KarsaIcons.MessagesSquare, modifier = Modifier.size(36.dp), tint = Brand600) },
                )
            }
        }
        return
    }

    val msgs = chat.messages
    val pinned = chat.pinned
    val canSend = !chat.isLocked || chat.isManager

    fun previewOf(message: Msg): String = when {
        message.deleted -> "Pesan telah dihapus"
        message.hidden -> message.hiddenReason ?: "Pesan disembunyikan oleh PJ"
        message.blocked -> "Pesan dari pengguna yang diblokir"
        else -> message.text
    }

    fun toggleLock() {
        val target = !chat.isLocked
        scope.launch {
            try {
                groups.lock(id, target)
                state.notify(if (target) "Grup dikunci" else "Grup dibuka", ToastTone.Success)
            } catch (failure: Exception) {
                state.notify(friendlyError(failure), ToastTone.Error)
            }
        }
    }

    fun submit() {
        val trimmed = text.trim()
        if (trimmed.isEmpty() || chat.sending) return
        val target = editing
        if (target != null) {
            scope.launch {
                try {
                    groups.edit(id, target.id, trimmed)
                    editing = null
                    text = ""
                    state.notify("Pesan diperbarui", ToastTone.Success)
                } catch (failure: Exception) {
                    state.notify(friendlyError(failure), ToastTone.Error)
                }
            }
        } else {
            val draft = text
            val replyId = replyTo?.id
            scope.launch {
                try {
                    groups.send(id, trimmed, replyId)
                    text = when {
                        text == draft -> ""
                        text.startsWith(draft) -> text.removePrefix(draft)
                        else -> text
                    }
                    replyTo = null
                    val last = groups.chat(id).messages.lastIndex
                    if (last >= 0) listState.animateScrollToItem(last)
                } catch (failure: Exception) {
                    state.notify(friendlyError(failure), ToastTone.Error)
                }
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
            leading = { Avatar(name = course.name, size = 40.dp, tone = course.tone, square = true) },
            title = course.name,
            subtitle = buildString {
                append(course.kelas)
                append(" · ")
                append(course.members)
                append(" anggota")
                if (course.pjOther.isNotBlank()) {
                    append(" · PJ ")
                    append(course.pjOther)
                }
            },
            right = {
                Row(horizontalArrangement = Arrangement.spacedBy(2.dp), verticalAlignment = Alignment.CenterVertically) {
                    if (chat.isManager) {
                        KarsaIconButton(
                            onClick = { state.go(Route.GroupReports(id)) },
                            contentDescription = "Laporan grup",
                        ) {
                            LucideIcon(KarsaIcons.Flag, modifier = Modifier.size(18.dp), tint = Ink)
                        }
                        KarsaIconButton(
                            onClick = ::toggleLock,
                            contentDescription = if (chat.isLocked) "Buka grup" else "Kunci grup",
                        ) {
                            LucideIcon(
                                if (chat.isLocked) KarsaIcons.LockOpen else KarsaIcons.Lock,
                                modifier = Modifier.size(18.dp),
                                tint = Ink,
                            )
                        }
                    } else if (chat.isLocked) {
                        LucideIcon(
                            KarsaIcons.Lock,
                            modifier = Modifier.padding(end = 12.dp).size(16.dp),
                            tint = Muted,
                        )
                    }
                }
            },
        )

        if (pinned.isNotEmpty() && chat.status == LoadStatus.Ready) {
            Row(
                modifier = Modifier
                    .padding(horizontal = 16.dp)
                    .padding(bottom = 8.dp)
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(16.dp))
                    .background(Color.White)
                    .border(1.dp, Line, RoundedCornerShape(16.dp))
                    .clickable { pinsOpen = true }
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
                    Text(
                        if (pinned.size > 1) "DISEMATKAN · ${pinned.size}" else "DISEMATKAN",
                        style = sansStyle(11, 700, 1.4f, 0.05f, Brand700),
                    )
                    Text(
                        previewOf(pinned.first()),
                        style = sansStyle(13, 400, 1.4f, color = Ink2),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
                LucideIcon(KarsaIcons.ChevronRight, modifier = Modifier.size(16.dp), tint = Muted)
            }
        }

        Box(Modifier.weight(1f).fillMaxWidth().background(Paper2.copy(alpha = 0.6f))) {
            Gate(
                status = chat.status,
                onRetry = { groups.loadInitial(id) },
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
                        if (chat.nextCursor != null) {
                            item(key = "older") {
                                Row(
                                    modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp),
                                    horizontalArrangement = Arrangement.Center,
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    if (chat.loadingOlder) {
                                        Spinner(tint = Brand600, modifier = Modifier.size(20.dp))
                                    } else {
                                        KarsaButton(
                                            text = "Muat pesan sebelumnya",
                                            onClick = { groups.loadOlder(id) },
                                            variant = ButtonVariant.Ghost,
                                            size = ButtonSize.Sm,
                                        )
                                    }
                                }
                            }
                        }
                        itemsIndexed(msgs, key = { _, message -> message.id }) { index, message ->
                            val previous = msgs.getOrNull(index - 1)
                            val newDay = previous == null || dayKey(previous.ts) != dayKey(message.ts)
                            MessageRow(
                                msg = message,
                                course = course,
                                showDay = newDay,
                                blocked = message.blocked,
                                onOpen = {
                                    if (!message.deleted && !message.hidden) selected = message
                                },
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
                if (chat.isLocked) {
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
                            "Membalas ${displayName(replyTo!!, course, state.role)}",
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
                                        if (replyTo != null) "Tulis balasan…" else "Tulis pesan…",
                                        style = sansStyle(15, 400, 1.5f, color = Muted.copy(alpha = 0.8f)),
                                    )
                                }
                                inner()
                            }
                        },
                    )
                    val enabled = text.trim().isNotEmpty() && !chat.sending
                    Box(
                        modifier = Modifier
                            .size(48.dp)
                            .clip(CircleShape)
                            .then(if (enabled) Modifier.brandShadow(CircleShape) else Modifier)
                            .background(if (enabled || chat.sending) Brand500 else Paper3)
                            .clickable(enabled = enabled, onClick = ::submit),
                        contentAlignment = Alignment.Center,
                    ) {
                        if (chat.sending) {
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
    }

    val sel = selected
    KarsaSheet(open = sel != null, onClose = { selected = null }, title = "Aksi pesan") {
        if (sel != null) {
            val mine = isMine(sel, course, state.role)
            val author = displayName(sel, course, state.role)
            val active = !sel.deleted && !sel.hidden && !sel.blocked
            Column {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(16.dp))
                        .background(Color.White)
                        .border(1.dp, Line, RoundedCornerShape(16.dp))
                        .padding(14.dp),
                ) {
                    Text(author, style = sansStyle(12, 700, 1.4f, color = Muted))
                    Text(
                        previewOf(sel),
                        style = sansStyle(14, 400, 1.4f, color = Ink2),
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
                Spacer(Modifier.height(12.dp))
                if (active) {
                    ActionRow(
                        ActionRowModel(KarsaIcons.Copy, "Salin teks") {
                            clipboard.setText(AnnotatedString(sel.text))
                            selected = null
                            state.notify("Pesan disalin")
                        },
                    )
                    ActionRow(
                        ActionRowModel(KarsaIcons.Reply, "Balas pesan") {
                            replyTo = sel
                            editing = null
                            selected = null
                        },
                    )
                    if (chat.isManager) {
                        ActionRow(
                            ActionRowModel(
                                if (sel.pinned) KarsaIcons.PinOff else KarsaIcons.Pin,
                                if (sel.pinned) "Lepas sematan" else "Sematkan pesan",
                                sub = "Pesan tampil di bagian atas grup",
                            ) {
                                scope.launch {
                                    try {
                                        groups.pin(id, sel.id, !sel.pinned)
                                        selected = null
                                        state.notify(if (sel.pinned) "Sematan dilepas" else "Pesan disematkan")
                                    } catch (failure: Exception) {
                                        state.notify(friendlyError(failure), ToastTone.Error)
                                    }
                                }
                            },
                        )
                    }
                    if (sel.canEdit) {
                        ActionRow(
                            ActionRowModel(KarsaIcons.Pencil, "Edit pesan") {
                                editing = sel
                                replyTo = null
                                text = sel.text
                                selected = null
                            },
                        )
                    }
                    if (sel.canDelete) {
                        ActionRow(
                            ActionRowModel(KarsaIcons.Trash2, "Hapus pesan", "Diganti penanda “telah dihapus”", danger = true) {
                                deleteFor = sel
                                selected = null
                            },
                        )
                    }
                    if (chat.isManager && !mine) {
                        ActionRow(
                            ActionRowModel(KarsaIcons.EyeOff, "Sembunyikan pesan", "Disembunyikan untuk seluruh anggota", danger = true) {
                                hideReason = ""
                                hideError = null
                                hideFor = sel
                                selected = null
                            },
                        )
                        ActionRow(
                            ActionRowModel(KarsaIcons.Flag, "Laporkan pesan") {
                                reportReason = ""
                                reportDetails = ""
                                reportFor = sel
                                selected = null
                            },
                        )
                    } else if (!mine) {
                        ActionRow(
                            ActionRowModel(KarsaIcons.Flag, "Laporkan pesan") {
                                reportReason = ""
                                reportDetails = ""
                                reportFor = sel
                                selected = null
                            },
                        )
                    }
                    if (!mine && sel.authorId.isNotBlank()) {
                        ActionRow(
                            ActionRowModel(
                                KarsaIcons.Ban,
                                "Blokir ${author.split(" ").first()}",
                                danger = true,
                            ) {
                                blockFor = sel
                                selected = null
                            },
                        )
                    }
                } else if (sel.blocked) {
                    ActionRow(
                        ActionRowModel(
                            KarsaIcons.Ban,
                            "Buka blokir ${author.split(" ").first()}",
                            "Pesan darinya akan terlihat lagi",
                        ) {
                            unblockFor = sel
                            selected = null
                        },
                    )
                }
            }
        }
    }

    KarsaSheet(open = pinsOpen, onClose = { pinsOpen = false }, title = "Pesan disematkan") {
        if (pinned.isEmpty()) {
            EmptyState(
                title = "Belum ada sematan",
                desc = "PJ dapat menyematkan pesan penting dari menu pesan.",
                icon = { LucideIcon(KarsaIcons.Pin, modifier = Modifier.size(36.dp), tint = Brand600) },
            )
        } else {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                pinned.forEach { message ->
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(16.dp))
                            .background(Color.White)
                            .border(1.dp, Line, RoundedCornerShape(16.dp))
                            .clickable {
                                pinsOpen = false
                                val index = chat.messages.indexOfFirst { it.id == message.id }
                                if (index >= 0) {
                                    scope.launch { listState.animateScrollToItem(index) }
                                } else {
                                    state.notify("Pesan tidak ada di tampilan saat ini")
                                }
                            }
                            .padding(14.dp),
                    ) {
                        Text(
                            displayName(message, course, state.role),
                            style = sansStyle(12, 700, 1.4f, color = Brand700),
                        )
                        Text(
                            previewOf(message),
                            style = sansStyle(14, 400, 1.5f, color = Ink2),
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis,
                        )
                        Text(
                            fmtTime(message.ts),
                            modifier = Modifier.padding(top = 4.dp),
                            style = sansStyle(11, 400, 1.3f, color = Muted),
                        )
                    }
                }
            }
        }
    }

    KarsaSheet(
        open = reportFor != null,
        onClose = {
            if (!reportSending) {
                reportFor = null
                reportReason = ""
                reportDetails = ""
            }
        },
        title = "Laporkan pesan",
        footer = {
            KarsaButton(
                text = if (reportSending) "Mengirim laporan…" else "Kirim laporan",
                onClick = {
                    val target = reportFor
                    if (target != null && reportReason.isNotBlank() && !reportSending) {
                        reportSending = true
                        scope.launch {
                            try {
                                val autoHidden = groups.report(
                                    id = id,
                                    messageId = target.id,
                                    reason = reportReason,
                                    details = reportDetails.trim().ifBlank { null },
                                )
                                state.notify(
                                    if (autoHidden) "Laporan dikirim dan pesan disembunyikan." else "Laporan dikirim.",
                                    ToastTone.Success,
                                )
                                reportFor = null
                                reportReason = ""
                                reportDetails = ""
                            } catch (failure: Exception) {
                                state.notify(friendlyError(failure), ToastTone.Error)
                            } finally {
                                reportSending = false
                            }
                        }
                    }
                },
                size = ButtonSize.Lg,
                full = true,
                enabled = reportReason.isNotBlank() && !reportSending,
                loading = reportSending,
            )
        },
    ) {
        if (reportFor != null) {
            Text(
                "Pilih alasan yang paling sesuai. Identitasmu tidak terlihat oleh pelapor lain.",
                style = sansStyle(14, 400, 1.5f, color = Muted),
            )
            Spacer(Modifier.height(12.dp))
            GROUP_REPORT_REASONS.forEach { item ->
                val active = reportReason == item.value
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 4.dp)
                        .clip(RoundedCornerShape(16.dp))
                        .background(if (active) Brand100 else Color.White)
                        .then(if (active) Modifier else Modifier.border(1.dp, Line, RoundedCornerShape(16.dp)))
                        .clickable { reportReason = item.value }
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
                        item.label,
                        style = sansStyle(15, 600, 1.3f, color = if (active) Brand700 else Ink),
                    )
                }
            }
            Spacer(Modifier.height(14.dp))
            Field(label = "Keterangan (opsional)") {
                KarsaTextField(
                    value = reportDetails,
                    onValueChange = { if (it.length <= 500) reportDetails = it },
                    placeholder = "Tambahkan konteks bila perlu",
                    singleLine = false,
                    minHeight = 76.dp,
                )
            }
        }
    }

    KarsaDialog(
        open = hideFor != null,
        onClose = {
            hideFor = null
            hideReason = ""
            hideError = null
        },
        tone = DialogTone.Danger,
        title = "Sembunyikan pesan",
        desc = "Pesan akan disembunyikan dari seluruh anggota grup. Alasan wajib diisi.",
        confirmLabel = "Sembunyikan",
        onConfirm = {
            val target = hideFor
            if (target != null) {
                if (hideReason.isBlank()) {
                    hideError = "Tulis alasan penyembunyian."
                } else {
                    scope.launch {
                        try {
                            groups.hide(id, target.id, hideReason.trim())
                            hideFor = null
                            hideReason = ""
                            hideError = null
                            state.notify("Pesan disembunyikan dari grup")
                        } catch (failure: Exception) {
                            state.notify(friendlyError(failure), ToastTone.Error)
                        }
                    }
                }
            }
        },
        content = {
            Spacer(Modifier.height(14.dp))
            Field(label = "Alasan") {
                KarsaTextField(
                    value = hideReason,
                    onValueChange = {
                        if (it.length <= 120) hideReason = it
                        hideError = null
                    },
                    placeholder = "Misalnya: keluar dari topik kelas",
                    singleLine = false,
                    minHeight = 76.dp,
                )
            }
            if (hideError != null) {
                Spacer(Modifier.height(8.dp))
                Text(hideError!!, style = sansStyle(12, 500, 1.4f, color = Danger500))
            }
        },
    )

    KarsaDialog(
        open = blockFor != null,
        onClose = { blockFor = null },
        tone = DialogTone.Danger,
        title = blockFor?.let { "Blokir ${displayName(it, course, state.role)}?" } ?: "",
        desc = "Pesan darinya akan disembunyikan di semua grup. Kamu bisa membuka blokir kapan saja.",
        confirmLabel = "Blokir",
        onConfirm = {
            val target = blockFor
            blockFor = null
            if (target != null && target.authorId.isNotBlank()) {
                scope.launch {
                    try {
                        groups.block(id, target.authorId, blocked = true)
                        state.notify("Pengguna diblokir")
                    } catch (failure: Exception) {
                        state.notify(friendlyError(failure), ToastTone.Error)
                    }
                }
            }
        },
    )

    KarsaDialog(
        open = unblockFor != null,
        onClose = { unblockFor = null },
        title = unblockFor?.let { "Buka blokir ${displayName(it, course, state.role)}?" } ?: "",
        desc = "Pesan dari pengguna ini akan terlihat lagi di semua grup.",
        confirmLabel = "Buka blokir",
        onConfirm = {
            val target = unblockFor
            unblockFor = null
            if (target != null && target.authorId.isNotBlank()) {
                scope.launch {
                    try {
                        groups.block(id, target.authorId, blocked = false)
                        state.notify("Blokir dibuka")
                    } catch (failure: Exception) {
                        state.notify(friendlyError(failure), ToastTone.Error)
                    }
                }
            }
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
            deleteFor = null
            if (target != null) {
                scope.launch {
                    try {
                        groups.delete(id, target.id)
                        state.notify("Pesan dihapus")
                    } catch (failure: Exception) {
                        state.notify(friendlyError(failure), ToastTone.Error)
                    }
                }
            }
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
                        .clickable(onClick = onOpen)
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
                        .padding(horizontal = 16.dp, vertical = 10.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    LucideIcon(KarsaIcons.EyeOff, modifier = Modifier.size(14.dp), tint = Muted)
                    Text(
                        msg.hiddenReason ?: "Pesan disembunyikan oleh PJ",
                        style = sansStyle(13, 400, 1.3f, color = Muted),
                    )
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
                                if (msg.from == "pj" || msg.isManagerAuthor) {
                                    Badge("PJ", tone = BadgeTone.Brand)
                                }
                            }
                            Spacer(Modifier.height(2.dp))
                        }
                        if (msg.replyToId != null) {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(if (mine) Color.White.copy(alpha = 0.14f) else Paper2)
                                    .padding(horizontal = 10.dp, vertical = 6.dp),
                            ) {
                                Text(
                                    msg.replyToName ?: "Pesan",
                                    style = sansStyle(11, 700, 1.3f, color = if (mine) Color.White else Brand700),
                                )
                                Text(
                                    msg.replyToText ?: "Pesan tidak tersedia",
                                    style = sansStyle(12, 400, 1.4f, color = if (mine) Color.White.copy(alpha = 0.85f) else Ink2),
                                    maxLines = 2,
                                    overflow = TextOverflow.Ellipsis,
                                )
                            }
                            Spacer(Modifier.height(6.dp))
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
