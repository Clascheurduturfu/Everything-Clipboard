package com.clipsync

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Log
import androidx.core.app.NotificationCompat

class ClipSyncService : Service(), ClipboardManager.OnPrimaryClipChangedListener {

    companion object {
        private const val TAG = "ClipSyncService"
        private const val NOTIFICATION_ID = 1
        private const val CHANNEL_ID = "clipsync_channel"

        const val ACTION_SEND_TEXT = "com.clipsync.action.SEND_TEXT"
        const val EXTRA_TEXT = "com.clipsync.extra.TEXT"
        const val EXTRA_SOURCE = "com.clipsync.extra.SOURCE"
    }

    private lateinit var clipboardManager: ClipboardManager
    private var wsClient: WsClient? = null
    private var lastClipboardText: String = ""
    private var keyBytes: ByteArray? = null
    private var deviceName: String = ""
    private val mainHandler = Handler(Looper.getMainLooper())
    private val pendingOutgoing = mutableListOf<String>()
    private var currentServerUrl: String = ""
    private var currentRoomId: String = ""
    private var listenerRegistered = false

    override fun onCreate() {
        super.onCreate()
        clipboardManager = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        createNotificationChannel()
        startForeground(NOTIFICATION_ID, buildNotification("ClipSync is starting..."))
        Log.i(TAG, "Service created")
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val prefs = getSharedPreferences("clipsync_prefs", Context.MODE_PRIVATE)
        val serverUrl = prefs.getString("server_url", "") ?: ""
        val secretKey = prefs.getString("secret_key", "") ?: ""
        deviceName = prefs.getString("device_name", "Android Phone") ?: "Android Phone"

        if (serverUrl.isEmpty() || secretKey.isEmpty()) {
            updateNotification("Waiting for settings - open ClipSync app")
            return START_STICKY
        }

        keyBytes = CryptoUtils.deriveKey(secretKey)
        val roomId = CryptoUtils.getRoomId(secretKey)
        val actionText = intent?.getStringExtra(EXTRA_TEXT)

        val settingsChanged = serverUrl != currentServerUrl || roomId != currentRoomId || wsClient == null
        if (settingsChanged) {
            wsClient?.disconnect()
            currentServerUrl = serverUrl
            currentRoomId = roomId

            wsClient = WsClient(
                url = serverUrl,
                roomId = roomId,
                onMessage = { encryptedPayload -> handleIncomingPayload(encryptedPayload) },
                onConnected = {
                    flushPendingOutgoing()
                    updateNotification("Connected - syncing clipboard")
                },
                onDisconnected = { updateNotification("Disconnected - reconnecting...") },
            )
            wsClient?.connect()
        }

        if (!listenerRegistered) {
            clipboardManager.addPrimaryClipChangedListener(this)
            listenerRegistered = true
        }

        if (!actionText.isNullOrBlank()) {
            sendClipboardText(actionText, intent.getStringExtra(EXTRA_SOURCE) ?: "external")
        }

        if (settingsChanged) {
            updateNotification("Connecting to server...")
        }

        Log.i(TAG, "Service started with server=$serverUrl")
        return START_STICKY
    }

    private fun handleIncomingPayload(encryptedPayload: String) {
        val key = keyBytes ?: return
        val decrypted = CryptoUtils.decryptPayload(encryptedPayload, key) ?: return
        val (senderDevice, content) = decrypted

        Log.i(TAG, "Received from $senderDevice: ${content.take(30)}...")
        lastClipboardText = content

        mainHandler.post {
            clipboardManager.removePrimaryClipChangedListener(this)
            listenerRegistered = false

            val clip = ClipData.newPlainText("ClipSync", content)
            clipboardManager.setPrimaryClip(clip)

            clipboardManager.addPrimaryClipChangedListener(this)
            listenerRegistered = true
            updateNotification("From $senderDevice: ${content.take(25)}...")
        }
    }

    override fun onPrimaryClipChanged() {
        sendClipboardText(readClipboardText() ?: return, "clipboard_listener")
    }

    private fun readClipboardText(): String? {
        val clip = clipboardManager.primaryClip ?: return null
        if (clip.itemCount == 0) return null
        return clip.getItemAt(0).coerceToText(this)?.toString()
    }

    private fun sendClipboardText(text: String, source: String) {
        if (text == lastClipboardText || text.isBlank()) return

        lastClipboardText = text
        val key = keyBytes ?: return

        val payload = CryptoUtils.encryptPayload(deviceName, text, key)
        val sent = wsClient?.send(payload) ?: false
        if (sent) {
            Log.i(TAG, "Sent from $source: ${text.take(30)}...")
            updateNotification("Sent: ${text.take(25)}...")
        } else {
            pendingOutgoing.add(payload)
            Log.i(TAG, "Queued from $source: ${text.take(30)}...")
            updateNotification("Queued clipboard - reconnecting...")
        }
    }

    private fun flushPendingOutgoing() {
        if (pendingOutgoing.isEmpty()) return

        val iterator = pendingOutgoing.iterator()
        var sentCount = 0
        while (iterator.hasNext()) {
            if (wsClient?.send(iterator.next()) == true) {
                iterator.remove()
                sentCount++
            } else {
                break
            }
        }
        if (sentCount > 0) {
            Log.i(TAG, "Flushed $sentCount queued clipboard update(s)")
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "ClipSync Service",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "ClipSync clipboard sync service"
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }

    private fun buildNotification(text: String): Notification {
        val intent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("ClipSync")
            .setContentText(text)
            .setSmallIcon(R.drawable.ic_stat_clipsync)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .build()
    }

    private fun updateNotification(text: String) {
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.notify(NOTIFICATION_ID, buildNotification(text))
    }

    override fun onDestroy() {
        Log.i(TAG, "Service destroyed")
        if (listenerRegistered) {
            clipboardManager.removePrimaryClipChangedListener(this)
            listenerRegistered = false
        }
        wsClient?.disconnect()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
