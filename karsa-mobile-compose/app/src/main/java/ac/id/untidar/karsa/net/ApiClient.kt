package ac.id.untidar.karsa.net

import ac.id.untidar.karsa.BuildConfig
import ac.id.untidar.karsa.lib.LibAiAskDto
import ac.id.untidar.karsa.lib.LibAiStateDto
import ac.id.untidar.karsa.lib.LibAiSummaryDto
import ac.id.untidar.karsa.lib.LibArticleDto
import ac.id.untidar.karsa.lib.LibAuthorProfileDto
import ac.id.untidar.karsa.lib.LibBootstrapDto
import ac.id.untidar.karsa.lib.LibCommentDto
import ac.id.untidar.karsa.lib.LibDocxResult
import ac.id.untidar.karsa.lib.LibProfileDto
import ac.id.untidar.karsa.groups.GroupMessageDto
import ac.id.untidar.karsa.groups.GroupMessagePageDto
import ac.id.untidar.karsa.groups.GroupReportDto
import ac.id.untidar.karsa.groups.GroupSummaryDto
import ac.id.untidar.karsa.points.AssignmentDto
import ac.id.untidar.karsa.points.LeaderboardOptionDto
import ac.id.untidar.karsa.points.LeaderboardRowDto
import ac.id.untidar.karsa.points.PointCategoryDto
import ac.id.untidar.karsa.points.PointHistoryDto
import ac.id.untidar.karsa.points.StudentDto
import ac.id.untidar.karsa.points.StudentReportDto
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.builtins.serializer
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import okhttp3.HttpUrl
import okhttp3.HttpUrl.Companion.toHttpUrl
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException
import java.io.InterruptedIOException
import java.net.SocketTimeoutException
import java.util.concurrent.TimeUnit

class ApiClient(private val store: SessionStore) {
    val origin: String = BuildConfig.API_BASE_URL.trimEnd('/')
    private val apiBase = "$origin/api/mobile/v1"
    private val json = Json {
        ignoreUnknownKeys = true
        isLenient = true
    }
    private val http = OkHttpClient.Builder()
        .connectTimeout(20, TimeUnit.SECONDS)
        .readTimeout(45, TimeUnit.SECONDS)
        .writeTimeout(20, TimeUnit.SECONDS)
        .build()
    private val refreshMutex = Mutex()
    private var generation = 0

    @Volatile private var accessToken: String? = store.accessToken
    @Volatile private var refreshToken: String? = store.refreshToken

    val sessionExpired = MutableSharedFlow<Unit>(extraBufferCapacity = 1)

    fun startUrl(state: String, challenge: String): String {
        val url = "$apiBase/auth/start".toHttpUrl().newBuilder()
            .addQueryParameter("state", state)
            .addQueryParameter("code_challenge", challenge)
            .addQueryParameter("redirect_uri", "karsa://auth/callback")
            .build()
        return url.toString()
    }

    suspend fun exchangeCode(code: String, verifier: String, acceptedTermsVersion: String) {
        val data = request(
            method = "POST",
            path = "/auth/exchange",
            body = buildJsonObject {
                put("code", code)
                put("code_verifier", verifier)
                put("device_name", "Karsa Mobile")
                put("accepted_terms_version", acceptedTermsVersion)
            },
            authenticated = false,
        )
        storeTokens(data)
    }

    suspend fun me(): AppUser {
        val data = request("GET", "/me")
        return json.decodeFromJsonElement(AppUser.serializer(), data)
    }

    suspend fun logout() {
        val token = accessToken
        clearSession()
        if (token == null) return
        try {
            send(
                method = "POST",
                path = "/auth/logout",
                body = null,
                query = emptyMap(),
                token = token,
                extraHeaders = emptyMap(),
                timeoutSeconds = 20,
            )
        } catch (_: Exception) {
            // Token lokal sudah dibuang; kegagalan jaringan tidak menghalangi keluar.
        }
    }

    /* ───────────── Karsa Lib ───────────── */

