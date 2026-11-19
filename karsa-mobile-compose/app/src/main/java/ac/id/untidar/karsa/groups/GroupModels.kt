package ac.id.untidar.karsa.groups

import ac.id.untidar.karsa.data.Course
import ac.id.untidar.karsa.data.Msg
import ac.id.untidar.karsa.data.Tone
import ac.id.untidar.karsa.lib.parseTimestamp
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class GroupCourseDto(
    val name: String = "Mata kuliah",
    val code: String = "",
)

@Serializable
data class GroupClassDto(val name: String = "Kelas")

@Serializable
data class GroupPersonDto(
    val id: String = "",
    val name: String = "Tanpa nama",
    val image: String? = null,
)

@Serializable
data class GroupMessagePreviewDto(
    val id: String = "",
    val state: String = "active",
    val text: String? = null,
    val author: GroupPersonDto? = null,
    @SerialName("created_at") val createdAt: String? = null,
)

@Serializable
data class GroupSummaryDto(
    val id: String,
    val matkul: GroupCourseDto = GroupCourseDto(),
    val kelas: GroupClassDto = GroupClassDto(),
    val pj: GroupPersonDto = GroupPersonDto(),
    @SerialName("member_count") val memberCount: Int = 0,
    @SerialName("is_manager") val isManager: Boolean = false,
    @SerialName("is_locked") val isLocked: Boolean = false,
    @SerialName("last_message") val lastMessage: GroupMessagePreviewDto? = null,
)

@Serializable
data class GroupReplyDto(
    val id: String = "",
    val state: String = "active",
    val text: String? = null,
    val author: GroupPersonDto? = null,
)

@Serializable
data class GroupAuthorDto(
    val id: String = "",
    val name: String = "Tanpa nama",
    val image: String? = null,
    @SerialName("is_group_manager") val isGroupManager: Boolean = false,
)

@Serializable
data class GroupMessageDto(
    val id: String,
    val state: String = "active",
    val text: String? = null,
    @SerialName("hidden_reason") val hiddenReason: String? = null,
    @SerialName("edited_at") val editedAt: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("updated_at") val updatedAt: String? = null,
    @SerialName("is_pinned") val isPinned: Boolean = false,
    @SerialName("is_own") val isOwn: Boolean = false,
    @SerialName("can_edit") val canEdit: Boolean = false,
    @SerialName("can_delete") val canDelete: Boolean = false,
    @SerialName("can_manage") val canManage: Boolean = false,
    val author: GroupAuthorDto = GroupAuthorDto(),
    @SerialName("reply_to") val replyTo: GroupReplyDto? = null,
)

@Serializable
data class GroupPageInfoDto(
    @SerialName("is_manager") val isManager: Boolean = false,
    @SerialName("is_locked") val isLocked: Boolean = false,
)

@Serializable
data class GroupMessagePageDto(
    val group: GroupPageInfoDto = GroupPageInfoDto(),
    val messages: List<GroupMessageDto> = emptyList(),
    @SerialName("pinned_messages") val pinnedMessages: List<GroupMessageDto> = emptyList(),
    @SerialName("next_cursor") val nextCursor: String? = null,
)

@Serializable
data class GroupReportMessageDto(
    val id: String = "",
    val body: String? = null,
    val author: GroupPersonDto? = null,
)

@Serializable
data class GroupReportDto(
    val id: String,
    val reason: String = "OTHER",
    val details: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
    val reporter: GroupPersonDto? = null,
    val message: GroupReportMessageDto? = null,
)

data class GroupPreview(
    val text: String,
    val ts: Long,
    val italic: Boolean = false,
)

data class GroupRoom(
    val dto: GroupSummaryDto,
    val course: Course,
    val preview: GroupPreview,
)

private val GROUP_TONES = listOf(Tone.Brand, Tone.Tide, Tone.Leaf, Tone.Plum, Tone.Butter, Tone.Clay)

fun GroupSummaryDto.toCourse(index: Int): Course = Course(
    id = id,
    name = matkul.name,
    kelas = kelas.name,
    members = memberCount,
    locked = isLocked,
    pjMe = isManager,
    pjOther = pj.name,
    tone = GROUP_TONES[index % GROUP_TONES.size],
)

fun GroupSummaryDto.toRoom(index: Int): GroupRoom {
    val course = toCourse(index)
    return GroupRoom(dto = this, course = course, preview = lastMessage.toPreview(course, isManager))
}

fun GroupMessagePreviewDto?.toPreview(course: Course, isManager: Boolean): GroupPreview {
    if (this == null) return GroupPreview("Belum ada pesan", 0)
    val time = parseTimestamp(createdAt)
    return when (state) {
        "deleted" -> GroupPreview("Pesan telah dihapus", time, italic = true)
        "hidden" -> GroupPreview("Pesan disembunyikan oleh PJ", time, italic = true)
        "blocked" -> GroupPreview("Pesan dari pengguna yang diblokir", time, italic = true)
        else -> {
            val who = author?.name ?: "Seseorang"
            GroupPreview("$who: ${text.orEmpty()}", time)
        }
    }
}

fun GroupMessageDto.toMsg(): Msg = Msg(
    id = id,
    from = when {
        isOwn -> "me"
        author.isGroupManager -> "pj"
        else -> author.id
    },
    text = when (state) {
        "deleted" -> "Pesan ini telah dihapus"
        "hidden" -> hiddenReason ?: "Pesan disembunyikan oleh PJ"
        "blocked" -> "Pesan dari pengguna yang diblokir"
        else -> text.orEmpty()
    },
    ts = parseTimestamp(createdAt),
    pinned = isPinned,
    deleted = state == "deleted",
    edited = editedAt != null,
    hidden = state == "hidden",
    authorId = author.id,
    authorName = if (isOwn) "Kamu" else author.name,
    isManagerAuthor = author.isGroupManager,
    canEdit = canEdit,
    canDelete = canDelete,
    canManage = canManage,
    blocked = state == "blocked",
    hiddenReason = hiddenReason,
    replyToId = replyTo?.id,
    replyToName = replyTo?.author?.name,
    replyToText = replyTo?.text,
    state = state,
)

fun GroupMessageDto.toPreview(course: Course, isManager: Boolean): GroupPreview {
    val time = parseTimestamp(createdAt)
    val who = when {
        isOwn -> "Kamu"
        author.isGroupManager -> author.name
        else -> author.name.split(" ").firstOrNull() ?: author.name
    }
    val previewText = when (state) {
        "deleted" -> "Pesan telah dihapus"
        "hidden" -> "Pesan disembunyikan oleh PJ"
        "blocked" -> "Pesan dari pengguna yang diblokir"
        else -> "$who: ${text.orEmpty()}"
    }
    return GroupPreview(previewText, time, italic = state != "active")
}

fun Msg.toPreviewDto(): GroupMessagePreviewDto = GroupMessagePreviewDto(
    id = id,
    state = state,
    text = text,
    author = GroupPersonDto(id = authorId, name = authorName.ifBlank { "Kamu" }),
    createdAt = null,
)
