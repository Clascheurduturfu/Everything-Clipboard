package com.clipsync

import android.app.*
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat

class ClipSyncService : Service(), ClipboardManager.OnPrimaryClipChangedListener {

    private lateinit var clipboardManager: ClipboardManager
    private var wsClient: WsClient? = null
    private var lastClipboardText: String = ""
    private var keyBytes: ByteArray? = null
    private var deviceName: String = ""

    override fun onCreate() {
        super.onCreate()
        clipboardManager = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        startForeground(1, createNotification("ClipSync is starting..."))
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val prefs = getSharedPreferences("clipsync_prefs", Context.MODE_PRIVATE)
        val serverUrl = prefs.getString("server_url", "") ?: ""
        val secretKey = prefs.getString("secret_key", "") ?: ""
        deviceName = prefs.getString("device_name", "Android Phone") ?: "Android Phone"

        if (serverUrl.isNotEmpty() && secretKey.isNotEmpty()) {
            keyBytes = CryptoUtils.deriveKey(secretKey)
            val roomId = CryptoUtils.getRoomId(secretKey)

            wsClient?.disconnect()
            wsClient = WsClient(serverUrl, roomId) { encryptedPayload ->
                // Received payload from WebSocket
                val decrypted = CryptoUtils.decryptPayload(encryptedPayload, keyBytes!!)
                if (decrypted != null) {
                    val (senderDevice, content) = decrypted
                    lastClipboardText = content // Prevent echo loop

                    // Update Android clipboard on the main UI thread
                    val mainHandler = android.os.Handler(mainLooper)
                    mainHandler.post {
                        val clip = android.content.ClipData.newPlainText("ClipSync", content)
                        
                        // Temporarily remove listener to avoid triggering our own sent event
                        clipboardManager.removePrimaryClipChangedListener(this)
                        clipboardManager.setPrimaryClip(clip)
                        clipboardManager.addPrimaryClipChangedListener(this)
                        
                        updateNotification("Received from $senderDevice: ${content.take(20)}...")
                    }
                }
            }
            wsClient?.connect()
            clipboardManager.addPrimaryClipChangedListener(this)
            updateNotification("Connected to ClipSync Server")
        } else {
            updateNotification("ClipSync waiting for config")
        }

        return START_STICKY // OS will restart service if killed
    }

    override fun onPrimaryClipChanged() {
        if (clipboardManager.hasPrimaryClip()) {
            val clip = clipboardManager.primaryClip
            if (clip != null && clip.itemCount > 0) {
                val text = clip.getItemAt(0).text?.toString() ?: return
                if (text != lastClipboardText) {
                    lastClipboardText = text
                    keyBytes?.let { key ->
                        val payload = CryptoUtils.encryptPayload(deviceName, text, key)
                        wsClient?.send(payload)
                        updateNotification("Sent: ${text.take(20)}...")
                    }
                }
            }
        }
    }

    private fun createNotification(text: String): Notification {
        val channelId = "clipsync_channel"
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(channelId, "ClipSync", NotificationManager.IMPORTANCE_LOW)
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
        return NotificationCompat.Builder(this, channelId)
            .setContentTitle("ClipSync")
            .setContentText(text)
            // Use standard Android icon if you don't have a custom one yet
            .setSmallIcon(android.R.drawable.ic_menu_edit) 
            .build()
    }

    private fun updateNotification(text: String) {
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(1, createNotification(text))
    }

    override fun onDestroy() {
        clipboardManager.removePrimaryClipChangedListener(this)
        wsClient?.disconnect()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