    suspend fun libBootstrap(): LibBootstrapDto {
        val data = request("GET", "/lib/bootstrap")
        return json.decodeFromJsonElement(LibBootstrapDto.serializer(), data)
    }

    suspend fun createLibProfile(
        displayName: String,
        facultyId: String,
        programId: String,
        classId: String?,
    ): LibProfileDto {
        val data = request(
            "POST",
            "/lib/profile",
            body = buildJsonObject {
                put("display_name", displayName)
                put("faculty_id", facultyId)
                put("prodi_id", programId)
                if (classId != null) put("kelas_id", classId)
            },
        )
        return json.decodeFromJsonElement(LibProfileDto.serializer(), data)
    }

    suspend fun libFeed(sort: String, query: String): List<LibArticleDto> {
        val data = request(
            "GET",
            "/lib/feed",
            query = buildMap {
                put("sort", sort)
                if (query.isNotBlank()) put("q", query.trim())
            },
        )
        return json.decodeFromJsonElement(ListSerializer(LibArticleDto.serializer()), data)
    }

    suspend fun libArticle(articleId: String): LibArticleDto {
        val data = request("GET", "/lib/articles/$articleId")
        return json.decodeFromJsonElement(LibArticleDto.serializer(), data)
    }

    suspend fun libComments(articleId: String): List<LibCommentDto> {
        val data = request("GET", "/lib/articles/$articleId/comments")
        return json.decodeFromJsonElement(ListSerializer(LibCommentDto.serializer()), data)
    }

    suspend fun createLibComment(articleId: String, body: String, parentId: String?): LibCommentDto {
        val data = request(
            "POST",
            "/lib/articles/$articleId/comments",
            body = buildJsonObject {
                put("body", body)
                if (parentId != null) put("parent_id", parentId)
            },
        )
        return json.decodeFromJsonElement(LibCommentDto.serializer(), data)
    }

    suspend fun deleteLibComment(commentId: String) {
        request("DELETE", "/lib/comments/$commentId")
    }

    suspend fun libVault(): List<LibArticleDto> {
        val data = request("GET", "/lib/vault")
        return json.decodeFromJsonElement(ListSerializer(LibArticleDto.serializer()), data)
    }

    suspend fun createLibArticle(title: String, body: String): LibArticleDto {
        val data = request(
            "POST",
            "/lib/articles",
            body = buildJsonObject {
                put("title", title)
                put("body", body)
            },
        )
        return json.decodeFromJsonElement(LibArticleDto.serializer(), data)
    }

    suspend fun updateLibArticle(
        articleId: String,
        action: String,
        title: String? = null,
        body: String? = null,
    ): LibArticleDto {
        val data = request(
            "PATCH",
            "/lib/articles/$articleId",
            body = buildJsonObject {
                put("action", action)
                if (title != null) put("title", title)
                if (body != null) put("body", body)
            },
        )
        return json.decodeFromJsonElement(LibArticleDto.serializer(), data)
    }

    suspend fun deleteLibDraft(articleId: String) {
        request("DELETE", "/lib/articles/$articleId")
    }

    /* ───────────── Grup kelas ───────────── */

    suspend fun groups(): List<GroupSummaryDto> {
        val data = request("GET", "/groups")
        return json.decodeFromJsonElement(ListSerializer(GroupSummaryDto.serializer()), data)
    }

    suspend fun groupMessages(groupId: String, cursor: String? = null): GroupMessagePageDto {
        val data = request(
            "GET",
            "/groups/$groupId/messages",
            query = if (cursor == null) emptyMap() else mapOf("cursor" to cursor),
        )
        return json.decodeFromJsonElement(GroupMessagePageDto.serializer(), data)
    }

    suspend fun sendGroupMessage(
        groupId: String,
        text: String,
        idempotencyKey: String,
        replyToId: String?,
    ): GroupMessageDto {
        val data = request(
            "POST",
            "/groups/$groupId/messages",
            body = buildJsonObject {
                put("text", text)
                if (replyToId != null) put("reply_to_id", replyToId)
            },
            extraHeaders = mapOf("Idempotency-Key" to idempotencyKey),
        )
        return json.decodeFromJsonElement(GroupMessageDto.serializer(), data)
    }

