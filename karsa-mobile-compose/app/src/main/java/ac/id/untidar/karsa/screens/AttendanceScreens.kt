package ac.id.untidar.karsa.screens

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import ac.id.untidar.karsa.LocalApp
import ac.id.untidar.karsa.attendance.AttendanceHistoryDto
import ac.id.untidar.karsa.attendance.AttendanceStatus
import ac.id.untidar.karsa.attendance.StudentAttendanceCourseDto
import ac.id.untidar.karsa.icons.KarsaIcons
import ac.id.untidar.karsa.icons.LucideIcon
import ac.id.untidar.karsa.theme.Brand300
import ac.id.untidar.karsa.theme.Brand600
import ac.id.untidar.karsa.theme.Butter700
import ac.id.untidar.karsa.theme.Danger500
import ac.id.untidar.karsa.theme.Espresso
import ac.id.untidar.karsa.theme.Ink
import ac.id.untidar.karsa.theme.Ink2
import ac.id.untidar.karsa.theme.Leaf600
import ac.id.untidar.karsa.theme.Line
import ac.id.untidar.karsa.theme.Muted
import ac.id.untidar.karsa.theme.Paper3
import ac.id.untidar.karsa.theme.displayStyle
import ac.id.untidar.karsa.theme.sansStyle
import ac.id.untidar.karsa.ui.Avatar
import ac.id.untidar.karsa.ui.Badge
import ac.id.untidar.karsa.ui.BadgeTone
import ac.id.untidar.karsa.ui.BatikPattern
import ac.id.untidar.karsa.ui.ButtonVariant
import ac.id.untidar.karsa.ui.EmptyState
import ac.id.untidar.karsa.ui.KarsaButton
import ac.id.untidar.karsa.ui.KarsaCard
import ac.id.untidar.karsa.ui.ListSkeleton
import ac.id.untidar.karsa.ui.LoadStatus
import ac.id.untidar.karsa.ui.Rise
import ac.id.untidar.karsa.ui.Skeleton
import ac.id.untidar.karsa.ui.cardShadow

@Composable
fun StudentAttendanceView() {
    val state = LocalApp.current
    val attendance = state.attendance
    var openId by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) { attendance.loadStudent(force = true) }

    val summary = attendance.studentSummary
    val courses = summary?.courses.orEmpty()
    val exhausted = courses.count { it.exhausted }
    val semesterLine = listOfNotNull(
        summary?.kelas?.name?.takeIf { it.isNotBlank() },
        summary?.semester?.name?.takeIf { it.isNotBlank() }?.let { "Semester $it" },
    ).joinToString(" · ").ifBlank { state.academicLine }

    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        when {
            attendance.studentStatus == LoadStatus.Loading && summary == null -> {
                Skeleton(Modifier.fillMaxWidth().height(190.dp), RoundedCornerShape(32.dp))
                ListSkeleton(count = 2, lines = 2)
            }

            attendance.studentStatus == LoadStatus.Error && summary == null -> {
                KarsaCard {
                    EmptyState(
                        title = "Kehadiran belum termuat",
                        desc = attendance.studentError ?: "Periksa koneksi lalu coba lagi.",
                        icon = {
                            LucideIcon(
                                KarsaIcons.TriangleAlert,
                                modifier = Modifier.size(36.dp),
                                tint = Brand600,
                            )
                        },
                        action = {
                            KarsaButton(
                                "Coba lagi",
                                onClick = { attendance.loadStudent(force = true) },
                                variant = ButtonVariant.Soft,
                            )
                        },
                    )
                }
            }

            summary == null || summary.empty || courses.isEmpty() -> {
                KarsaCard {
                    EmptyState(
                        title = if (summary?.empty == true) {
                            "Belum ada kelas aktif"
                        } else {
                            "Belum ada catatan absensi"
                        },
                        desc = if (summary?.empty == true) {
                            "Kelas atau semester aktif angkatanmu belum tersedia."
                        } else {
                            "Catatan dari PJ akan muncul di sini."
                        },
                        icon = {
                            LucideIcon(
                                KarsaIcons.CheckCircle2,
                                modifier = Modifier.size(36.dp),
                                tint = Brand600,
                            )
                        },
                    )
                }
            }

            else -> {
                Rise { AttendanceHero(courses, exhausted, semesterLine) }

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 4.dp)
                        .padding(top = 4.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text("Jatah per mata kuliah", style = displayStyle(18, 700))
                    Text(
                        "${courses.size} matkul",
                        style = sansStyle(11, 600, 1.3f, color = Muted),
                    )
                }

                courses.forEachIndexed { index, course ->
                    Rise(delayMillis = 40 * (index + 1)) {
                        AttendanceCourseCard(
                            course = course,
                            open = openId == course.id,
                            onToggle = {
                                openId = if (openId == course.id) null else course.id
                            },
                        )
                    }
                }

                Text(
                    "Kuota tanpa keterangan maksimal 2 per matkul per semester. Sakit dan keterangan tidak mengurangi kuota.",
                    modifier = Modifier.padding(horizontal = 4.dp),
                    style = sansStyle(11, 400, 1.55f, color = Muted),
                )
            }
        }
    }
}

