package com.clipsync

import android.app.Activity
import android.content.Context
import android.os.CancellationSignal
import android.os.Handler
import android.os.Looper
import android.util.Log
import androidx.core.content.ContextCompat
import androidx.credentials.ClearCredentialStateRequest
import androidx.credentials.CredentialManager
import androidx.credentials.CredentialManagerCallback
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.GetCredentialResponse
import androidx.credentials.exceptions.ClearCredentialException
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.GetCredentialException
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import okhttp3.Call
import okhttp3.Callback
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import org.json.JSONObject
import java.io.IOException
import java.util.concurrent.TimeUnit

/**
 * ClipSync account + paid status. Google sign-in (Credential Manager) is
 * exchanged once for a long-lived backend session; "paid" is cached locally and
 * re-checked at most once a day. Offline or server errors keep the last answer,
 * only an explicit "not paid" from the server locks sync again.
 */
object Account {
    private const val TAG = "ClipSyncAccount"
    private const val PREFS = "clipsync_account"
    private const val KEY_SESSION = "session_token"
    private const val KEY_EMAIL = "email"
    private const val KEY_ACCOUNT_REF = "account_ref"
    private const val KEY_PAID = "paid"
    private const val KEY_LAST_CHECK = "last_check"
    private const val CHECK_INTERVAL_MS = 24L * 60 * 60 * 1000
    private val JSON = "application/json".toMediaType()

    private val http = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(20, TimeUnit.SECONDS)
        .build()
    private val main = Handler(Looper.getMainLooper())

