package ac.id.untidar.karsa.net

import ac.id.untidar.karsa.BuildConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import okhttp3.HttpUrl
import okhttp3.HttpUrl.Companion.toHttpUrl
import okhttp3.MediaType.Companion.toMediaType
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
        .readTimeout(20, TimeUnit.SECONDS)
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
    }
}

fun friendlyError(error: Throwable): String = when (error) {
    is ApiException -> error.message
    is SocketTimeoutException, is InterruptedIOException ->
        "Koneksi membutuhkan waktu lebih lama. Coba lagi."
    is IOException -> "Koneksi belum tersedia. Periksa internetmu dan coba lagi."
    else -> "Terjadi gangguan. Silakan coba lagi."
}
