package com.clipsync

import android.app.PendingIntent
import android.content.Intent
import android.os.Build
import android.service.quicksettings.TileService

class ClipSyncTileService : TileService() {

    @android.annotation.SuppressLint("StartActivityAndCollapseDeprecated")
    override fun onClick() {
        super.onClick()

        // SendClipboardActivity lives in its own task (taskAffinity=""), so this
        // never brings an existing ClipSync task, and MainActivity, to the front.
        val intent = Intent(this, SendClipboardActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            val pendingIntent = PendingIntent.getActivity(
                this,
                0,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            startActivityAndCollapse(pendingIntent)
        } else {
            // PendingIntent overload was added in API 34. The Intent overload is
            // required on API 26-33; this branch never runs on Android 14+.
            @Suppress("DEPRECATION")
            startActivityAndCollapse(intent)
        }
    }
}
