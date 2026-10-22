package com.clipsync

import android.util.Log
import okhttp3.*
import java.util.concurrent.Executors
import java.util.concurrent.ScheduledExecutorService
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean

class WsClient(
    private val url: String,
    private val roomId: String,
    private val onMessage: (String) -> Unit,
    private val onConnected: () -> Unit,
    private val onDisconnected: (String) -> Unit,
) {
    companion object {
        private const val TAG = "WsClient"
        // Back off while the server stays unreachable so an offline phone is
        // not waking the radio every few seconds.
        private const val RECONNECT_MIN_SECONDS = 2L
        private const val RECONNECT_MAX_SECONDS = 60L
    }

    private val client = OkHttpClient.Builder()
        .readTimeout(0, TimeUnit.MILLISECONDS)
        .pingInterval(20, TimeUnit.SECONDS)
        .retryOnConnectionFailure(true)
        .build()

    private var webSocket: WebSocket? = null
    private val reconnectExecutor: ScheduledExecutorService = Executors.newSingleThreadScheduledExecutor()
    private val isConnected = AtomicBoolean(false)
    private val reconnectScheduled = AtomicBoolean(false)

    @Volatile
    private var reconnectDelaySeconds = RECONNECT_MIN_SECONDS

    @Volatile
    private var shouldReconnect = true

    fun connect() {
        shouldReconnect = true
        reconnectScheduled.set(false)
        val fullUrl = if (url.endsWith("/")) "${url}ws/$roomId" else "$url/ws/$roomId"
        Log.i(TAG, "Connecting to $fullUrl")

        val request = Request.Builder().url(fullUrl).build()

        webSocket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                isConnected.set(true)
                reconnectDelaySeconds = RECONNECT_MIN_SECONDS
                Log.i(TAG, "Connected. HTTP ${response.code}: ${response.message}")
                onConnected()
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                Log.d(TAG, "Received websocket message (${text.length} chars)")
                onMessage(text)
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                val responseInfo = response?.let { " HTTP ${it.code}: ${it.message}" } ?: ""
                val reason = "Failure:$responseInfo ${t.javaClass.simpleName}: ${t.message}"
                isConnected.set(false)
                Log.w(TAG, reason, t)
                onDisconnected(reason)
                scheduleReconnect(reason)
            }

            override fun onClosing(webSocket: WebSocket, code: Int, reason: String) {
                Log.i(TAG, "Connection closing. code=$code reason=$reason")
            }

            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                val closeReason = "Closed: code=$code reason=$reason"
                isConnected.set(false)
                Log.i(TAG, closeReason)
                onDisconnected(closeReason)
                scheduleReconnect(closeReason)
            }
        })
    }

    fun send(message: String): Boolean {
        if (!isConnected.get()) {
            Log.w(TAG, "Send skipped: websocket is not connected (${message.length} chars)")
            return false
        }

        val sent = webSocket?.send(message) ?: false
        if (!sent) {
            Log.w(TAG, "Send failed: OkHttp rejected message (${message.length} chars)")
        } else {
            Log.d(TAG, "Send accepted by OkHttp (${message.length} chars)")
        }
        return sent
    }

    fun disconnect() {
        shouldReconnect = false
        reconnectScheduled.set(false)
        isConnected.set(false)
        webSocket?.close(1000, "User disconnected")
        webSocket = null
        reconnectExecutor.shutdownNow()
        client.dispatcher.executorService.shutdown()
        client.connectionPool.evictAll()
    }

    private fun scheduleReconnect(reason: String) {
        if (!shouldReconnect) {
            Log.i(TAG, "Reconnect skipped after $reason")
            return
        }
        if (!reconnectScheduled.compareAndSet(false, true)) {
            Log.d(TAG, "Reconnect already scheduled")
            return
        }

        val delay = reconnectDelaySeconds
        reconnectDelaySeconds = (delay * 2).coerceAtMost(RECONNECT_MAX_SECONDS)
        Log.i(TAG, "Reconnecting in ${delay}s after $reason")
        reconnectExecutor.schedule({
            if (shouldReconnect) {
                connect()
            }
        }, delay, TimeUnit.SECONDS)
    }
}
