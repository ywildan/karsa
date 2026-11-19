package ac.id.untidar.karsa.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import ac.id.untidar.karsa.LocalApp
import ac.id.untidar.karsa.Route
import ac.id.untidar.karsa.ToastTone
import ac.id.untidar.karsa.data.CATEGORIES
import ac.id.untidar.karsa.data.POINT_LABELS
import ac.id.untidar.karsa.data.Student
import ac.id.untidar.karsa.data.SearchResult
import ac.id.untidar.karsa.data.courseById
import ac.id.untidar.karsa.data.maskNim
import ac.id.untidar.karsa.data.myCourses
import ac.id.untidar.karsa.data.searchStudents
import ac.id.untidar.karsa.data.studentById
import ac.id.untidar.karsa.icons.KarsaIcons
import ac.id.untidar.karsa.icons.LucideIcon
import ac.id.untidar.karsa.theme.Brand100
import ac.id.untidar.karsa.theme.Brand500
import ac.id.untidar.karsa.theme.Brand600
import ac.id.untidar.karsa.theme.Brand700
import ac.id.untidar.karsa.theme.Butter100
import ac.id.untidar.karsa.theme.Butter700
import ac.id.untidar.karsa.theme.Espresso
import ac.id.untidar.karsa.theme.Ink
import ac.id.untidar.karsa.theme.Ink2
import ac.id.untidar.karsa.theme.Leaf500
import ac.id.untidar.karsa.theme.Line
import ac.id.untidar.karsa.theme.Muted
import ac.id.untidar.karsa.theme.Paper
import ac.id.untidar.karsa.theme.Paper2
import ac.id.untidar.karsa.theme.Paper3
import ac.id.untidar.karsa.ui.brandShadow
import ac.id.untidar.karsa.theme.displayStyle
import ac.id.untidar.karsa.ui.popShadow
import ac.id.untidar.karsa.theme.sansStyle
import ac.id.untidar.karsa.ui.Avatar
import ac.id.untidar.karsa.ui.Badge
import ac.id.untidar.karsa.ui.BadgeTone
import ac.id.untidar.karsa.ui.ButtonSize
import ac.id.untidar.karsa.ui.EmptyState
import ac.id.untidar.karsa.ui.Field
import ac.id.untidar.karsa.ui.Gate
import ac.id.untidar.karsa.ui.KarsaButton
import ac.id.untidar.karsa.ui.KarsaCard
import ac.id.untidar.karsa.ui.KarsaTextField
import ac.id.untidar.karsa.ui.PageHeader
import ac.id.untidar.karsa.ui.Rise
import ac.id.untidar.karsa.ui.SearchField
import ac.id.untidar.karsa.ui.SelectField
import ac.id.untidar.karsa.ui.SheetOption
import ac.id.untidar.karsa.ui.Skeleton
import ac.id.untidar.karsa.ui.rememberLoad

private enum class StepState { Done, Active, Todo }

@Composable
private fun Step(
    number: Int,
    title: String,
    state: StepState,
    last: Boolean = false,
    onEdit: (() -> Unit)? = null,
    summary: @Composable () -> Unit = {},
    content: @Composable ColumnScope.() -> Unit = {},
) {
    Row(Modifier.fillMaxWidth().height(IntrinsicSize.Min), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
        Column(Modifier.fillMaxHeight(), horizontalAlignment = Alignment.CenterHorizontally) {
            Box(
                modifier = Modifier
                    .size(32.dp)
                    .clip(CircleShape)
                    .then(
                        when (state) {
                            StepState.Done -> Modifier
                            StepState.Active -> Modifier.brandShadow(CircleShape)
                            StepState.Todo -> Modifier
                        },
                    )
                    .background(
                        when (state) {
                            StepState.Done -> Leaf500
                            StepState.Active -> Brand500
                            StepState.Todo -> Paper2
                        },
                    ),
                contentAlignment = Alignment.Center,
            ) {
                if (state == StepState.Done) {
                    LucideIcon(
                        KarsaIcons.Check,
                        modifier = Modifier.size(16.dp),
                        tint = Color.White,
                        strokeWidth = 3f,
                    )
                } else {
                    Text(
                        "$number",
                        style = displayStyle(14, 700, 1f, color = if (state == StepState.Active) Color.White else Muted),
                    )
                }
            }
            if (!last) {
                Box(
                    Modifier
                        .padding(top = 6.dp)
                        .width(2.dp)
                        .weight(1f)
                        .background(if (state == StepState.Done) Leaf500.copy(alpha = 0.35f) else Paper3),
                )
            }
        }
        Column(Modifier.weight(1f).padding(bottom = if (last) 0.dp else 24.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth().height(32.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    title,
                    style = sansStyle(15, 700, 1.3f, color = if (state == StepState.Todo) Muted else Ink),
                )
                if (state == StepState.Done && onEdit != null) {
                    Text(
                        "Ubah",
                        modifier = Modifier
                            .clip(CircleShape)
                            .clickable(onClick = onEdit)
                            .padding(horizontal = 8.dp, vertical = 4.dp),
                        style = sansStyle(13, 600, 1.3f, color = Brand700),
                    )
                }
            }
            when (state) {
                StepState.Active -> Rise {
                    Column(Modifier.padding(top = 12.dp), content = content)
                }
                StepState.Done -> Column(Modifier.padding(top = 2.dp)) { summary() }
                StepState.Todo -> Column(Modifier.padding(top = 2.dp)) { summary() }
            }
        }
    }
}