    suspend fun editGroupMessage(groupId: String, messageId: String, text: String): GroupMessageDto {
        val data = request(
            "PATCH",
            "/groups/$groupId/messages/$messageId",
            body = buildJsonObject { put("text", text) },
        )
        return json.decodeFromJsonElement(GroupMessageDto.serializer(), data)
    }

    suspend fun deleteGroupMessage(groupId: String, messageId: String): GroupMessageDto {
        val data = request("DELETE", "/groups/$groupId/messages/$messageId")
        return json.decodeFromJsonElement(GroupMessageDto.serializer(), data)
    }

    suspend fun pinGroupMessage(groupId: String, messageId: String, pinned: Boolean): GroupMessageDto {
        val data = request(
            "POST",
            "/groups/$groupId/messages/$messageId/pin",
            body = buildJsonObject { put("pinned", pinned) },
        )
        return json.decodeFromJsonElement(GroupMessageDto.serializer(), data)
    }

    suspend fun hideGroupMessage(
        groupId: String,
        messageId: String,
        hidden: Boolean,
        reason: String? = null,
    ): GroupMessageDto {
        val data = request(
            "POST",
            "/groups/$groupId/messages/$messageId/hide",
            body = buildJsonObject {
                put("hidden", hidden)
                if (!reason.isNullOrBlank()) put("reason", reason)
            },
        )
        return json.decodeFromJsonElement(GroupMessageDto.serializer(), data)
    }

    suspend fun reportGroupMessage(
        groupId: String,
        messageId: String,
        reason: String,
        details: String?,
    ): Boolean {
        val data = request(
            "POST",
            "/groups/$groupId/messages/$messageId/reports",
            body = buildJsonObject {
                put("reason", reason)
                if (!details.isNullOrBlank()) put("details", details)
            },
        )
        return (data as? JsonObject)?.get("auto_hidden")?.jsonPrimitive?.booleanOrNull == true
    }

    suspend fun setGroupBlock(userId: String, blocked: Boolean) {
        request(if (blocked) "PUT" else "DELETE", "/groups/blocks/$userId")
    }

    suspend fun lockGroup(groupId: String, locked: Boolean) {
        request("POST", "/groups/$groupId/lock", body = buildJsonObject { put("locked", locked) })
    }

    suspend fun groupReports(groupId: String): List<GroupReportDto> {
        val data = request("GET", "/groups/$groupId/reports")
        return json.decodeFromJsonElement(ListSerializer(GroupReportDto.serializer()), data)
    }

    suspend fun resolveGroupReport(groupId: String, reportId: String, action: String) {
        request(
            "POST",
            "/groups/$groupId/reports/$reportId/resolve",
            body = buildJsonObject { put("action", action) },
        )
    }

    /* ───────────── Poin & aktivitas ───────────── */

    suspend fun pjAssignments(): List<AssignmentDto> {
        val data = request("GET", "/pj/assignments")
        return json.decodeFromJsonElement(ListSerializer(AssignmentDto.serializer()), data)
    }

    suspend fun assignmentStudents(assignmentId: String): List<StudentDto> {
        val data = request("GET", "/pj/assignments/$assignmentId/students") as? JsonObject
            ?: throw ApiException("Daftar mahasiswa tidak dapat dibaca.")
        val students = data["students"] ?: throw ApiException("Daftar mahasiswa tidak tersedia.")
        return json.decodeFromJsonElement(ListSerializer(StudentDto.serializer()), students)
    }

    suspend fun pointCategories(): List<PointCategoryDto> {
        val data = request("GET", "/point-categories")
        return json.decodeFromJsonElement(ListSerializer(PointCategoryDto.serializer()), data)
    }

