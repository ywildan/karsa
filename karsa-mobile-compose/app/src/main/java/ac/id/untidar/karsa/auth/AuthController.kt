package ac.id.untidar.karsa.auth

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import ac.id.untidar.karsa.data.LEGAL_VERSION
import ac.id.untidar.karsa.net.ApiClient
import ac.id.untidar.karsa.net.ApiException
import ac.id.untidar.karsa.net.AppUser
import ac.id.untidar.karsa.net.SessionStore
import ac.id.untidar.karsa.net.friendlyError
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.collect
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import java.security.MessageDigest
import java.security.SecureRandom
import java.util.Base64

enum class SessionState { Loading, Unavailable, SignedOut, Authenticating, SignedIn }

class AuthController(context: Context) {
    private val appContext = context.applicationContext
    val store = SessionStore(appContext)
    val api = ApiClient(store)
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private val mutex = Mutex()

    private var initialized = false
    private var pendingUri: Uri? = null

    var state by mutableStateOf(SessionState.Loading)
        private set
    var user by mutableStateOf<AppUser?>(null)
        private set
    var error by mutableStateOf<String?>(null)
        private set
    var exchanging by mutableStateOf(false)
        private set
    var refreshing by mutableStateOf(false)
        private set

    val waitingForBrowser: Boolean
        get() = state == SessionState.Authenticating && !exchanging

    init {
        scope.launch {
            api.sessionExpired.collect { onSessionExpired() }
        }
    }

    fun initialize() {
        if (initialized) return
        initialized = true
        scope.launch {
            mutex.withLock {
                val link = pendingUri
                pendingUri = null
                if (link != null) {
                    handleLinkLocked(link)
                    if (state == SessionState.SignedIn) return@withLock
                }
                restoreLocked()
            }
        }
    }

    fun onIntent(intent: Intent?) {
        val uri = intent?.data ?: return
        if (!isAuthLink(uri)) return
        if (!initialized) {
            pendingUri = uri
            return
        }
        scope.launch {
            mutex.withLock { handleLinkLocked(uri) }
        }
    }

    fun signIn(termsAccepted: Boolean) {
        if (state != SessionState.SignedOut) return
        if (!termsAccepted) {
            error = "Baca dan setujui Syarat Penggunaan sebelum masuk."
            return
        }
        error = null
        val oauthState = randomToken(32)
        val verifier = randomToken(64)
        val challenge = sha256Base64(verifier)
        store.oauthState = oauthState
        store.oauthVerifier = verifier
        store.oauthLegalVersion = LEGAL_VERSION
        exchanging = false
        state = SessionState.Authenticating
        val url = api.startUrl(oauthState, challenge)
        try {
            appContext.startActivity(
                Intent(Intent.ACTION_VIEW, Uri.parse(url))
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
            )
        } catch (_: Exception) {
            store.clearOauth()
            state = SessionState.SignedOut
            error = "Browser tidak dapat dibuka. Coba lagi."
        }
    }

    fun cancelSignIn() {
        if (state != SessionState.Authenticating) return
        scope.launch {
            exchanging = true
            store.clearOauth()
            exchanging = false
            state = SessionState.SignedOut
            error = null
        }
    }

    fun signOut() {
        if (state == SessionState.Loading) return
        user = null
        state = SessionState.Loading
        scope.launch {
            try {
                api.logout()
            } catch (_: Exception) {
                // Token lokal sudah dibersihkan di dalam ApiClient.
            }
            store.clearOauth()
            state = SessionState.SignedOut
            error = null
        }
    }

    fun retrySession() {
        if (state != SessionState.Unavailable) return
        scope.launch {
            mutex.withLock { restoreLocked() }
        }
    }

    suspend fun refreshUser(): String? {
        if (state != SessionState.SignedIn || refreshing) return null
        refreshing = true
        return try {
            user = api.me()
            null
        } catch (failure: Exception) {
            friendlyError(failure)
        } finally {
            refreshing = false
        }
    }

    fun clearError() {
        error = null
    }

    private suspend fun restoreLocked() {
        state = SessionState.Loading
        if (!store.hasSession) {
            user = null
            state = SessionState.SignedOut
            return
        }
        api.reloadTokens()
        try {
            val profile = api.me()
            user = profile
            state = SessionState.SignedIn
            error = null
        } catch (failure: Exception) {
            if (failure is ApiException && failure.statusCode == 401) {
                api.clearSession()
                user = null
                state = SessionState.SignedOut
            } else {
                user = null
                if (error == null) {
                    error = "Sesi belum dapat diperiksa. Periksa koneksi dan coba lagi."
                }
                state = SessionState.Unavailable
            }
        }
    }

    private suspend fun handleLinkLocked(uri: Uri) {
        if (!isAuthLink(uri)) return
        if (state == SessionState.SignedIn) return

        val expectedState = store.oauthState ?: return
        val verifier = store.oauthVerifier ?: return
        val legalVersion = store.oauthLegalVersion ?: return
        if (uri.getQueryParameter("state") != expectedState) return

        exchanging = true
        state = SessionState.Authenticating
        error = null
        try {
            when (uri.getQueryParameter("error")) {
                "not_eligible" -> throw ApiException(
                    "Aplikasi ini hanya tersedia untuk akun mahasiswa UNTIDAR.",
                )
                "temporarily_unavailable" -> throw ApiException(
                    "Layanan data sedang tidak tersedia. Coba lagi sebentar.",
                )
            }
            val code = uri.getQueryParameter("code")
            if (code.isNullOrEmpty()) {
                throw ApiException("Proses masuk tidak valid atau sudah kedaluwarsa. Silakan masuk lagi.")
            }
            api.exchangeCode(code, verifier, legalVersion)
            val profile = api.me()
            store.clearOauth()
            user = profile
            state = SessionState.SignedIn
            error = null
        } catch (failure: Exception) {
            store.clearOauth()
            user = null
            state = SessionState.SignedOut
            error = friendlyError(failure)
        } finally {
            exchanging = false
        }
    }

    private fun onSessionExpired() {
        if (state != SessionState.SignedIn && state != SessionState.Authenticating) return
        user = null
        store.clearOauth()
        state = SessionState.SignedOut
        error = "Sesi kamu sudah berakhir. Silakan masuk kembali."
    }

    private fun isAuthLink(uri: Uri): Boolean =
        uri.scheme == "karsa" && uri.host == "auth" && uri.path == "/callback"

    private fun randomToken(byteCount: Int): String {
        val bytes = ByteArray(byteCount)
        SecureRandom().nextBytes(bytes)
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes)
    }

    private fun sha256Base64(value: String): String {
        val digest = MessageDigest.getInstance("SHA-256")
            .digest(value.toByteArray(Charsets.US_ASCII))
        return Base64.getUrlEncoder().withoutPadding().encodeToString(digest)
    }
}

object KarsaAuth {
    @Volatile
    private var instance: AuthController? = null

    fun get(context: Context): AuthController =
        instance ?: synchronized(this) {
            instance ?: AuthController(context.applicationContext).also { instance = it }
        }
}
