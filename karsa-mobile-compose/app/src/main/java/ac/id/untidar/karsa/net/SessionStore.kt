package ac.id.untidar.karsa.net

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

/**
 * Menyimpan token sesi dan nilai PKCE. Bila keystore perangkat bermasalah,
 * penyimpanan jatuh ke memori saja supaya aplikasi tetap bisa dipakai;
 * sesi hanya hilang saat proses aplikasi berhenti.
 */
class SessionStore(context: Context) {
    private val appContext = context.applicationContext
    private var prefs: SharedPreferences? = open(appContext)
    private var memoryAccess: String? = null
    private var memoryRefresh: String? = null
    private var memoryState: String? = null
    private var memoryVerifier: String? = null
    private var memoryLegal: String? = null

    private fun open(context: Context): SharedPreferences? = try {
        create(context)
    } catch (first: Exception) {
        Log.w(TAG, "Secure storage gagal dibuat, mencoba ulang", first)
        runCatching { context.deleteSharedPreferences(FILE) }
        runCatching { create(context) }.getOrElse { error ->
            Log.w(TAG, "Secure storage tidak tersedia", error)
            null
        }
    }

    private fun create(context: Context): SharedPreferences {
        val key = MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()
        return EncryptedSharedPreferences.create(
            context,
            FILE,
            key,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
        )
    }

    var accessToken: String?
        get() = prefs?.getString(KEY_ACCESS, null) ?: memoryAccess
        set(value) {
            memoryAccess = value
            prefs?.edit()?.putString(KEY_ACCESS, value)?.apply()
        }

    var refreshToken: String?
        get() = prefs?.getString(KEY_REFRESH, null) ?: memoryRefresh
        set(value) {
            memoryRefresh = value
            prefs?.edit()?.putString(KEY_REFRESH, value)?.apply()
        }

    var oauthState: String?
        get() = prefs?.getString(KEY_STATE, null) ?: memoryState
        set(value) {
            memoryState = value
            prefs?.edit()?.putString(KEY_STATE, value)?.apply()
        }

    var oauthVerifier: String?
        get() = prefs?.getString(KEY_VERIFIER, null) ?: memoryVerifier
        set(value) {
            memoryVerifier = value
            prefs?.edit()?.putString(KEY_VERIFIER, value)?.apply()
        }

    var oauthLegalVersion: String?
        get() = prefs?.getString(KEY_LEGAL, null) ?: memoryLegal
        set(value) {
            memoryLegal = value
            prefs?.edit()?.putString(KEY_LEGAL, value)?.apply()
        }

    val hasSession: Boolean
        get() = !accessToken.isNullOrEmpty() || !refreshToken.isNullOrEmpty()

    fun clearSession() {
        memoryAccess = null
        memoryRefresh = null
        prefs?.edit()?.remove(KEY_ACCESS)?.remove(KEY_REFRESH)?.apply()
    }

    fun clearOauth() {
        memoryState = null
        memoryVerifier = null
        memoryLegal = null
        prefs?.edit()?.remove(KEY_STATE)?.remove(KEY_VERIFIER)?.remove(KEY_LEGAL)?.apply()
    }

    private companion object {
        const val TAG = "KarsaSession"
        const val FILE = "karsa_session"
        const val KEY_ACCESS = "access_token"
        const val KEY_REFRESH = "refresh_token"
        const val KEY_STATE = "oauth_state"
        const val KEY_VERIFIER = "oauth_verifier"
        const val KEY_LEGAL = "oauth_legal_version"
    }
}