    suspend fun createPoint(
        assignmentId: String,
        studentId: String,
        categoryId: String,
        points: Int,
        note: String?,
        idempotencyKey: String,
    ): String {
        val data = request(
            "POST",
            "/points",
            body = buildJsonObject {
                put("kelas_matkul_id", assignmentId)
                put("mahasiswa_id", studentId)
                put("kategori_id", categoryId)
                put("poin", points)
                if (!note.isNullOrBlank()) put("catatan", note.trim())
            },
            extraHeaders = mapOf("Idempotency-Key" to idempotencyKey),
        ) as? JsonObject
        return data?.get("message")?.jsonPrimitive?.contentOrNull ?: "Poin berhasil dicatat."
    }

    suspend fun pointHistory(): List<PointHistoryDto> {
        val data = request("GET", "/points")
        return json.decodeFromJsonElement(ListSerializer(PointHistoryDto.serializer()), data)
    }

    suspend fun deletePoint(pointId: String): String {
        val data = request("DELETE", "/points/$pointId") as? JsonObject
        return data?.get("message")?.jsonPrimitive?.contentOrNull ?: "Poin berhasil dihapus."
    }

    suspend fun studentReport(): StudentReportDto {
        val data = request("GET", "/report")
        return json.decodeFromJsonElement(StudentReportDto.serializer(), data)
    }

    suspend fun leaderboardOptions(): List<LeaderboardOptionDto> {
        val data = request("GET", "/leaderboard/options")
        return json.decodeFromJsonElement(ListSerializer(LeaderboardOptionDto.serializer()), data)
    }

    suspend fun leaderboard(assignmentId: String): List<LeaderboardRowDto> {
        val data = request("GET", "/leaderboard/$assignmentId") as? JsonObject
            ?: throw ApiException("Peringkat tidak dapat dibaca.")
        val rows = data["rows"] ?: throw ApiException("Peringkat tidak tersedia.")
        return json.decodeFromJsonElement(ListSerializer(LeaderboardRowDto.serializer()), rows)
    }

    suspend fun libAiState(articleId: String, revision: String): LibAiStateDto {
        val data = request(
            "GET",
            "/lib/articles/$articleId/ai",
            query = mapOf("revision" to revision),
        )
        return json.decodeFromJsonElement(LibAiStateDto.serializer(), data)
    }

    suspend fun libAiSummary(articleId: String, revision: String): LibAiSummaryDto {
        val data = request(
            "POST",
            "/lib/articles/$articleId/ai/summary",
            body = buildJsonObject { put("revision", revision) },
            timeoutSeconds = 45,
        )
        return json.decodeFromJsonElement(LibAiSummaryDto.serializer(), data)
    }

    suspend fun askLibAi(
        articleId: String,
        revision: String,
        question: String,
        requestId: String,
        webSearch: Boolean,
    ): LibAiAskDto {
        val data = request(
            "POST",
            "/lib/articles/$articleId/ai/messages",
            body = buildJsonObject {
                put("revision", revision)
                put("question", question)
                put("request_id", requestId)
                put("web_search", webSearch)
            },
            timeoutSeconds = 45,
        )
        return json.decodeFromJsonElement(LibAiAskDto.serializer(), data)
    }

    suspend fun libAuthor(authorId: String): LibAuthorProfileDto {
        val data = request("GET", "/lib/authors/$authorId")
        return json.decodeFromJsonElement(LibAuthorProfileDto.serializer(), data)
    }

    suspend fun requestLibAuthor(
        motivation: String,
        topics: String,
        instagram: String?,
        tiktok: String?,
    ) {
        request(
            "POST",
            "/lib/author-requests",
            body = buildJsonObject {
                put("motivation", motivation)
                put("topics", topics)
                if (!instagram.isNullOrBlank()) put("instagram_username", instagram)
                if (!tiktok.isNullOrBlank()) put("tiktok_username", tiktok)
                put("accepted_guidelines", true)
            },
        )
    }

