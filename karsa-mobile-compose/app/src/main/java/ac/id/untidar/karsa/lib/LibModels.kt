package ac.id.untidar.karsa.lib

import ac.id.untidar.karsa.data.Article
import ac.id.untidar.karsa.data.ArticleStatus
import ac.id.untidar.karsa.data.Comment
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import java.time.OffsetDateTime

@Serializable
data class LibFacultyDto(
    val id: String,
    val name: String = "Fakultas",
)

@Serializable
data class LibProgramDto(
    val id: String,
    val name: String = "Program studi",
    @SerialName("faculty_id") val facultyId: String = "",
)

@Serializable
data class LibSemesterDto(val name: String? = null)

@Serializable
data class LibClassDto(
    val id: String,
    val name: String = "Kelas",
    @SerialName("prodi_id") val programId: String = "",
    val semester: LibSemesterDto? = null,
)

@Serializable
data class LibProfileDto(
    @SerialName("display_name") val displayName: String = "Mahasiswa",
    val faculty: String = "",
    @SerialName("prodi_id") val programId: String = "",
    @SerialName("faculty_id") val facultyId: String? = null,
    @SerialName("kelas_id") val classId: String? = null,
)

@Serializable
data class LibAuthorRequestDto(
    val status: String? = null,
    @SerialName("decision_note") val decisionNote: String? = null,
)

@Serializable
data class LibBootstrapDto(
    val faculties: List<LibFacultyDto> = emptyList(),
    val programs: List<LibProgramDto> = emptyList(),
    val classes: List<LibClassDto> = emptyList(),
    @SerialName("can_write") val canWrite: Boolean = false,
    val profile: LibProfileDto? = null,
    @SerialName("latest_author_request") val latestRequest: LibAuthorRequestDto? = null,
)

@Serializable
data class LibAuthorBriefDto(
    val id: String = "",
    val name: String = "Mahasiswa Karsa",
    val faculty: String? = null,
    @SerialName("prodi_name") val prodiName: String? = null,
)

@Serializable
data class LibArticleDto(
    val id: String,
    val title: String = "Tanpa judul",
    @SerialName("body_preview") val bodyPreview: String? = null,
    val body: String? = null,
    val author: LibAuthorBriefDto? = null,
    @SerialName("author_id") val authorId: String? = null,
    val views: Int = 0,
    @SerialName("period_views") val periodViews: Int? = null,
    @SerialName("comments_count") val commentsCount: Int = 0,
    @SerialName("published_at") val publishedAt: String? = null,
    @SerialName("updated_at") val updatedAt: String? = null,
    @SerialName("archived_at") val archivedAt: String? = null,
    val status: String? = null,
    @SerialName("ai_enabled") val aiEnabled: Boolean = false,
    @SerialName("ai_revision") val aiRevision: String? = null,
)

@Serializable
data class LibCommentDto(
    val id: String,
    val author: String = "Mahasiswa Karsa",
    val body: String? = null,
    @SerialName("is_own") val isOwn: Boolean = false,
    @SerialName("is_deleted") val isDeleted: Boolean = false,
    @SerialName("created_at") val createdAt: String? = null,
    val replies: List<LibCommentDto> = emptyList(),
)

@Serializable
data class LibAuthorProfileDto(
    val id: String,
    val name: String = "Mahasiswa Karsa",
    val faculty: String = "",
    @SerialName("prodi_name") val programName: String = "",
    @SerialName("total_views") val totalViews: Int = 0,
    @SerialName("article_count") val articleCount: Int = 0,
    val image: String? = null,
    val articles: List<LibArticleDto> = emptyList(),
)

data class LibDocxResult(
    val article: LibArticleDto,
    val droppedImages: Int,
    val warnings: List<String>,
)

fun parseTimestamp(raw: String?): Long {
    if (raw.isNullOrBlank()) return System.currentTimeMillis()
    return runCatching {
        OffsetDateTime.parse(raw).toInstant().toEpochMilli()
    }.getOrElse { System.currentTimeMillis() }
}

fun LibArticleDto.toArticle(uid: String, fullBody: Boolean = false): Article {
    val brief = author
    val articleStatus = when (status?.uppercase()) {
        "DRAFT" -> ArticleStatus.Draft
        "PUBLISHED" -> ArticleStatus.Published
        "ARCHIVED" -> ArticleStatus.Archived
        else -> null
    }
    val stamp = parseTimestamp(publishedAt ?: updatedAt)
    return Article(
        id = id,
        title = title,
        body = if (fullBody) body ?: bodyPreview.orEmpty() else bodyPreview ?: body.orEmpty(),
        author = brief?.name ?: "Mahasiswa Karsa",
        prodi = brief?.prodiName ?: brief?.faculty.orEmpty(),
        ts = stamp,
        readers = views,
        tag = brief?.prodiName ?: "Karsa Lib",
        mine = brief?.id == uid || authorId == uid,
        status = articleStatus,
        authorId = brief?.id ?: authorId.orEmpty(),
        commentsCount = commentsCount,
        updatedAt = parseTimestamp(updatedAt),
        aiEnabled = aiEnabled,
        aiRevision = aiRevision,
    )
}

fun LibCommentDto.toComments(articleId: String, parentId: String? = null): List<Comment> {
    val head = Comment(
        id = id,
        articleId = articleId,
        parentId = parentId,
        author = author,
        ts = parseTimestamp(createdAt),
        text = if (isDeleted) "Komentar dihapus" else body.orEmpty(),
        mine = isOwn,
        deleted = isDeleted,
    )
    return listOf(head) + replies.flatMap { it.toComments(articleId, id) }
}

fun LibBootstrapDto.programName(id: String?): String =
    programs.firstOrNull { it.id == id }?.name ?: ""

fun LibBootstrapDto.className(id: String?): String {
    val item = classes.firstOrNull { it.id == id } ?: return ""
    val semester = item.semester?.name
    return if (semester.isNullOrBlank()) item.name else "${item.name} · $semester"
}

fun LibBootstrapDto.classLabel(item: LibClassDto): String {
    val semester = item.semester?.name
    return if (semester.isNullOrBlank()) item.name else "${item.name} · $semester"
}