@Composable
private fun AttendanceHero(
    courses: List<StudentAttendanceCourseDto>,
    exhausted: Int,
    semesterLine: String,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .cardShadow(RoundedCornerShape(32.dp))
            .clip(RoundedCornerShape(32.dp))
            .background(Espresso)
            .padding(22.dp),
    ) {
        Box(Modifier.fillMaxWidth()) {
            BatikPattern(Modifier.matchParentSize(), color = Color.White, alpha = 0.12f)
            Column(Modifier.fillMaxWidth()) {
                Text(
                    "KEHADIRAN SEMESTER INI",
                    style = sansStyle(11, 700, 1.4f, 0.16f, Brand300),
                )
                Spacer(Modifier.height(10.dp))
                Row(verticalAlignment = Alignment.Bottom) {
                    Text(
                        "${courses.size}",
                        style = displayStyle(42, 800, 1f, color = Color.White),
                    )
                    Spacer(Modifier.width(8.dp))
                    Text(
                        "mata kuliah",
                        modifier = Modifier.padding(bottom = 6.dp),
                        style = sansStyle(13, 600, 1.3f, color = Color.White.copy(alpha = 0.75f)),
                    )
                }
                if (semesterLine.isNotBlank()) {
                    Spacer(Modifier.height(4.dp))
                    Text(
                        semesterLine,
                        style = sansStyle(12, 500, 1.4f, color = Color.White.copy(alpha = 0.72f)),
                    )
                }
                Spacer(Modifier.height(18.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    HeroStat(
                        courses.sumOf { it.counts.alpha },
                        "Tanpa ket.",
                        Modifier.weight(1f),
                    )
                    HeroStat(
                        courses.sumOf { it.counts.sakit },
                        "Sakit",
                        Modifier.weight(1f),
                    )
                    HeroStat(
                        courses.sumOf { it.counts.izin },
                        "Keterangan",
                        Modifier.weight(1f),
                    )
                }
                if (exhausted > 0) {
                    Spacer(Modifier.height(14.dp))
                    Badge("$exhausted matkul jatah habis", tone = BadgeTone.Danger)
                }
            }
        }
    }
}

@Composable
private fun HeroStat(value: Int, label: String, modifier: Modifier = Modifier) {
    Column(modifier) {
        Text("$value", style = displayStyle(22, 800, 1f, color = Color.White))
        Text(
            label,
            style = sansStyle(10, 600, 1.3f, color = Color.White.copy(alpha = 0.68f)),
        )
    }
}

