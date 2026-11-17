package com.clipsync

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.widget.Toast

/** Shared helpers to validate settings and dispatch one-shot sends to [ClipSyncService]. */
object ClipSyncSender {
    fun hasUsableSettings(context: Context): Boolean {
        val prefs = context.getSharedPreferences(ClipSyncService.PREFS_NAME, Context.MODE_PRIVATE)
        return !prefs.getString("secret_key", "").isNullOrBlank()
    }

    fun needsPersistentNotification(context: Context): Boolean {
        val prefs = context.getSharedPreferences(ClipSyncService.PREFS_NAME, Context.MODE_PRIVATE)
        return prefs.getBoolean(ClipSyncService.PREF_RUN_IN_BACKGROUND, false) ||
            prefs.getBoolean(ClipSyncService.PREF_SHOW_SEND_NOTIFICATION_ACTION, false)
    }

    /** Returns a human-readable reason if current settings disallow sending an image, or null. */
    fun imageBlockReason(context: Context): String? {
        val prefs = context.getSharedPreferences(ClipSyncService.PREFS_NAME, Context.MODE_PRIVATE)
        if (!prefs.getBoolean(ClipSyncService.PREF_SYNC_IMAGES, true)) {
            return context.getString(R.string.image_sync_disabled)
        }
        if (prefs.getBoolean(ClipSyncService.PREF_IMAGES_WIFI_ONLY, true) && ClipImages.isMetered(context)) {
            return context.getString(R.string.image_wifi_only_blocked)
        }
        return null
    }

    fun dispatchText(context: Context, text: String, source: String, force: Boolean = true) {
        dispatch(context, text = text, imageUri = null, source = source, force = force)
    }

    fun dispatchImage(context: Context, imageUri: Uri, source: String, force: Boolean = true) {
        dispatch(context, text = null, imageUri = imageUri, source = source, force = force)
    }

    /**
     * Stages a temporary share/picker URI off the main thread while [activity] still holds its URI
     * grant, then dispatches to [ClipSyncService] on the UI thread before invoking [onComplete].
     */
    fun stageAndDispatchImage(
        activity: Activity,
        uri: Uri,
        source: String,
        failMessage: String,
        onComplete: () -> Unit = {}
    ) {
        if (ClipImages.isOwn(activity, uri)) {
            onComplete()
            return
        }
        val blocked = imageBlockReason(activity)
        if (blocked != null) {
            Toast.makeText(activity, blocked, Toast.LENGTH_LONG).show()
            onComplete()
            return
        }
        val appContext = activity.applicationContext
        Thread {
            val staged = ClipImages.stageOutgoing(appContext, uri)
            activity.runOnUiThread {
                if (activity.isDestroyed) {
                    ClipImages.deleteOutgoing(appContext, staged)
                    return@runOnUiThread
                }
                if (staged == null) {
                    Toast.makeText(activity, failMessage, Toast.LENGTH_SHORT).show()
                } else {
                    dispatchImage(activity, staged, source = source, force = true)
                    Toast.makeText(activity, "Sending image", Toast.LENGTH_SHORT).show()
                }
                onComplete()
            }
        }.start()
    }

    private fun dispatch(
        context: Context,
        text: String?,
        imageUri: Uri?,
        source: String,
        force: Boolean
    ) {
        val intent = Intent(context, ClipSyncService::class.java).apply {
            action = ClipSyncService.ACTION_SEND_TEXT
            if (imageUri != null) {
                putExtra(ClipSyncService.EXTRA_IMAGE_URI, imageUri.toString())
            } else if (!text.isNullOrBlank()) {
                putExtra(ClipSyncService.EXTRA_TEXT, text)
            }
            putExtra(ClipSyncService.EXTRA_SOURCE, source)
            putExtra(ClipSyncService.EXTRA_FORCE, force)
        }
        if (needsPersistentNotification(context) && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(intent)
        } else {
            context.startService(intent)
        }
    }
}
