package ac.id.untidar.karsa.lib

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import ac.id.untidar.karsa.net.ApiClient
import ac.id.untidar.karsa.net.ApiException
import ac.id.untidar.karsa.net.friendlyError
import java.util.UUID

class AiController(
    private val api: ApiClient,
    private val articleId: String,
    val revision: String,
    private val onArticleChanged: () -> Unit,
) {
    var loading by mutableStateOf(false)
        private set
    var enabled by mutableStateOf(false)
        private set
    var error by mutableStateOf<String?>(null)
        private set
    var quota by mutableStateOf<LibAiQuotaDto?>(null)
        private set
    var summary by mutableStateOf<LibAiTextDto?>(null)
        private set
    var turns by mutableStateOf<List<LibAiTurnDto>>(emptyList())
        private set
    var summarySending by mutableStateOf(false)
        private set
    var asking by mutableStateOf(false)
        private set
    var pendingQuestion by mutableStateOf<String?>(null)
        private set
    var pendingWeb by mutableStateOf(false)
        private set
    var failedQuestion by mutableStateOf<String?>(null)
        private set
    var failedWeb by mutableStateOf(false)
        private set
    var webQuotaDialog by mutableStateOf(false)
        private set

    private var requestId: String? = null
    private var requestPayload: String? = null

    suspend fun load() {
        loading = true
        error = null
        webQuotaDialog = false
        failedQuestion = null
        failedWeb = false
        requestId = null
        requestPayload = null
        try {
            val state = api.libAiState(articleId, revision)
            enabled = state.enabled
            summary = state.summary
            quota = state.quota
            turns = state.messages
        } catch (failure: Exception) {
            handle(failure)
        } finally {
            loading = false
        }
    }

    suspend fun createSummary(): Boolean {
        if (summarySending || !enabled || (quota?.summaryRemaining ?: 0) == 0) return false
        summarySending = true
        error = null
        return try {
            val response = api.libAiSummary(articleId, revision)
            summary = LibAiTextDto(body = response.body, sources = response.sources)
            response.quota?.let { quota = it }
            true
        } catch (failure: Exception) {
            handle(failure)
            syncQuota()
            false
        } finally {
            summarySending = false
        }
    }

    suspend fun ask(question: String, webSearch: Boolean): Boolean {
        val text = question.trim()
        if (asking || !enabled || text.isEmpty() || (quota?.tokenRemaining ?: 0) == 0) return false
        asking = true
        error = null
        failedQuestion = null
        failedWeb = false
        pendingQuestion = text
        pendingWeb = webSearch
        val payload = "$text|$webSearch"
        if (requestPayload != payload || requestId == null) {
            requestPayload = payload
            requestId = UUID.randomUUID().toString()
        }
        return try {
            val response = api.askLibAi(
                articleId = articleId,
                revision = revision,
                question = text,
                requestId = requestId!!,
                webSearch = webSearch,
            )
            val turn = LibAiTurnDto(
                id = response.id,
                question = response.question.ifBlank { text },
                answer = response.answer,
                sources = response.sources,
                webSearch = response.webSearch,
                webSources = response.webSources,
            )
            turns = turns.filterNot { it.id == turn.id } + turn
            response.quota?.let { quota = it }
            requestId = null
            requestPayload = null
            true
        } catch (failure: Exception) {
            val code = (failure as? ApiException)?.code
            if (code == "AI_REQUEST_FAILED") {
                requestId = null
                requestPayload = null
            }
            if (code == "AI_QUOTA_EXCEEDED" && webSearch) {
                webQuotaDialog = true
            } else {
                handle(failure)
                if (code != "AI_QUOTA_EXCEEDED" && code != "AI_TOKEN_QUOTA_EXCEEDED") {
                    failedQuestion = text
                    failedWeb = webSearch
                }
            }
            syncQuota()
            false
        } finally {
            asking = false
            pendingQuestion = null
            pendingWeb = false
        }
    }

    suspend fun retryFailed(): Boolean {
        val text = failedQuestion ?: return false
        val web = failedWeb
        failedQuestion = null
        failedWeb = false
        return ask(text, web)
    }

    suspend fun syncQuota() {
        try {
            val state = api.libAiState(articleId, revision)
            quota = state.quota
            enabled = state.enabled
        } catch (_: Exception) {
            // Biarkan error utama tampil; refresh kuota tidak mengirim ulang ke AI.
        }
    }

    fun dismissWebQuota() {
        webQuotaDialog = false
    }

    private fun handle(failure: Exception) {
        val apiError = failure as? ApiException
        if (apiError?.code == "AI_ARTICLE_CHANGED") {
            onArticleChanged()
            return
        }
        error = apiError?.message ?: friendlyError(failure)
    }
}
