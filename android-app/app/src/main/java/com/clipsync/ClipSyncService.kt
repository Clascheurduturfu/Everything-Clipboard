package com.clipsync

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.ClipData
import android.content.ClipDescription
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PersistableBundle
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
        const val PREF_RUN_IN_BACKGROUND = "service_running"
        const val PREF_APP_VISIBLE = "app_visible"
        const val PREF_USE_SENSITIVE_CLIPBOARD = "use_sensitive_clipboard"

        const val ACTION_SEND_TEXT = "com.clipsync.action.SEND_TEXT"
        const val ACTION_REFRESH_NOTIFICATION = "com.clipsync.action.REFRESH_NOTIFICATION"
        const val ACTION_APP_OPENED = "com.clipsync.action.APP_OPENED"
        const val ACTION_APP_CLOSED = "com.clipsync.action.APP_CLOSED"
        const val EXTRA_TEXT = "com.clipsync.extra.TEXT"
        const val EXTRA_SOURCE = "com.clipsync.extra.SOURCE"
    }

    private data class PendingOutgoing(val payload: String, val oneShot: Boolean)

    private lateinit var clipboardManager: ClipboardManager
    private var wsClient: WsClient? = null
    private var lastClipboardText: String = ""
    private var keyBytes: ByteArray? = null
    private var deviceName: String = ""
    private val mainHandler = Handler(Looper.getMainLooper())
    private val pendingOutgoing = mutableListOf<PendingOutgoing>()
    private var currentServerUrl: String = ""
    private var currentRoomId: String = ""
    private var listenerRegistered = false
    private var foregroundActive = false

    override fun onCreate() {
        super.onCreate()
        clipboardManager = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        createNotificationChannel()
        Log.i(TAG, "Service created")
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.i(TAG, "onStartCommand action=${intent?.action ?: "none"} startId=$startId")
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

        when (intent?.action) {
            ACTION_APP_OPENED -> {
                prefs.edit().putBoolean(PREF_APP_VISIBLE, true).apply()
            }
            ACTION_APP_CLOSED -> {
                prefs.edit().putBoolean(PREF_APP_VISIBLE, false).apply()
                syncForegroundState("ClipSync is running")
                updateClipboardListener()
                maybeStopIfIdle()
                return START_NOT_STICKY
            }
        }

        // Handle notification refresh without touching WebSocket
        if (intent?.action == ACTION_REFRESH_NOTIFICATION) {
            Log.i(TAG, "Refreshing notification (action button toggled)")
            val currentText = if (wsClient != null && currentServerUrl.isNotEmpty())
                "Connected - syncing clipboard" else "ClipSync is running"
            setStatus(currentText)
            syncForegroundState(currentText)
            maybeStopIfIdle()
            return START_NOT_STICKY
        }

        val serverUrl = prefs.getString("server_url", "") ?: ""
        val secretKey = prefs.getString("secret_key", "") ?: ""
        deviceName = prefs.getString("device_name", "Android Phone") ?: "Android Phone"
        val actionText = intent?.getStringExtra(EXTRA_TEXT)
        val isOneShotSend = intent?.action == ACTION_SEND_TEXT && !actionText.isNullOrBlank() && !shouldKeepRunning(prefs)

        syncForegroundState("ClipSync is starting...")

        if (serverUrl.isEmpty() || secretKey.isEmpty()) {
            Log.w(TAG, "Service missing settings. serverUrlSet=${serverUrl.isNotEmpty()} secretKeySet=${secretKey.isNotEmpty()}")
            setStatus("Waiting for settings - open ClipSync app")
            if (isOneShotSend) maybeStopIfIdle()
            return START_NOT_STICKY
        }

        keyBytes = CryptoUtils.deriveKey(secretKey)
        val roomId = CryptoUtils.getRoomId(secretKey)

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
                    setStatus("Connected - syncing clipboard")
                    syncForegroundState("Connected - syncing clipboard")
                },
                onDisconnected = { reason ->
                    Log.w(TAG, "WebSocket disconnected: $reason")
                    setStatus("Disconnected - reconnecting...")
                    syncForegroundState("Disconnected - reconnecting...")
                },
            )
            wsClient?.connect()
        } else {
            Log.d(TAG, "Reusing existing WebSocket for server=$serverUrl room=${roomId.take(8)}...")
        }

        updateClipboardListener()

        if (!actionText.isNullOrBlank()) {
            Log.i(TAG, "Manual send request from ${intent.getStringExtra(EXTRA_SOURCE) ?: "external"} (${actionText.length} chars)")
            sendClipboardText(
                text = actionText,
                source = intent.getStringExtra(EXTRA_SOURCE) ?: "external",
                oneShot = isOneShotSend
            )
        }

        if (settingsChanged) {
            setStatus("Connecting to server...")
            syncForegroundState("Connecting to server...")
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
            if (listenerRegistered) {
                clipboardManager.removePrimaryClipChangedListener(this)
                listenerRegistered = false
            }

            val clip = ClipData.newPlainText("ClipSync", content).apply {
                if (shouldMarkIncomingSensitive()) {
                    description.setExtras(
                        PersistableBundle().apply {
                            putBoolean(ClipDescription.EXTRA_IS_SENSITIVE, true)
                        }
                    )
                }
            }
            clipboardManager.setPrimaryClip(clip)

            updateClipboardListener()
            setStatus("From $senderDevice: ${content.take(25)}...")
            syncForegroundState("From $senderDevice: ${content.take(25)}...")
        }
    }

    override fun onPrimaryClipChanged() {
        Log.d(TAG, "Primary clipboard changed")
        sendClipboardText(readClipboardText() ?: return, "clipboard_listener", oneShot = false)
    }

    private fun readClipboardText(): String? {
        val clip = clipboardManager.primaryClip ?: return null
        if (clip.itemCount == 0) return null
        return clip.getItemAt(0).coerceToText(this)?.toString()
    }

    private fun sendClipboardText(text: String, source: String, oneShot: Boolean) {
        if (text.isBlank()) {
            Log.d(TAG, "Ignored blank clipboard text from $source")
            if (oneShot) maybeStopIfIdle()
            return
        }
        if (text == lastClipboardText) {
            Log.d(TAG, "Ignored duplicate clipboard text from $source")
            if (oneShot) maybeStopIfIdle()
            return
        }

        lastClipboardText = text
        val key = keyBytes ?: run {
            Log.w(TAG, "Cannot send from $source: encryption key is not ready")
            if (oneShot) maybeStopIfIdle()
            return
        }

        val payload = CryptoUtils.encryptPayload(deviceName, text, key)
        val sent = wsClient?.send(payload) ?: false
        if (sent) {
            Log.i(TAG, "Sent from $source (${text.length} chars): ${text.take(30)}...")
            setStatus("Sent: ${text.take(25)}...")
            syncForegroundState("Sent: ${text.take(25)}...")
            if (oneShot) maybeStopIfIdle()
        } else {
            pendingOutgoing.add(PendingOutgoing(payload, oneShot))
            Log.i(TAG, "Queued from $source (${text.length} chars). queue=${pendingOutgoing.size}: ${text.take(30)}...")
            setStatus("Queued clipboard - reconnecting...")
            syncForegroundState("Queued clipboard - reconnecting...")
        }
    }

    private fun flushPendingOutgoing() {
        if (pendingOutgoing.isEmpty()) return

        val iterator = pendingOutgoing.iterator()
        var sentCount = 0
        var sentOneShot = false
        while (iterator.hasNext()) {
            val pending = iterator.next()
            if (wsClient?.send(pending.payload) == true) {
                sentOneShot = sentOneShot || pending.oneShot
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
        if (sentOneShot && pendingOutgoing.none { it.oneShot }) {
            maybeStopIfIdle()
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

    private fun setStatus(text: String) {
        getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(PREF_SERVICE_STATUS, text)
            .apply()
    }

    private fun updateNotification(text: String) {
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.notify(NOTIFICATION_ID, buildNotification(text))
    }

    private fun cancelNotification() {
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.cancel(NOTIFICATION_ID)
    }

    private fun syncForegroundState(text: String) {
        if (shouldShowNotification()) {
            startForeground(NOTIFICATION_ID, buildNotification(text))
            foregroundActive = true
        } else {
            if (foregroundActive) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                    stopForeground(STOP_FOREGROUND_REMOVE)
                } else {
                    @Suppress("DEPRECATION")
                    stopForeground(true)
                }
                foregroundActive = false
            }
            cancelNotification()
        }
    }

    private fun updateClipboardListener() {
        val shouldListen = shouldKeepRunning()
        if (shouldListen && !listenerRegistered) {
            clipboardManager.addPrimaryClipChangedListener(this)
            listenerRegistered = true
        } else if (!shouldListen && listenerRegistered) {
            clipboardManager.removePrimaryClipChangedListener(this)
            listenerRegistered = false
        }
    }

    private fun shouldKeepRunning(): Boolean {
        return shouldKeepRunning(getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE))
    }

    private fun shouldKeepRunning(prefs: android.content.SharedPreferences): Boolean {
        return prefs.getBoolean(PREF_APP_VISIBLE, false) ||
            prefs.getBoolean(PREF_RUN_IN_BACKGROUND, false) ||
            prefs.getBoolean(PREF_SHOW_SEND_NOTIFICATION_ACTION, false)
    }

    private fun shouldShowNotification(): Boolean {
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        return prefs.getBoolean(PREF_RUN_IN_BACKGROUND, false) ||
            prefs.getBoolean(PREF_SHOW_SEND_NOTIFICATION_ACTION, false)
    }

    private fun shouldMarkIncomingSensitive(): Boolean {
        return getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .getBoolean(PREF_USE_SENSITIVE_CLIPBOARD, true)
    }

    private fun maybeStopIfIdle() {
        if (shouldKeepRunning() || pendingOutgoing.any { it.oneShot }) return

        mainHandler.postDelayed({
            if (!shouldKeepRunning() && pendingOutgoing.none { it.oneShot }) {
                Log.i(TAG, "Stopping idle one-shot service")
                stopSelf()
            }
        }, 700)
    }

    override fun onDestroy() {
        Log.i(TAG, "Service destroyed")
        if (listenerRegistered) {
            clipboardManager.removePrimaryClipChangedListener(this)
            listenerRegistered = false
        }
        wsClient?.disconnect()
        cancelNotification()

        // Clear live status so the Activity shows "Stopped"
        getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .remove(PREF_SERVICE_STATUS)
            .apply()

        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
