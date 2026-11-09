package com.clipsync

import java.net.URI

object RelayAddress {
    const val DEFAULT = "wss://serv.everything-clipboard.com"
    const val PREF_CUSTOM_SERVER = "custom_server_url"

    fun effective(prefs: android.content.SharedPreferences): String =
        if (prefs.getBoolean(PREF_CUSTOM_SERVER, false)) prefs.getString("server_url", DEFAULT) ?: DEFAULT else DEFAULT

    fun normalize(value: String): String {
        val uri = URI(value.trim())
        require(uri.scheme == "ws" || uri.scheme == "wss") { "Use a ws:// or wss:// server address." }
        require(!uri.host.isNullOrBlank() && uri.rawUserInfo == null && uri.rawQuery == null && uri.rawFragment == null) {
            "Enter a server address without a login, query or fragment."
        }
        // The website domain was mistakenly used as the relay address. Only this
        // exact first-party typo is migrated; custom/self-hosted URLs are retained.
        if (uri.host.equals("serv.everything-clipboard.online", true) &&
            uri.port == -1 && (uri.path.isNullOrEmpty() || uri.path == "/")) return DEFAULT
        return value.trim().trimEnd('/')
    }
}
