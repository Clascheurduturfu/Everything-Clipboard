package com.clipsync

import android.app.Activity
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.widget.Toast

class SendClipboardActivity : Activity() {
    private var hasAttemptedSend = false

    override fun onResume() {
        super.onResume()
        if (hasAttemptedSend) return

        hasAttemptedSend = true
        Handler(Looper.getMainLooper()).postDelayed({
            sendCurrentClipboard()
        }, 150)
    }

    private fun sendCurrentClipboard() {
        val clipboardManager = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        val clip = clipboardManager.primaryClip
        val text = if (clip != null && clip.itemCount > 0) {
            clip.getItemAt(0).coerceToText(this)?.toString()
        } else {
            null
        }

        if (text.isNullOrBlank()) {
            Toast.makeText(this, "Clipboard is empty", Toast.LENGTH_SHORT).show()
            finishAndRemoveTask()
            return
        }

        val intent = Intent(this, ClipSyncService::class.java).apply {
            action = ClipSyncService.ACTION_SEND_TEXT
            putExtra(ClipSyncService.EXTRA_TEXT, text)
            putExtra(ClipSyncService.EXTRA_SOURCE, "manual_send_activity")
            putExtra(ClipSyncService.EXTRA_FORCE, true)
        }

        if (needsPersistentNotification() && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(intent)
        } else {
            startService(intent)
        }

        Toast.makeText(this, "Sending clipboard", Toast.LENGTH_SHORT).show()
        // Removing the task (not just finishing) returns straight to the app
        // the user was in, and leaves nothing behind in Recents.
        finishAndRemoveTask()
    }

    private fun needsPersistentNotification(): Boolean {
        val prefs = getSharedPreferences("clipsync_prefs", Context.MODE_PRIVATE)
        return prefs.getBoolean(ClipSyncService.PREF_RUN_IN_BACKGROUND, false) ||
            prefs.getBoolean(ClipSyncService.PREF_SHOW_SEND_NOTIFICATION_ACTION, false)
    }
}