    private fun prefs(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun isSignedIn(context: Context) = !prefs(context).getString(KEY_SESSION, null).isNullOrEmpty()
    fun isPaid(context: Context) = isSignedIn(context) && prefs(context).getBoolean(KEY_PAID, false)
    fun email(context: Context): String? = prefs(context).getString(KEY_EMAIL, null)
    fun accountRef(context: Context): String? = prefs(context).getString(KEY_ACCOUNT_REF, null)

    /** Shows the Google account sheet, then creates the backend session. */
    fun signIn(activity: Activity, onDone: (error: String?) -> Unit) {
        val request = GetCredentialRequest.Builder()
            .addCredentialOption(GetSignInWithGoogleOption.Builder(BuildConfig.GOOGLE_WEB_CLIENT_ID).build())
            .build()
        CredentialManager.create(activity).getCredentialAsync(activity, request, CancellationSignal(),
            ContextCompat.getMainExecutor(activity),
            object : CredentialManagerCallback<GetCredentialResponse, GetCredentialException> {
                override fun onResult(result: GetCredentialResponse) {
                    val credential = result.credential
                    if (credential !is CustomCredential ||
                        credential.type != GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL) {
                        onDone("Unsupported sign-in method")
                        return
                    }
                    val idToken = GoogleIdTokenCredential.createFrom(credential.data).idToken
                    exchange(activity.applicationContext, idToken, onDone)
                }

                override fun onError(e: GetCredentialException) {
                    Log.w(TAG, "Google sign-in failed: ${e.type}")
                    onDone(if (e is GetCredentialCancellationException) null else "Google sign-in failed")
                }
            })
    }

    private fun exchange(context: Context, idToken: String, onDone: (String?) -> Unit) {
        val body = JSONObject().put("idToken", idToken).toString().toRequestBody(JSON)
        send(Request.Builder().url("${BuildConfig.API_BASE_URL}/api/auth/android").post(body).build()) { code, json ->
            val token = json?.optString("sessionToken").orEmpty()
            if (code != 200 || json == null || token.isEmpty()) {
                onDone(json?.optString("error")?.takeIf { it.isNotEmpty() } ?: "Could not reach ClipSync, try again")
                return@send
            }
            prefs(context).edit()
                .putString(KEY_SESSION, token)
                .putString(KEY_EMAIL, json.optString("email").takeIf { it.isNotEmpty() })
                .putString(KEY_ACCOUNT_REF, json.optString("accountRef"))
                .putBoolean(KEY_PAID, json.optBoolean("paid"))
                .putLong(KEY_LAST_CHECK, System.currentTimeMillis())
                .apply()
            onDone(null)
        }
    }

    /**
     * Re-checks paid status when the last check is older than a day (or [force]).
     * [onDone] runs on the main thread with the current paid state.
     */
    fun refresh(context: Context, force: Boolean = false, onDone: (paid: Boolean) -> Unit = {}) {
        val app = context.applicationContext
        val session = prefs(app).getString(KEY_SESSION, null)
        val stale = System.currentTimeMillis() - prefs(app).getLong(KEY_LAST_CHECK, 0) > CHECK_INTERVAL_MS
        if (session.isNullOrEmpty() || (!force && !stale)) {
            main.post { onDone(isPaid(app)) }
            return
        }
        val request = Request.Builder().url("${BuildConfig.API_BASE_URL}/api/entitlements")
            .header("Authorization", "Bearer $session").build()
        send(request) { code, json ->
            when {
                code == 401 -> clearLocal(app) // Session revoked or account deleted.
                code == 200 && json != null -> prefs(app).edit()
                    .putBoolean(KEY_PAID, json.optBoolean("paid"))
                    .putString(KEY_ACCOUNT_REF, json.optString("accountRef"))
                    .putString(KEY_EMAIL, json.optString("email").takeIf { it.isNotEmpty() } ?: email(app))
                    .putLong(KEY_LAST_CHECK, System.currentTimeMillis())
                    .apply()
                else -> Log.w(TAG, "Entitlement check failed ($code); keeping cached state")
            }
            onDone(isPaid(app))
        }
    }

    /** Sends a Play purchase token for server-side verification. */
    fun verifyPurchase(context: Context, productId: String, purchaseToken: String,
                       onDone: (paid: Boolean, status: String, error: String?) -> Unit) {
        val app = context.applicationContext
        val session = prefs(app).getString(KEY_SESSION, null)
        if (session.isNullOrEmpty()) {
            main.post { onDone(false, "signed_out", "Sign in first") }
            return
        }
        val body = JSONObject().put("productId", productId).put("purchaseToken", purchaseToken)
            .toString().toRequestBody(JSON)
        val request = Request.Builder().url("${BuildConfig.API_BASE_URL}/api/billing/google/verify")
            .header("Authorization", "Bearer $session").post(body).build()
        send(request) { code, json ->
            val paid = code == 200 && json?.optBoolean("paid") == true
            if (paid) {
                prefs(app).edit().putBoolean(KEY_PAID, true)
                    .putLong(KEY_LAST_CHECK, System.currentTimeMillis()).apply()
            }
            val status = json?.optString("status").orEmpty().ifEmpty { if (code == 0) "offline" else "error" }
            onDone(paid, status, json?.optString("error")?.takeIf { it.isNotEmpty() })
        }
    }

    fun signOut(context: Context) {
        val app = context.applicationContext
        prefs(app).getString(KEY_SESSION, null)?.let { session ->
            send(Request.Builder().url("${BuildConfig.API_BASE_URL}/api/auth/android")
                .header("Authorization", "Bearer $session").delete().build()) { _, _ -> }
        }
        clearLocal(app)
        clearGoogleState(app)
    }

    fun deleteAccount(context: Context, onDone: (error: String?) -> Unit) {
        val app = context.applicationContext
        val session = prefs(app).getString(KEY_SESSION, null) ?: return onDone(null)
        send(Request.Builder().url("${BuildConfig.API_BASE_URL}/api/account")
            .header("Authorization", "Bearer $session").delete().build()) { code, _ ->
            if (code == 200 || code == 401) {
                clearLocal(app)
                clearGoogleState(app)
                onDone(null)
            } else {
                onDone("Could not delete the account, check your connection and try again")
            }
        }
    }

    private fun clearLocal(context: Context) {
        prefs(context).edit().clear().apply()
    }

    private fun clearGoogleState(context: Context) {
        CredentialManager.create(context).clearCredentialStateAsync(ClearCredentialStateRequest(),
            CancellationSignal(), ContextCompat.getMainExecutor(context),
            object : CredentialManagerCallback<Void?, ClearCredentialException> {
                override fun onResult(result: Void?) {}
                override fun onError(e: ClearCredentialException) {}
            })
    }

    /** Runs [onDone] on the main thread with the HTTP code (0 when offline) and JSON body. */
    private fun send(request: Request, onDone: (code: Int, json: JSONObject?) -> Unit) {
        http.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                Log.w(TAG, "Request failed: ${e.javaClass.simpleName}")
                main.post { onDone(0, null) }
            }

            override fun onResponse(call: Call, response: Response) {
                val code = response.code
                val json = response.use { runCatching { JSONObject(it.body?.string().orEmpty()) }.getOrNull() }
                main.post { onDone(code, json) }
            }
        })
    }
}