    suspend fun reportLibContent(
        articleId: String?,
        commentId: String?,
        reason: String,
        details: String?,
    ) {
        request(
            "POST",
            "/lib/reports",
            body = buildJsonObject {
                if (articleId != null) put("article_id", articleId)
                if (commentId != null) put("comment_id", commentId)
                put("reason", reason)
                if (!details.isNullOrBlank()) put("details", details)
            },
        )
    }

    suspend fun importLibDocx(fileName: String, bytes: ByteArray): LibDocxResult {
        var raw = sendMultipart(fileName, bytes)
        if (raw.code == 401 && refreshTokens()) {
            raw = sendMultipart(fileName, bytes)
        }
        val data = parse(raw) as? JsonObject
            ?: throw ApiException("Server tidak mengembalikan draf hasil impor.")
        val article = json.decodeFromJsonElement(LibArticleDto.serializer(), data)
        val info = data["import_info"] as? JsonObject
        val dropped = info?.get("dropped_images")?.jsonPrimitive?.intOrNull ?: 0
        val warnings = info?.get("warnings")
            ?.let { element -> runCatching { json.decodeFromJsonElement(ListSerializer(String.serializer()), element) }.getOrNull() }
            .orEmpty()
        return LibDocxResult(article, dropped, warnings)
    }

    private suspend fun sendMultipart(fileName: String, bytes: ByteArray): RawResponse =
        withContext(Dispatchers.IO) {
            val request = Request.Builder()
                .url("$apiBase/lib/articles/import-docx")
                .header("Accept", "application/json")
                .apply { accessToken?.let { header("Authorization", "Bearer $it") } }
                .post(
                    MultipartBody.Builder()
                        .setType(MultipartBody.FORM)
                        .addFormDataPart("file", fileName, bytes.toRequestBody(DOCX))
                        .build(),
                )
                .build()
            try {
                http.newCall(request).apply {
                    timeout().timeout(60, TimeUnit.SECONDS)
                }.execute().use { response ->
                    RawResponse(response.code, response.body?.string().orEmpty())
                }
            } catch (error: Exception) {
                throw when (error) {
                    is SocketTimeoutException, is InterruptedIOException -> ApiException(
                        "Unggahan membutuhkan waktu lebih lama. Coba lagi.",
                    )
                    is IOException -> ApiException("Koneksi belum tersedia. Periksa internetmu dan coba lagi.")
                    else -> error
                }
            }
        }

    fun reloadTokens() {
        accessToken = store.accessToken
        refreshToken = store.refreshToken
    }

    fun clearSession() {
        generation++
        accessToken = null
        refreshToken = null
        store.clearSession()
    }

    private fun storeTokens(data: JsonElement) {
        val obj = data as? JsonObject
            ?: throw ApiException("Server tidak mengirim token sesi.")
        val access = obj["access_token"]?.jsonPrimitive?.contentOrNull
        val refresh = obj["refresh_token"]?.jsonPrimitive?.contentOrNull
        if (access.isNullOrEmpty() || refresh.isNullOrEmpty()) {
            throw ApiException("Server tidak mengirim token sesi yang lengkap.")
        }
        accessToken = access
        refreshToken = refresh
        store.accessToken = access
        store.refreshToken = refresh
    }

    suspend fun request(
        method: String,
        path: String,
        body: JsonElement? = null,
        query: Map<String, String> = emptyMap(),
        authenticated: Boolean = true,
        retry: Boolean = true,
        extraHeaders: Map<String, String> = emptyMap(),
        timeoutSeconds: Long = 20,
    ): JsonElement {
        val startedGeneration = generation
        val token = if (authenticated) accessToken else null
        val raw = send(method, path, body, query, token, extraHeaders, timeoutSeconds)

        if (raw.code == 401 && authenticated && retry) {
            if (refreshTokens()) {
                if (startedGeneration != generation) {
                    throw ApiException("Sesi telah berubah. Silakan masuk kembali.", statusCode = 401)
                }
                return request(
                    method = method,
                    path = path,
                    body = body,
                    query = query,
                    authenticated = authenticated,
                    retry = false,
                    extraHeaders = extraHeaders,
                    timeoutSeconds = timeoutSeconds,
                )
            }
        }
        return parse(raw)
    }

