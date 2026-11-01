package com.clipsync

import android.content.Context

object PrivacyConsent {
    const val VERSION = "2026-10-29"
    const val POLICY_URL = "https://everything-clipboard.online/clipsync-privacy.html"
    private const val PREF_VERSION = "clipboard_consent_version"

    fun isGranted(context: Context): Boolean =
        context.getSharedPreferences("clipsync_prefs", Context.MODE_PRIVATE)
            .getString(PREF_VERSION, null) == VERSION

    fun grant(context: Context) {
        context.getSharedPreferences("clipsync_prefs", Context.MODE_PRIVATE).edit()
            .putString(PREF_VERSION, VERSION).apply()
    }

    fun revoke(context: Context) {
        context.getSharedPreferences("clipsync_prefs", Context.MODE_PRIVATE).edit()
            .remove(PREF_VERSION)
            .putBoolean(ClipSyncService.PREF_RUN_IN_BACKGROUND, false)
            .putBoolean(ClipSyncService.PREF_SHOW_SEND_NOTIFICATION_ACTION, false)
            .putBoolean(ClipSyncService.PREF_APP_VISIBLE, false).apply()
    }
}