@Composable
private fun AttendanceCourseCard(
    course: StudentAttendanceCourseDto,
    open: Boolean,
    onToggle: () -> Unit,
) {
    val rotation by animateFloatAsState(
        targetValue = if (open) 180f else 0f,
        animationSpec = tween(200),
        label = "attendanceChevron",
    )

    KarsaCard(Modifier.fillMaxWidth()) {
        Column {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable(onClick = onToggle)
                    .padding(16.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Avatar(name = course.matkul.name, size = 44.dp, square = true)
                Column(Modifier.weight(1f)) {
                    Text(
                        course.matkul.name,
                        style = sansStyle(15, 700, 1.25f),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    val meta = listOfNotNull(
                        course.matkul.code?.takeIf { it.isNotBlank() },
                        course.pj?.displayName?.let { "PJ $it" },
                    ).joinToString(" · ")
                    if (meta.isNotBlank()) {
                        Text(meta, style = sansStyle(11, 500, 1.3f, color = Muted))
                    }
                    Spacer(Modifier.height(9.dp))
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        QuotaDots(course.counts.alpha, course.alphaLimit)
                        Text(
                            "Tanpa ket. ${course.counts.alpha}/${course.alphaLimit}",
                            style = sansStyle(
                                11,
                                700,
                                1f,
                                color = if (course.exhausted) Danger500 else Ink2,
                            ),
                        )
                    }
                }
                Column(
                    horizontalAlignment = Alignment.End,
                    verticalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    Badge(
                        text = when {
                            course.alphaOver > 0 -> "Lewat ${course.alphaOver}"
                            course.alphaRemaining == 0 -> "Habis"
                            else -> "Sisa ${course.alphaRemaining}"
                        },
                        tone = when {
                            course.alphaOver > 0 || course.alphaRemaining == 0 -> BadgeTone.Danger
                            course.alphaRemaining == 1 -> BadgeTone.Butter
                            else -> BadgeTone.Leaf
                        },
                    )
                    Text(
                        "${course.counts.total} catatan",
                        style = sansStyle(10, 500, 1.2f, color = Muted),
                    )
                }
                LucideIcon(
                    KarsaIcons.ChevronDown,
                    modifier = Modifier.size(18.dp).graphicsLayer { rotationZ = rotation },
                    tint = Muted,
                )
            }

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp)
                    .padding(bottom = 14.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                if (course.counts.sakit > 0) {
                    Badge("Sakit ${course.counts.sakit}", tone = BadgeTone.Butter)
                }
                if (course.counts.izin > 0) {
                    Badge("Keterangan ${course.counts.izin}", tone = BadgeTone.Leaf)
                }
                if (course.counts.total == 0) {
                    Text(
                        "Belum ada catatan",
                        style = sansStyle(11, 500, 1.3f, color = Muted),
                    )
                }
                Spacer(Modifier.weight(1f))
                if (course.history.isNotEmpty()) {
                    Text(
                        "${course.history.size} riwayat",
                        style = sansStyle(10, 500, 1.2f, color = Muted),
                    )
                }
            }

            if (open) {
                Box(Modifier.fillMaxWidth().height(1.dp).background(Line))
                if (course.history.isEmpty()) {
                    Text(
                        "Belum ada riwayat untuk matkul ini.",
                        modifier = Modifier.fillMaxWidth().padding(16.dp),
                        style = sansStyle(12, 400, 1.5f, color = Muted),
                    )
                } else {
                    course.history.forEach { entry -> AttendanceHistoryRow(entry) }
                    Spacer(Modifier.height(4.dp))
                }
            }
        }
    }
}

@Composable
private fun AttendanceHistoryRow(entry: AttendanceHistoryDto) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 10.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        verticalAlignment = Alignment.Top,
    ) {
        Box(
            Modifier
                .padding(top = 5.dp)
                .size(8.dp)
                .clip(CircleShape)
                .background(entry.statusKind.dotColor()),
        )
        Column(Modifier.weight(1f)) {
            Text(entry.dateLabel, style = sansStyle(13, 600, 1.3f, color = Ink))
            if (!entry.catatan.isNullOrBlank()) {
                Text(
                    "“${entry.catatan}”",
                    modifier = Modifier.padding(top = 3.dp),
                    style = sansStyle(12, 400, 1.5f, color = Ink2),
                )
            }
        }
        Badge(entry.statusKind.label, tone = entry.statusKind.badgeTone())
    }
}

@Composable
private fun QuotaDots(alpha: Int, limit: Int) {
    Row(
        horizontalArrangement = Arrangement.spacedBy(4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        repeat(limit.coerceAtLeast(0)) { index ->
            Box(
                Modifier
                    .size(9.dp)
                    .clip(CircleShape)
                    .background(if (index < alpha) Danger500 else Paper3),
            )
        }
        if (alpha > limit) {
            Text("+${alpha - limit}", style = sansStyle(10, 700, 1f, color = Danger500))
        }
    }
}

private fun AttendanceStatus.badgeTone(): BadgeTone = when (this) {
    AttendanceStatus.TanpaKeterangan -> BadgeTone.Danger
    AttendanceStatus.Sakit -> BadgeTone.Butter
    AttendanceStatus.Izin -> BadgeTone.Leaf
}

private fun AttendanceStatus.dotColor(): Color = when (this) {
    AttendanceStatus.TanpaKeterangan -> Danger500
    AttendanceStatus.Sakit -> Butter700
    AttendanceStatus.Izin -> Leaf600
}
