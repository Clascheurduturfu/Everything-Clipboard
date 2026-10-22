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
import android.net.Uri
import android.os.PersistableBundle
import android.util.Log
import androidx.core.app.NotificationCompat
import java.util.concurrent.Executors

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
        const val PREF_SYNC_IMAGES = "sync_images"
        const val PREF_IMAGES_WIFI_ONLY = "images_wifi_only"

        const val ACTION_SEND_TEXT = "com.clipsync.action.SEND_TEXT"
        const val ACTION_REFRESH_NOTIFICATION = "com.clipsync.action.REFRESH_NOTIFICATION"
        const val ACTION_APP_OPENED = "com.clipsync.action.APP_OPENED"
        const val ACTION_APP_CLOSED = "com.clipsync.action.APP_CLOSED"
        const val EXTRA_TEXT = "com.clipsync.extra.TEXT"
        const val EXTRA_SOURCE = "com.clipsync.extra.SOURCE"
        // Explicit "Send Clipboard" taps resend even if that text already went out.
        const val EXTRA_FORCE = "com.clipsync.extra.FORCE"
        const val EXTRA_IMAGE_URI = "com.clipsync.extra.IMAGE_URI"
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
    @Volatile private var lastImageHash: String = ""
    // Image reads and encryption are too heavy for the main thread.
    private val imageExecutor = Executors.newSingleThreadExecutor()

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
        val actionImage = intent?.getStringExtra(EXTRA_IMAGE_URI)
        val isOneShotSend = intent?.action == ACTION_SEND_TEXT &&
            (!actionText.isNullOrBlank() || !actionImage.isNullOrBlank()) && !shouldKeepRunning(prefs)

        syncForegroundState("ClipSync is starting...")

        if (serverUrl.isEmpty() || secretKey.isEmpty()) {
            Log.w(TAG, "Service missing settings. serverUrlSet=${serverUrl.isNotEmpty()} secretKeySet=${secretKey.isNotEmpty()}")
            setStatus("Waiting for settings - open ClipSync app")
            ClipState.update(ClipState.Connection.DISCONNECTED, "Enter your server and secret key")
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
                    ClipState.update(ClipState.Connection.CONNECTED, "Syncing clipboard")
                    syncForegroundState("Connected - syncing clipboard")
                },
                onDisconnected = { reason ->
                    Log.w(TAG, "WebSocket disconnected: $reason")
                    setStatus("Disconnected - reconnecting...")
                    ClipState.update(ClipState.Connection.DISCONNECTED, "Reconnecting...")
                    syncForegroundState("Disconnected - reconnecting...")
                },
            )
            wsClient?.connect()
        } else {
            Log.d(TAG, "Reusing existing WebSocket for server=$serverUrl room=${roomId.take(8)}...")
        }

        updateClipboardListener()

        if (!actionImage.isNullOrBlank()) {
            sendClipboardImage(
                uri = Uri.parse(actionImage),
                source = intent.getStringExtra(EXTRA_SOURCE) ?: "external",
                oneShot = isOneShotSend,
                force = intent.getBooleanExtra(EXTRA_FORCE, false)
            )
        } else if (!actionText.isNullOrBlank()) {
            Log.i(TAG, "Manual send request from ${intent.getStringExtra(EXTRA_SOURCE) ?: "external"} (${actionText.length} chars)")
            sendClipboardText(
                text = actionText,
                source = intent.getStringExtra(EXTRA_SOURCE) ?: "external",
                oneShot = isOneShotSend,
                force = intent.getBooleanExtra(EXTRA_FORCE, false)
            )
        }

        if (settingsChanged) {
            setStatus("Connecting to server...")
            ClipState.update(ClipState.Connection.CONNECTING, serverUrl)
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
        if (decrypted is Clip.Image) {
            handleIncomingImage(decrypted)
            return
        }
        val senderDevice = decrypted.device
        val content = (decrypted as Clip.Text).content

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
            ClipState.received(senderDevice, content)
            // Status is persisted, so it never carries clipboard content.
            setStatus("Received from $senderDevice")
            syncForegroundState("From $senderDevice: ${content.take(25)}...")
        }
    }

    private fun handleIncomingImage(image: Clip.Image) {
        if (!getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).getBoolean(PREF_SYNC_IMAGES, true)) {
            Log.i(TAG, "Image from ${image.device} ignored: image sync is off")
            return
        }
        // Runs on the socket thread: file I/O is fine here, the UI is not.
        val uri = ClipImages.store(this, image.bytes, image.mime)
        val thumbnail = ClipImages.thumbnail(image.bytes)
        lastImageHash = CryptoUtils.sha256Hex(image.bytes)
        val label = "Image ${image.width}\u00d7${image.height}"
        Log.i(TAG, "Received image from ${image.device}: $label, ${image.bytes.size} bytes")

        mainHandler.post {
            if (listenerRegistered) {
                clipboardManager.removePrimaryClipChangedListener(this)
                listenerRegistered = false
            }
            clipboardManager.setPrimaryClip(ClipImages.clipFor(this, uri, shouldMarkIncomingSensitive()))
            updateClipboardListener()
            ClipState.receivedImage(image.device, label, thumbnail, uri)
            setStatus("Received image from ${image.device}")
            syncForegroundState("Image from ${image.device}")
        }
    }

    override fun onPrimaryClipChanged() {
        Log.d(TAG, "Primary clipboard changed")
        val image = ClipImages.imageOf(this, clipboardManager.primaryClip)
        if (image != null) {
            sendClipboardImage(image.first, "clipboard_listener", oneShot = false)
            return
        }
        sendClipboardText(readClipboardText() ?: return, "clipboard_listener", oneShot = false)
    }

    private fun sendClipboardImage(uri: Uri, source: String, oneShot: Boolean, force: Boolean = false) {
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        if (ClipImages.isOwn(this, uri) || !prefs.getBoolean(PREF_SYNC_IMAGES, true)) {
            if (oneShot) maybeStopIfIdle()
            return
        }
        if (prefs.getBoolean(PREF_IMAGES_WIFI_ONLY, true) && ClipImages.isMetered(this)) {
            Log.i(TAG, "Image from $source not sent: on mobile data with Wi-Fi only on")
            setStatus("Image not sent (Wi-Fi only)")
            ClipState.update(detail = "Image not sent: Wi-Fi only is on")
            if (oneShot) maybeStopIfIdle()
            return
        }
        val key = keyBytes ?: run {
            Log.w(TAG, "Cannot send image from $source: encryption key is not ready")
            if (oneShot) maybeStopIfIdle()
            return
        }

        imageExecutor.execute {
            val bytes = ClipImages.read(this, uri)
            var payload: String? = null
            var status = ""
            when {
                bytes == null -> Log.w(TAG, "Could not read image from $source")
                bytes.size > ClipImages.MAX_IMAGE_BYTES -> status = "Image too large to sync (over 5 MB)"
                else -> {
                    val hash = CryptoUtils.sha256Hex(bytes)
                    if (hash == lastImageHash && !force) {
                        Log.d(TAG, "Ignored duplicate image from $source")
                    } else {
                        lastImageHash = hash
                        val (width, height) = ClipImages.dimensions(bytes)
                        val mime = contentResolver.getType(uri) ?: "image/png"
                        payload = CryptoUtils.encryptImagePayload(deviceName, bytes, mime, width, height, key)
                        status = "Sent image ${width}\u00d7${height}"
                    }
                }
            }
            mainHandler.post {
                val ready = payload
                if (ready != null) {
                    deliver(ready, oneShot, source, status)
                } else if (status.isNotEmpty()) {
                    setStatus(status)
                    ClipState.update(detail = status)
                }
                if (oneShot && ready == null) maybeStopIfIdle()
            }
        }
    }

    private fun deliver(payload: String, oneShot: Boolean, source: String, sentStatus: String) {
        if (wsClient?.send(payload) == true) {
            Log.i(TAG, "$sentStatus from $source")
            setStatus(sentStatus)
            ClipState.update(detail = sentStatus)
            syncForegroundState(sentStatus)
            if (oneShot) maybeStopIfIdle()
        } else {
            pendingOutgoing.add(PendingOutgoing(payload, oneShot))
            setStatus("Queued - reconnecting...")
            ClipState.update(detail = "Queued - reconnecting...")
            syncForegroundState("Queued - reconnecting...")
        }
    }

    private fun readClipboardText(): String? {
        val clip = clipboardManager.primaryClip ?: return null
        if (clip.itemCount == 0) return null
        return clip.getItemAt(0).coerceToText(this)?.toString()
    }

    private fun sendClipboardText(text: String, source: String, oneShot: Boolean, force: Boolean = false) {
        if (text.isBlank()) {
            Log.d(TAG, "Ignored blank clipboard text from $source")
            if (oneShot) maybeStopIfIdle()
            return
        }
        if (text == lastClipboardText && !force) {
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
            setStatus("Sent clipboard (${text.length} chars)")
            ClipState.update(detail = "Sent clipboard (${text.length} chars)")
            syncForegroundState("Sent: ${text.take(25)}...")
            if (oneShot) maybeStopIfIdle()
        } else {
            pendingOutgoing.add(PendingOutgoing(payload, oneShot))
            Log.i(TAG, "Queued from $source (${text.length} chars). queue=${pendingOutgoing.size}: ${text.take(30)}...")
            setStatus("Queued clipboard - reconnecting...")
            ClipState.update(detail = "Queued clipboard - reconnecting...")
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
        imageExecutor.shutdownNow()
        cancelNotification()

        ClipState.update(ClipState.Connection.IDLE, "")
        // Clear live status so the Activity shows "Stopped"
        getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .remove(PREF_SERVICE_STATUS)
            .apply()

        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
