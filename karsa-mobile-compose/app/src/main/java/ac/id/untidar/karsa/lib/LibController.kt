package ac.id.untidar.karsa.lib

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import ac.id.untidar.karsa.auth.AuthController
import ac.id.untidar.karsa.data.Article
import ac.id.untidar.karsa.data.ArticleStatus
import ac.id.untidar.karsa.data.Comment
import ac.id.untidar.karsa.ui.LoadStatus
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

class LibController(private val auth: AuthController) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private var feedRequest = 0
    private var bootstrapLoading = false
    private var session = 0

    var bootstrap by mutableStateOf<LibBootstrapDto?>(null)
        private set
    var bootstrapStatus by mutableStateOf(LoadStatus.Loading)
        private set
    var feed by mutableStateOf<List<Article>>(emptyList())
        private set
    var feedStatus by mutableStateOf(LoadStatus.Loading)
        private set
    var vault by mutableStateOf<List<Article>>(emptyList())
        private set
    var vaultStatus by mutableStateOf(LoadStatus.Loading)
        private set
    var sort by mutableStateOf("latest")
        private set
    var query by mutableStateOf("")
        private set

    val details = mutableStateMapOf<String, Article>()
    val detailStatus = mutableStateMapOf<String, LoadStatus>()
    val comments = mutableStateMapOf<String, List<Comment>>()
    val commentStatus = mutableStateMapOf<String, LoadStatus>()
    val authors = mutableStateMapOf<String, LibAuthorProfileDto>()
    val authorStatus = mutableStateMapOf<String, LoadStatus>()

    val uid: String get() = auth.user?.id.orEmpty()
    val profile: LibProfileDto? get() = bootstrap?.profile
    val canWrite: Boolean get() = bootstrap?.canWrite == true
    val requestStatus: String? get() = bootstrap?.latestRequest?.status?.uppercase()
    val decisionNote: String? get() = bootstrap?.latestRequest?.decisionNote
    val programName: String get() = bootstrap?.programName(profile?.programId).orEmpty()
    val className: String get() = bootstrap?.className(profile?.classId).orEmpty()

    fun reset() {
        session++
        bootstrapLoading = false
        bootstrap = null
        bootstrapStatus = LoadStatus.Loading
        feed = emptyList()
        feedStatus = LoadStatus.Loading
        vault = emptyList()
        vaultStatus = LoadStatus.Loading
        sort = "latest"
        query = ""
        details.clear()
        detailStatus.clear()
        comments.clear()
        commentStatus.clear()
        authors.clear()
        authorStatus.clear()
    }

    fun loadBootstrap() {
        if (bootstrapLoading) return
        bootstrapLoading = true
        val generation = session
        scope.launch {
            bootstrapStatus = LoadStatus.Loading
            try {
                val loaded = auth.api.libBootstrap()
                if (generation == session) {
                    bootstrap = loaded
                    bootstrapStatus = LoadStatus.Ready
                }
            } catch (_: Exception) {
                if (generation == session) bootstrapStatus = LoadStatus.Error
            } finally {
                if (generation == session) bootstrapLoading = false
            }
        }
    }

    fun loadFeed(sort: String = this.sort, query: String = this.query) {
        this.sort = sort
        this.query = query
        val request = ++feedRequest
        val generation = session
        scope.launch {
            feedStatus = LoadStatus.Loading
            try {
                val rows = auth.api.libFeed(sort, query).map { it.toArticle(uid) }
                if (request != feedRequest || generation != session) return@launch
                feed = rows
                feedStatus = LoadStatus.Ready
            } catch (_: Exception) {
                if (request != feedRequest || generation != session) return@launch
                feedStatus = LoadStatus.Error
            }
        }
    }

    fun loadVault() {
        val generation = session
        scope.launch {
            vaultStatus = LoadStatus.Loading
            try {
                val rows = auth.api.libVault().map { it.toArticle(uid, fullBody = true) }
                if (generation != session) return@launch
                vault = rows
                vaultStatus = LoadStatus.Ready
            } catch (_: Exception) {
                if (generation != session) return@launch
                vaultStatus = LoadStatus.Error
            }
        }
    }

    fun loadArticle(articleId: String) {
        scope.launch {
            detailStatus[articleId] = LoadStatus.Loading
            try {
                val dto = auth.api.libArticle(articleId)
                details[articleId] = dto.toArticle(uid, fullBody = true)
                detailStatus[articleId] = LoadStatus.Ready
            } catch (_: Exception) {
                detailStatus[articleId] = LoadStatus.Error
            }
        }
    }

    fun loadComments(articleId: String) {
        scope.launch {
            commentStatus[articleId] = LoadStatus.Loading
            try {
                val rows = auth.api.libComments(articleId).flatMap { it.toComments(articleId) }
                comments[articleId] = rows
                commentStatus[articleId] = LoadStatus.Ready
            } catch (_: Exception) {
                commentStatus[articleId] = LoadStatus.Error
            }
        }
    }

    fun loadAuthor(authorId: String) {
        scope.launch {
            authorStatus[authorId] = LoadStatus.Loading
            try {
                authors[authorId] = auth.api.libAuthor(authorId)
                authorStatus[authorId] = LoadStatus.Ready
            } catch (_: Exception) {
                authorStatus[authorId] = LoadStatus.Error
            }
        }
    }

    suspend fun addComment(articleId: String, text: String, parentId: String?) {
        auth.api.createLibComment(articleId, text, parentId)
        val rows = auth.api.libComments(articleId).flatMap { it.toComments(articleId) }
        comments[articleId] = rows
        commentStatus[articleId] = LoadStatus.Ready
        syncCommentCount(articleId, rows.count { !it.deleted })
    }

    suspend fun deleteComment(articleId: String, commentId: String) {
        auth.api.deleteLibComment(commentId)
        val rows = auth.api.libComments(articleId).flatMap { it.toComments(articleId) }
        comments[articleId] = rows
        commentStatus[articleId] = LoadStatus.Ready
        syncCommentCount(articleId, rows.count { !it.deleted })
    }

    private fun syncCommentCount(articleId: String, count: Int) {
        details[articleId]?.let { details[articleId] = it.copy(commentsCount = count) }
        val index = feed.indexOfFirst { it.id == articleId }
        if (index >= 0) {
            feed = feed.toMutableList().also { it[index] = it[index].copy(commentsCount = count) }
        }
    }

    suspend fun report(articleId: String?, commentId: String?, reason: String, details: String?) {
        auth.api.reportLibContent(articleId, commentId, reason, details)
    }

    suspend fun createProfile(
        displayName: String,
        facultyId: String,
        programId: String,
        classId: String?,
    ) {
        auth.api.createLibProfile(displayName, facultyId, programId, classId)
        bootstrap = auth.api.libBootstrap()
        bootstrapStatus = LoadStatus.Ready
    }

    suspend fun requestAuthor(
        motivation: String,
        topics: String,
        instagram: String?,
        tiktok: String?,
    ) {
        auth.api.requestLibAuthor(motivation, topics, instagram, tiktok)
        bootstrap = auth.api.libBootstrap()
        bootstrapStatus = LoadStatus.Ready
    }

    suspend fun saveArticle(id: String?, title: String, body: String): Article {
        val dto = if (id.isNullOrBlank()) {
            auth.api.createLibArticle(title, body)
        } else {
            auth.api.updateLibArticle(id, "EDIT", title, body)
        }
        upsertVault(dto)
        if (dto.status?.uppercase() == "PUBLISHED") refreshFeed()
        return dto.toArticle(uid, fullBody = true)
    }

    suspend fun publishArticle(id: String?, title: String, body: String): Article {
        val saved = if (id.isNullOrBlank()) {
            auth.api.createLibArticle(title, body)
        } else {
            auth.api.updateLibArticle(id, "EDIT", title, body)
        }
        val published = auth.api.updateLibArticle(saved.id, "PUBLISH")
        upsertVault(published)
        refreshFeed()
        return published.toArticle(uid, fullBody = true)
    }

    suspend fun vaultAction(article: Article, action: String): Article {
        val dto = auth.api.updateLibArticle(article.id, action)
        upsertVault(dto)
        if (action == "PUBLISH" || action == "RESTORE") refreshFeed()
        return dto.toArticle(uid, fullBody = true)
    }

    suspend fun deleteDraft(article: Article) {
        auth.api.deleteLibDraft(article.id)
        vault = vault.filterNot { it.id == article.id }
        details.remove(article.id)
    }

    suspend fun importDocx(fileName: String, bytes: ByteArray): LibDocxResult {
        val result = auth.api.importLibDocx(fileName, bytes)
        upsertVault(result.article)
        return result
    }

    fun upsertVault(dto: LibArticleDto) {
        val article = dto.toArticle(uid, fullBody = true)
        val existing = vault.indexOfFirst { it.id == article.id }
        vault = if (existing >= 0) {
            vault.toMutableList().also { it[existing] = article }
        } else {
            listOf(article) + vault
        }
        details[article.id] = article
    }

    fun refreshFeed() {
        if (profile == null) return
        loadFeed(sort, query)
    }

    fun statusOf(article: Article): ArticleStatus? = article.status

    fun classLabel(item: LibClassDto): String = bootstrap?.classLabel(item) ?: item.name
}
