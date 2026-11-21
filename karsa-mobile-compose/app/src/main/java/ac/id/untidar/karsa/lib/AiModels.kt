package ac.id.untidar.karsa.lib

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class LibAiQuotaDto(
    @SerialName("token_remaining") val tokenRemaining: Int = 0,
    @SerialName("token_limit") val tokenLimit: Int = 0,
    @SerialName("summary_remaining") val summaryRemaining: Int = 0,
    @SerialName("websearch_tier") val websearchTier: String = "free",
    @SerialName("websearch_limit") val websearchLimit: Int = 0,
    @SerialName("websearch_remaining") val websearchRemaining: Int = 0,
)

@Serializable
data class LibAiTextDto(
    val body: String = "",
    val sources: List<Int> = emptyList(),
)

@Serializable
data class LibAiWebSourceDto(
    val title: String = "",
    val url: String = "",
    @SerialName("published_at") val publishedAt: String? = null,
)

@Serializable
data class LibAiTurnDto(
    val id: String = "",
    val question: String = "",
    val answer: String = "",
    val sources: List<Int> = emptyList(),
    @SerialName("web_search") val webSearch: Boolean = false,
    @SerialName("web_sources") val webSources: List<LibAiWebSourceDto> = emptyList(),
)

@Serializable
data class LibAiStateDto(
    val enabled: Boolean = false,
    val revision: String = "",
    val messages: List<LibAiTurnDto> = emptyList(),
    val summary: LibAiTextDto? = null,
    val quota: LibAiQuotaDto? = null,
)

@Serializable
data class LibAiSummaryDto(
    val body: String = "",
    val sources: List<Int> = emptyList(),
    val quota: LibAiQuotaDto? = null,
)

@Serializable
data class LibAiAskDto(
    val id: String = "",
    val question: String = "",
    val answer: String = "",
    val sources: List<Int> = emptyList(),
    @SerialName("web_search") val webSearch: Boolean = false,
    @SerialName("web_sources") val webSources: List<LibAiWebSourceDto> = emptyList(),
    val quota: LibAiQuotaDto? = null,
)
