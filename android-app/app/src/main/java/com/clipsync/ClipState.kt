package com.clipsync

import android.graphics.Bitmap
import android.net.Uri
import android.os.Handler
import android.os.Looper

/**
 * Live sync state shared by ClipSyncService and MainActivity (same process).
 *
 * Kept in memory on purpose: clipboard content never lands on disk, and the
 * screen is pushed updates instead of polling SharedPreferences.
 */
object ClipState {
    enum class Connection { IDLE, CONNECTING, CONNECTED, DISCONNECTED }

    @Volatile var connection: Connection = Connection.IDLE
        private set
    @Volatile var detail: String = ""
        private set
    @Volatile var lastDevice: String = ""
        private set
    @Volatile var lastText: String = ""
        private set
    /** Small preview only; the full image lives in the cache file behind [lastImageUri]. */
    @Volatile var lastImage: Bitmap? = null
        private set
    @Volatile var lastImageUri: Uri? = null
        private set

    private val mainHandler = Handler(Looper.getMainLooper())
    private var listener: (() -> Unit)? = null

    /** Only one screen listens at a time; pass null to stop. */
    fun setListener(callback: (() -> Unit)?) {
        listener = callback
    }

    fun update(connection: Connection? = null, detail: String? = null) {
        if (connection != null) this.connection = connection
        if (detail != null) this.detail = detail
        notifyChanged()
    }

    fun received(device: String, text: String) {
        lastDevice = device
        lastText = text
        lastImage = null
        lastImageUri = null
        detail = "Received from $device"
        notifyChanged()
    }

    fun receivedImage(device: String, label: String, thumbnail: Bitmap?, uri: Uri) {
        lastDevice = device
        lastText = label
        lastImage = thumbnail
        lastImageUri = uri
        detail = "Received image from $device"
        notifyChanged()
    }

    private fun notifyChanged() {
        mainHandler.post { listener?.invoke() }
    }
}
