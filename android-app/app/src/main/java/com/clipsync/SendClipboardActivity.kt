package com.clipsync

import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity

class SendClipboardActivity : AppCompatActivity() {
    private var hasAttemptedSend = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
    }

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
            finish()
            return
        }

        val intent = Intent(this, ClipSyncService::class.java).apply {
            action = ClipSyncService.ACTION_SEND_TEXT
            putExtra(ClipSyncService.EXTRA_TEXT, text)
            putExtra(ClipSyncService.EXTRA_SOURCE, "manual_send_activity")
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(intent)
        } else {
            startService(intent)
        }

        Toast.makeText(this, "Clipboard sent", Toast.LENGTH_SHORT).show()
        finish()
    }
}