@Composable
fun InputPoin() {
    val state = LocalApp.current
    val load = rememberLoad()
    val scope = rememberCoroutineScope()
    val courses = myCourses(state.role)

    var courseId by remember { mutableStateOf(courses.firstOrNull()?.id ?: "c1") }
    var student by remember { mutableStateOf<Student?>(null) }
    var q by remember { mutableStateOf("") }
    var category by remember { mutableStateOf("") }
    var points by remember { mutableIntStateOf(1) }
    var note by remember { mutableStateOf("") }
    var editing by remember { mutableStateOf<Int?>(null) }
    var saving by remember { mutableStateOf(false) }
    val scrollState = rememberScrollState()

    val done1 = courseId.isNotEmpty()
    val done2 = student != null
    val done3 = category.isNotEmpty()
    val firstIncomplete = if (!done1) 1 else if (!done2) 2 else 3
    val active = editing ?: firstIncomplete
    val ready = done1 && done2 && done3

    val result = searchStudents(q)
    val recents = state.entries.map { it.studentId }.distinct().take(4).map { studentById(it) }

    val hint = when {
        !done1 -> "Langkah 1 dari 3 · Pilih matkul"
        !done2 -> "Langkah 2 dari 3 · Pilih mahasiswa"
        !done3 -> "Langkah 3 dari 3 · Pilih kategori"
        else -> "Siap: +$points untuk ${student!!.name.split(" ").take(2).joinToString(" ")}"
    }

    fun reset() {
        student = null
        q = ""
        category = ""
        points = 1
        note = ""
        editing = null
        scope.launch { scrollState.animateScrollTo(0) }
    }

    fun submit() {
        val target = student ?: return
        if (!ready) return
        saving = true
        scope.launch {
            delay(800)
            state.addEntry(
                studentId = target.id,
                points = points,
                categoryId = category,
                courseId = courseId,
                note = note.trim().ifEmpty { null },
            )
            saving = false
            state.notify(
                "+$points poin untuk ${target.name.split(" ").take(2).joinToString(" ")} tercatat",
                ToastTone.Success,
                actionLabel = "Lihat",
                onAction = { state.go(Route.History) },
            )
            reset()
        }
    }

    fun pickStudent(picked: Student) {
        student = picked
        q = ""
        editing = null
    }

    Box(Modifier.fillMaxSize().background(Paper)) {
        Column(Modifier.fillMaxSize().imePadding()) {
            PageHeader(
                title = "Input poin",
                eyebrow = {
                    Badge(
                        "PJ KELAS",
                        tone = BadgeTone.Dark,
                        icon = { LucideIcon(KarsaIcons.ShieldCheck, modifier = Modifier.size(12.dp), tint = Color.White) },
                    )
                },
                subtitle = "Catat kontribusi mahasiswa",
            )
            Column(
                modifier = Modifier
                    .weight(1f)
                    .verticalScroll(scrollState)
                    .padding(horizontal = 20.dp)
                    .padding(bottom = 300.dp),
            ) {
                Gate(
                    status = load.status,
                    onRetry = load.retry,
                    skeleton = {
                        KarsaCard(Modifier.fillMaxWidth()) {
                            Column(Modifier.padding(24.dp), verticalArrangement = Arrangement.spacedBy(20.dp)) {
                                repeat(3) {
                                    Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                                        Skeleton(Modifier.size(32.dp), CircleShape)
                                        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                            Skeleton(Modifier.fillMaxWidth(0.33f).height(16.dp))
                                            Skeleton(Modifier.fillMaxWidth().height(48.dp), RoundedCornerShape(16.dp))
                                        }
                                    }
                                }
                            }
                        }
                    },
                ) {
                    if (courses.isEmpty()) {
                        KarsaCard {
                            EmptyState(
                                title = "Belum ada kelas yang kamu PJ-i",
                                desc = "Hubungi admin program studi agar kamu ditetapkan sebagai PJ kelas.",
                                icon = { LucideIcon(KarsaIcons.UserRoundX, modifier = Modifier.size(36.dp), tint = Brand600) },
                            )
                        }
                    } else {
                        KarsaCard(Modifier.fillMaxWidth().widthIn(max = 480.dp)) {
                            Column(Modifier.padding(24.dp)) {
                                Step(
                                    number = 1,
                                    title = "Mata kuliah",
                                    state = when {
                                        active == 1 -> StepState.Active
                                        done1 -> StepState.Done
                                        else -> StepState.Todo
                                    },
                                    onEdit = { editing = 1 },
                                    summary = {
                                        if (done1) {
                                            Text(
                                                buildString {
                                                    append(courseById(courseId).name)
                                                    append(" · ")
                                                    append(courseById(courseId).kelas)
                                                },
                                                style = sansStyle(15, 400, 1.5f, color = Ink2),
                                            )
                                        }
                                    },
                                ) {
                                    SelectField(
                                        value = courseId,
                                        options = courses.map {
                                            SheetOption(it.id, "${it.name} · ${it.kelas}", "${it.members} mahasiswa")
                                        },
                                        onChange = {
                                            courseId = it
                                            editing = null
                                        },
                                        placeholder = "Pilih mata kuliah",
                                        sheetTitle = "Pilih mata kuliah",
                                    )
                                    Row(
                                        modifier = Modifier.padding(top = 8.dp),
                                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                    ) {
                                        LucideIcon(KarsaIcons.Sparkles, modifier = Modifier.size(14.dp), tint = Brand500)
                                        Text(
                                            "Matkul terakhir diingat otomatis.",
                                            style = sansStyle(12, 400, 1.4f, color = Muted),
                                        )
                                    }
                                }

                                Step(
                                    number = 2,
                                    title = "Mahasiswa",
                                    state = when {
                                        active == 2 -> StepState.Active
                                        done2 -> StepState.Done
                                        else -> StepState.Todo
                                    },
                                    onEdit = { editing = 2 },
                                    summary = {
                                        val picked = student
                                        if (picked != null) {
                                            Row(
                                                modifier = Modifier
                                                    .fillMaxWidth()
                                                    .clip(RoundedCornerShape(16.dp))
                                                    .background(Paper2)
                                                    .padding(start = 10.dp, end = 16.dp, top = 10.dp, bottom = 10.dp),
                                                horizontalArrangement = Arrangement.spacedBy(12.dp),
                                                verticalAlignment = Alignment.CenterVertically,
                                            ) {
                                                Avatar(name = picked.name, size = 38.dp)
                                                Column {
                                                    Text(
                                                        picked.name,
                                                        style = sansStyle(15, 600, 1.3f),
                                                        maxLines = 1,
                                                        overflow = TextOverflow.Ellipsis,
                                                    )
                                                    Text(maskNim(picked.nim), style = sansStyle(12, 400, 1.4f, color = Muted))
                                                }
                                            }
                                        } else {
                                            Text(
                                                "Cari berdasarkan nama atau NIM",
                                                style = sansStyle(13, 400, 1.4f, color = Muted.copy(alpha = 0.8f)),
                                            )
                                        }
                                    },
                                ) {
                                    SearchField(value = q, onChange = { q = it }, placeholder = "Cari nama atau NIM")
                                    if (q.isBlank()) {
                                        Text(
                                            "Nama, NIM, atau 2-4 digit terakhir. Minimal 3 huruf atau 2 digit.",
                                            modifier = Modifier.padding(top = 8.dp, start = 4.dp),
                                            style = sansStyle(12, 400, 1.625f, color = Muted),
                                        )
                                        Column(Modifier.padding(top = 16.dp)) {
                                            Row(
                                                horizontalArrangement = Arrangement.spacedBy(6.dp),
                                                verticalAlignment = Alignment.CenterVertically,
                                            ) {
                                                LucideIcon(KarsaIcons.Clock, modifier = Modifier.size(14.dp), tint = Muted)
                                                Text("Baru-baru ini", style = sansStyle(12, 600, 1.4f, color = Muted))
                                            }
                                            Spacer(Modifier.height(8.dp))
                                            Row(
                                                modifier = Modifier.horizontalScroll(rememberScrollState()),
                                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                            ) {
                                                recents.forEach { recent ->
                                                    Row(
                                                        modifier = Modifier
                                                            .clip(CircleShape)
                                                            .background(Paper2)
                                                            .clickable { pickStudent(recent) }
                                                            .padding(start = 4.dp, end = 14.dp, top = 4.dp, bottom = 4.dp),
                                                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                                                        verticalAlignment = Alignment.CenterVertically,
                                                    ) {
                                                        Avatar(name = recent.name, size = 26.dp)
                                                        Text(
                                                            recent.name.split(" ").first(),
                                                            style = sansStyle(13, 600, 1.3f),
                                                        )
                                                    }
                                                }
                                            }
                                        }
                                    } else {
                                        when (result) {
                                            is SearchResult.Hint -> if (result.message.isNotEmpty()) {
                                                Text(
                                                    result.message,
                                                    modifier = Modifier
                                                        .padding(top = 12.dp)
                                                        .fillMaxWidth()
                                                        .clip(RoundedCornerShape(12.dp))
                                                        .background(Butter100)
                                                        .padding(horizontal = 14.dp, vertical = 10.dp),
                                                    style = sansStyle(13, 500, 1.5f, color = Butter700),
                                                )
                                            }
                                            is SearchResult.Found -> {
                                                if (result.items.isEmpty()) {
                                                    Column(
                                                        modifier = Modifier
                                                            .padding(top = 16.dp)
                                                            .fillMaxWidth()
                                                            .clip(RoundedCornerShape(16.dp))
                                                            .background(Paper2)
                                                            .padding(16.dp),
                                                        horizontalAlignment = Alignment.CenterHorizontally,
                                                    ) {
                                                        LucideIcon(KarsaIcons.SearchX, modifier = Modifier.size(28.dp), tint = Muted)
                                                        Text("Mahasiswa tidak ditemukan", style = sansStyle(14, 600, 1.4f))
                                                        Text(
                                                            "Periksa ejaan atau coba 2–4 digit terakhir NIM.",
                                                            style = sansStyle(12, 400, 1.4f, color = Muted),
                                                        )
                                                    }
                                                } else {
                                                    Column(
                                                        modifier = Modifier
                                                            .padding(top = 12.dp)
                                                            .fillMaxWidth()
                                                            .clip(RoundedCornerShape(16.dp))
                                                            .background(Color.White)
                                                            .border(1.dp, Line, RoundedCornerShape(16.dp)),
                                                    ) {
                                                        result.items.forEachIndexed { index, item ->
                                                            Row(
                                                                modifier = Modifier
                                                                    .fillMaxWidth()
                                                                    .clickable { pickStudent(item) }
                                                                    .padding(horizontal = 14.dp, vertical = 12.dp),
                                                                horizontalArrangement = Arrangement.spacedBy(12.dp),
                                                                verticalAlignment = Alignment.CenterVertically,
                                                            ) {
                                                                Avatar(name = item.name, size = 40.dp)
                                                                Column(Modifier.weight(1f)) {
                                                                    Text(
                                                                        item.name,
                                                                        style = sansStyle(15, 600, 1.3f),
                                                                        maxLines = 1,
                                                                        overflow = TextOverflow.Ellipsis,
                                                                    )
                                                                    Text(maskNim(item.nim), style = sansStyle(12, 400, 1.4f, color = Muted))
                                                                }
                                                                LucideIcon(KarsaIcons.ChevronRight, modifier = Modifier.size(20.dp), tint = Muted)
                                                            }
                                                            if (index != result.items.lastIndex) {
                                                                Box(Modifier.fillMaxWidth().height(1.dp).background(Line))
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }

                                Step(
                                    number = 3,
                                    title = "Kontribusi",
                                    last = true,
                                    state = when {
                                        active == 3 -> StepState.Active
                                        done3 && editing == null -> StepState.Done
                                        else -> StepState.Todo
                                    },
                                    onEdit = { editing = 3 },
                                    summary = {
                                        Text(
                                            if (done3) {
                                                "${CATEGORIES.firstOrNull { it.id == category }?.label} · +$points poin"
                                            } else {
                                                "Kategori, poin, dan catatan"
                                            },
                                            style = sansStyle(15, 400, 1.5f, color = if (done3) Ink2 else Muted.copy(alpha = 0.8f)),
                                        )
                                    },
                                ) {
                                    Column(verticalArrangement = Arrangement.spacedBy(20.dp)) {
                                        SelectField(
                                            value = category,
                                            options = CATEGORIES.map { SheetOption(it.id, it.label) },
                                            onChange = { category = it },
                                            label = "Kategori",
                                            placeholder = "Pilih kategori kontribusi",
                                            sheetTitle = "Kategori kontribusi",
                                        )
                                        Column {
                                            Text("Poin", style = sansStyle(13, 600, 1.4f, color = Ink2))
                                            Spacer(Modifier.height(8.dp))
                                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                                (1..4).forEach { value ->
                                                    val selected = points == value
                                                    Column(
                                                        modifier = Modifier
                                                            .weight(1f)
                                                            .clip(RoundedCornerShape(16.dp))
                                                            .then(if (selected) Modifier.background(Brand500) else Modifier.background(Paper2))
                                                            .clickable { points = value }
                                                            .padding(vertical = 12.dp),
                                                        horizontalAlignment = Alignment.CenterHorizontally,
                                                    ) {
                                                        Text(
                                                            "$value",
                                                            style = displayStyle(26, 800, 1f, color = if (selected) Color.White else Ink),
                                                        )
                                                        Spacer(Modifier.height(6.dp))
                                                        Text(
                                                            POINT_LABELS.getValue(value),
                                                            style = sansStyle(
                                                                11,
                                                                600,
                                                                1.2f,
                                                                color = if (selected) Color.White.copy(alpha = 0.85f) else Muted,
                                                            ),
                                                        )
                                                    }
                                                }
                                            }
                                        }
                                        Field(
                                            label = "Catatan",
                                            right = {
                                                Text(
                                                    "${note.length}/500 · Opsional",
                                                    style = sansStyle(12, 500, 1.2f, color = Muted),
                                                )
                                            },
                                        ) {
                                            KarsaTextField(
                                                value = note,
                                                onValueChange = { if (it.length <= 500) note = it },
                                                placeholder = "Contoh: menjelaskan konsep indeks dengan contoh kasus.",
                                                singleLine = false,
                                                minHeight = 96.dp,
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

        if (load.status == ac.id.untidar.karsa.ui.LoadStatus.Ready && courses.isNotEmpty()) {
            Column(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .navigationBarsPadding()
                    .padding(horizontal = 12.dp)
                    .padding(bottom = 134.dp)
                    .widthIn(max = 480.dp),
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .popShadow(RoundedCornerShape(28.dp))
                        .clip(RoundedCornerShape(28.dp))
                        .background(Color.White)
                        .padding(14.dp),
                ) {
                    Row(
                        modifier = Modifier.padding(start = 4.dp, end = 4.dp, bottom = 12.dp),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                            listOf(done1, done2, done3).forEach { done ->
                                Box(
                                    Modifier
                                        .height(6.dp)
                                        .width(20.dp)
                                        .clip(CircleShape)
                                        .background(if (done) Leaf500 else Paper3),
                                )
                            }
                        }
                        Text(
                            hint,
                            style = sansStyle(12, 600, 1.4f, color = if (ready) ac.id.untidar.karsa.theme.Leaf600 else Ink2),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }
                    KarsaButton(
                        text = "Input poin",
                        onClick = ::submit,
                        size = ButtonSize.Lg,
                        full = true,
                        enabled = ready,
                        loading = saving,
                    )
                }
            }
        }
    }
}