    private suspend fun refreshTokens(): Boolean = refreshMutex.withLock {
        val token = refreshToken ?: return@withLock false
        val startedGeneration = generation
        val raw = try {
            send(
                method = "POST",
                path = "/auth/refresh",
                body = buildJsonObject { put("refresh_token", token) },
                query = emptyMap(),
                token = null,
                extraHeaders = emptyMap(),
                timeoutSeconds = 20,
            )
        } catch (error: Exception) {
            if (error is ApiException && error.statusCode == 401) {
                clearSession()
                sessionExpired.tryEmit(Unit)
            }
            return@withLock false
        }
        if (startedGeneration != generation) return@withLock false
        if (raw.code == 401) {
            clearSession()
            sessionExpired.tryEmit(Unit)
            return@withLock false
        }
        return@withLock try {
            storeTokens(parse(raw))
            true
        } catch (_: ApiException) {
            clearSession()
            false
        }
    }

    private suspend fun send(
        method: String,
        path: String,
        body: JsonElement?,
        query: Map<String, String>,
        token: String?,
        extraHeaders: Map<String, String>,
        timeoutSeconds: Long,
    ): RawResponse = withContext(Dispatchers.IO) {
        val url: HttpUrl = (apiBase + path).toHttpUrl().newBuilder().apply {
            query.forEach { (key, value) -> addQueryParameter(key, value) }
        }.build()
        val payload = when {
            body != null -> body.toString().toRequestBody(JSON)
            method == "POST" || method == "PUT" || method == "PATCH" -> "".toRequestBody(JSON)
            else -> null
        }
        val request = Request.Builder()
            .url(url)
            .header("Accept", "application/json")
            .apply { if (token != null) header("Authorization", "Bearer $token") }
            .apply { extraHeaders.forEach { (key, value) -> header(key, value) } }
            .method(method, payload)
            .build()
        try {
            http.newCall(request).apply {
                timeout().timeout(timeoutSeconds, TimeUnit.SECONDS)
            }.execute().use { response ->
                RawResponse(response.code, response.body?.string().orEmpty())
            }
        } catch (error: Exception) {
            throw when (error) {
                is SocketTimeoutException, is InterruptedIOException -> ApiException(
                    "Koneksi membutuhkan waktu lebih lama. Coba lagi.",
                )
                is IOException -> ApiException("Koneksi belum tersedia. Periksa internetmu dan coba lagi.")
                else -> error
            }
        }
    }

    private fun parse(raw: RawResponse): JsonElement {
        val root = try {
            json.parseToJsonElement(raw.body).jsonObject
        } catch (_: Exception) {
            throw ApiException(
                "Server memberikan respons yang tidak dapat dibaca.",
                statusCode = raw.code,
            )
        }
        val ok = root["ok"]?.jsonPrimitive?.booleanOrNull == true
        if (raw.code !in 200..299 || !ok) {
            val error = root["error"] as? JsonObject
            throw ApiException(
                error?.get("message")?.jsonPrimitive?.contentOrNull
                    ?: "Permintaan tidak dapat diproses.",
                error?.get("code")?.jsonPrimitive?.contentOrNull,
                raw.code,
            )
        }
        return root["data"] ?: JsonNull
    }

    private data class RawResponse(val code: Int, val body: String)

    private companion object {
        val JSON = "application/json; charset=utf-8".toMediaType()
        val DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document".toMediaType()
    }
}

fun friendlyError(error: Throwable): String = when (error) {
    is ApiException -> error.message
    is SocketTimeoutException, is InterruptedIOException ->
        "Koneksi membutuhkan waktu lebih lama. Coba lagi."
    is IOException -> "Koneksi belum tersedia. Periksa internetmu dan coba lagi."
    else -> "Terjadi gangguan. Silakan coba lagi."
}
