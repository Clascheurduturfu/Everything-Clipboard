package com.clipsync

import android.accessibilityservice.AccessibilityService
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.SystemClock
import android.util.Log
import android.view.accessibility.AccessibilityEvent

class ClipboardAccessibilityService : AccessibilityService(),
    ClipboardManager.OnPrimaryClipChangedListener {

    companion object {
        private const val TAG = "ClipSyncAccessibility"
        private const val EVENT_THROTTLE_MS = 500L
    }

    private lateinit var clipboardManager: ClipboardManager
    private var lastSentText = ""
    private var lastEventCheckAt = 0L

    override fun onServiceConnected() {
        super.onServiceConnected()
        clipboardManager = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        clipboardManager.addPrimaryClipChangedListener(this)
        startClipSyncService()
        Log.i(TAG, "Accessibility clipboard bridge connected")
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        val now = SystemClock.elapsedRealtime()
        if (now - lastEventCheckAt < EVENT_THROTTLE_MS) return

        lastEventCheckAt = now
        forwardCurrentClipboard("accessibility_event")
    }

    override fun onPrimaryClipChanged() {
        forwardCurrentClipboard("accessibility_clipboard_listener")
    }

    private fun forwardCurrentClipboard(source: String) {
        val text = readClipboardText() ?: return
        if (text.isBlank() || text == lastSentText) return

        lastSentText = text
        val intent = Intent(this, ClipSyncService::class.java).apply {
            action = ClipSyncService.ACTION_SEND_TEXT
            putExtra(ClipSyncService.EXTRA_TEXT, text)
            putExtra(ClipSyncService.EXTRA_SOURCE, source)
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(intent)
        } else {
            startService(intent)
        }
    }

    private fun startClipSyncService() {
        val intent = Intent(this, ClipSyncService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(intent)
        } else {
            startService(intent)
        }
    }

    private fun readClipboardText(): String? {
        val clip = clipboardManager.primaryClip ?: return null
        if (clip.itemCount == 0) return null
        return clip.getItemAt(0).coerceToText(this)?.toString()
    }

    override fun onInterrupt() = Unit

    override fun onDestroy() {
        if (::clipboardManager.isInitialized) {
            clipboardManager.removePrimaryClipChangedListener(this)
        }
        super.onDestroy()
    }
}
