package com.clipsync

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.widget.Toast

/**
 * Receives text, URLs or images shared from other apps (including Samsung's screenshot bar)
 * via Android's Share menu and dispatches a one-shot send to [ClipSyncService].
 */
class ShareReceiveActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        handleShare(intent)
    }

    private fun handleShare(incoming: Intent?) {
        if (incoming?.action != Intent.ACTION_SEND) {
            finishAndRemoveTask()
            return
        }
        if (!PrivacyConsent.isGranted(this)) {
            Toast.makeText(this, "Please accept clipboard sync in ClipSync first", Toast.LENGTH_LONG).show()
            openMainActivity()
            return
        }
        if (!ClipSyncSender.hasUsableSettings(this)) {
            Toast.makeText(this, "Set Server URL and Secret Key first!", Toast.LENGTH_LONG).show()
            openMainActivity()
            return
        }

        val streamUri = sharedImageUri(incoming)
        if (streamUri != null) {
            ClipSyncSender.stageAndDispatchImage(
                activity = this,
                uri = streamUri,
                source = "share_sheet",
                failMessage = "Could not read shared image"
            ) {
                finishAndRemoveTask()
            }
            return
        }

        val sharedText = sharedText(incoming)
        if (!sharedText.isNullOrBlank()) {
            ClipSyncSender.dispatchText(this, sharedText, source = "share_sheet", force = true)
            Toast.makeText(this, "Sending to ClipSync", Toast.LENGTH_SHORT).show()
        } else {
            Toast.makeText(this, "Nothing to send", Toast.LENGTH_SHORT).show()
        }
        finishAndRemoveTask()
    }

    private fun sharedImageUri(incoming: Intent): Uri? {
        val stream = parcelableUriExtra(incoming, Intent.EXTRA_STREAM)
            ?: incoming.clipData?.let { data ->
                (0 until data.itemCount).firstNotNullOfOrNull { idx -> data.getItemAt(idx).uri }
            }
            ?: return null
        val typeHint = incoming.type
        val mime = ClipImages.mimeOfUri(this, stream)
            ?: typeHint?.takeIf { it.startsWith("image/") }
            ?: return null
        return if (mime.startsWith("image/")) stream else null
    }

    private fun sharedText(incoming: Intent): String? {
        val direct = incoming.getCharSequenceExtra(Intent.EXTRA_TEXT)?.toString()
        if (!direct.isNullOrBlank()) return direct
        val clip = incoming.clipData ?: return null
        return (0 until clip.itemCount)
            .firstNotNullOfOrNull { idx -> clip.getItemAt(idx).coerceToText(this)?.toString()?.takeIf { it.isNotBlank() } }
    }

    private fun parcelableUriExtra(intent: Intent, name: String): Uri? =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            intent.getParcelableExtra(name, Uri::class.java)
        } else {
            @Suppress("DEPRECATION")
            intent.getParcelableExtra(name) as? Uri
        }

    private fun openMainActivity() {
        startActivity(
            Intent(this, MainActivity::class.java)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        )
        finishAndRemoveTask()
    }
}
