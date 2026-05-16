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
        private const val PREFS_NAME = "clipsync_prefs"
        const val PREF_SHOW_SEND_NOTIFICATION_ACTION = "show_send_notification_action"
        const val PREF_SERVICE_STATUS = "service_status"

        const val ACTION_SEND_TEXT = "com.clipsync.action.SEND_TEXT"
        const val ACTION_REFRESH_NOTIFICATION = "com.clipsync.action.REFRESH_NOTIFICATION"
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
        Log.i(TAG, "onStartCommand action=${intent?.action ?: "none"} startId=$startId")

        // Handle notification refresh without touching WebSocket
        if (intent?.action == ACTION_REFRESH_NOTIFICATION) {
            Log.i(TAG, "Refreshing notification (action button toggled)")
            val currentText = if (wsClient != null && currentServerUrl.isNotEmpty())
                "Connected - syncing clipboard" else "ClipSync is running"
            updateNotification(currentText)
            return START_NOT_STICKY
        }

        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val serverUrl = prefs.getString("server_url", "") ?: ""
        val secretKey = prefs.getString("secret_key", "") ?: ""
        deviceName = prefs.getString("device_name", "Android Phone") ?: "Android Phone"

        if (serverUrl.isEmpty() || secretKey.isEmpty()) {
            Log.w(TAG, "Service missing settings. serverUrlSet=${serverUrl.isNotEmpty()} secretKeySet=${secretKey.isNotEmpty()}")
            updateNotification("Waiting for settings - open ClipSync app")
            return START_NOT_STICKY
        }

        keyBytes = CryptoUtils.deriveKey(secretKey)
        val roomId = CryptoUtils.getRoomId(secretKey)
        val actionText = intent?.getStringExtra(EXTRA_TEXT)

        val settingsChanged = serverUrl != currentServerUrl || roomId != currentRoomId || wsClient == null
        if (settingsChanged) {
            Log.i(TAG, "Connecting with settingsChanged=$settingsChanged server=$serverUrl room=${roomId.take(8)}...")
            wsClient?.disconnect()
            currentServerUrl = serverUrl
            currentRoomId = roomId

            wsClient = WsClient(
                url = serverUrl,
                roomId = roomId,
                onMessage = { encryptedPayload -> handleIncomingPayload(encryptedPayload) },
                onConnected = {
                    Log.i(TAG, "WebSocket connected; queued=${pendingOutgoing.size}")
                    flushPendingOutgoing()
                    updateNotification("Connected - syncing clipboard")
                },
                onDisconnected = { reason ->
                    Log.w(TAG, "WebSocket disconnected: $reason")
                    updateNotification("Disconnected - reconnecting...")
                },
            )
            wsClient?.connect()
        } else {
            Log.d(TAG, "Reusing existing WebSocket for server=$serverUrl room=${roomId.take(8)}...")
        }

        if (!listenerRegistered) {
            clipboardManager.addPrimaryClipChangedListener(this)
            listenerRegistered = true
        }

        if (!actionText.isNullOrBlank()) {
            Log.i(TAG, "Manual send request from ${intent.getStringExtra(EXTRA_SOURCE) ?: "external"} (${actionText.length} chars)")
            sendClipboardText(actionText, intent.getStringExtra(EXTRA_SOURCE) ?: "external")
        }

        if (settingsChanged) {
            updateNotification("Connecting to server...")
        }

        Log.i(TAG, "Service started with server=$serverUrl")
        return START_NOT_STICKY
    }

    private fun handleIncomingPayload(encryptedPayload: String) {
        Log.d(TAG, "Handling incoming encrypted payload (${encryptedPayload.length} chars)")
        val key = keyBytes ?: run {
            Log.w(TAG, "Incoming payload ignored: encryption key is not ready")
            return
        }
        val decrypted = CryptoUtils.decryptPayload(encryptedPayload, key) ?: run {
            Log.w(TAG, "Incoming payload ignored: decrypt failed")
            return
        }
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
        Log.d(TAG, "Primary clipboard changed")
        sendClipboardText(readClipboardText() ?: return, "clipboard_listener")
    }

    private fun readClipboardText(): String? {
        val clip = clipboardManager.primaryClip ?: return null
        if (clip.itemCount == 0) return null
        return clip.getItemAt(0).coerceToText(this)?.toString()
    }

    private fun sendClipboardText(text: String, source: String) {
        if (text.isBlank()) {
            Log.d(TAG, "Ignored blank clipboard text from $source")
            return
        }
        if (text == lastClipboardText) {
            Log.d(TAG, "Ignored duplicate clipboard text from $source")
            return
        }

        lastClipboardText = text
        val key = keyBytes ?: run {
            Log.w(TAG, "Cannot send from $source: encryption key is not ready")
            return
        }

        val payload = CryptoUtils.encryptPayload(deviceName, text, key)
        val sent = wsClient?.send(payload) ?: false
        if (sent) {
            Log.i(TAG, "Sent from $source (${text.length} chars): ${text.take(30)}...")
            updateNotification("Sent: ${text.take(25)}...")
        } else {
            pendingOutgoing.add(payload)
            Log.i(TAG, "Queued from $source (${text.length} chars). queue=${pendingOutgoing.size}: ${text.take(30)}...")
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
                Log.w(TAG, "Stopped flushing queue after $sentCount sent; remaining=${pendingOutgoing.size}")
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

        val builder = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("ClipSync")
            .setContentText(text)
            .setSmallIcon(R.drawable.ic_stat_clipsync)
            .setContentIntent(pendingIntent)
            .setOngoing(true)

        val showSendAction = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .getBoolean(PREF_SHOW_SEND_NOTIFICATION_ACTION, false)
        if (showSendAction) {
            val sendIntent = Intent(this, SendClipboardActivity::class.java)
            val sendPendingIntent = PendingIntent.getActivity(
                this,
                1,
                sendIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            builder.addAction(
                R.drawable.ic_stat_clipsync,
                getString(R.string.send_clipboard_action),
                sendPendingIntent
            )
        }

        return builder.build()
    }

    private fun updateNotification(text: String) {
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.notify(NOTIFICATION_ID, buildNotification(text))

        // Mirror status to SharedPreferences so MainActivity can display it
        getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(PREF_SERVICE_STATUS, text)
            .apply()
    }

    override fun onDestroy() {
        Log.i(TAG, "Service destroyed")
        if (listenerRegistered) {
            clipboardManager.removePrimaryClipChangedListener(this)
            listenerRegistered = false
        }
        wsClient?.disconnect()

        // Clear live status so the Activity shows "Stopped"
        getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .remove(PREF_SERVICE_STATUS)
            .apply()

        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
