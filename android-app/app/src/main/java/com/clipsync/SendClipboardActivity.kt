package com.clipsync

import android.app.Activity
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.widget.Toast

class SendClipboardActivity : Activity() {
    private var hasAttemptedSend = false

    override fun onResume() {
        super.onResume()
        if (!PrivacyConsent.isGranted(this)) {
            startActivity(Intent(this, MainActivity::class.java))
            finishAndRemoveTask()
            return
        }
        if (hasAttemptedSend) return

        hasAttemptedSend = true
        Handler(Looper.getMainLooper()).postDelayed({
            sendCurrentClipboard()
        }, 150)
    }

    private fun sendCurrentClipboard() {
        val clipboardManager = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        val clip = clipboardManager.primaryClip
        val image = ClipImages.imageOf(this, clip)
        if (image != null) {
            if (ClipImages.isOwn(this, image.first)) {
                Toast.makeText(this, "Image already synced by ClipSync", Toast.LENGTH_SHORT).show()
                finishAndRemoveTask()
                return
            }
            val blocked = ClipSyncSender.imageBlockReason(this)
            if (blocked != null) {
                Toast.makeText(this, blocked, Toast.LENGTH_LONG).show()
                finishAndRemoveTask()
                return
            }
            ClipSyncSender.dispatchImage(this, image.first, source = "manual_send_activity", force = true)
            Toast.makeText(this, "Sending image", Toast.LENGTH_SHORT).show()
            finishAndRemoveTask()
            return
        }
        val text = if (clip != null && clip.itemCount > 0) {
            (0 until clip.itemCount)
                .firstNotNullOfOrNull { idx -> clip.getItemAt(idx).coerceToText(this)?.toString()?.takeIf { it.isNotBlank() } }
        } else {
            null
        }

        if (text.isNullOrBlank()) {
            Toast.makeText(this, "Clipboard is empty", Toast.LENGTH_SHORT).show()
            finishAndRemoveTask()
            return
        }

        ClipSyncSender.dispatchText(this, text, source = "manual_send_activity", force = true)

        Toast.makeText(this, "Sending clipboard", Toast.LENGTH_SHORT).show()
        // Removing the task (not just finishing) returns straight to the app
        // the user was in, and leaves nothing behind in Recents.
        finishAndRemoveTask()
    }
}
