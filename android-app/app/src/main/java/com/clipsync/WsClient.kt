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
        private const val CHUNK_SIZE = 512 * 1024
    }

    private class ChunkGroup(val total: Int, val created: Long) {
        val chunks = arrayOfNulls<String>(total)
        var received = 0
    }

    private val chunkBuffer = mutableMapOf<String, ChunkGroup>()

    private val client = OkHttpClient.Builder()
        .readTimeout(0, TimeUnit.MILLISECONDS)
        .pingInterval(20, TimeUnit.SECONDS)
        .retryOnConnectionFailure(true)
        .build()

    private var webSocket: WebSocket? = null
    private val reconnectExecutor: ScheduledExecutorService = Executors.newSingleThreadScheduledExecutor()
    private val sendExecutor: ScheduledExecutorService = Executors.newSingleThreadScheduledExecutor()
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
                if (text.startsWith("cs_chunk:v1:")) {
                    val full = handleChunk(text) ?: return
                    Log.d(TAG, "Reassembled chunked message (${full.length} chars)")
                    onMessage(full)
                } else {
                    Log.d(TAG, "Received websocket message (${text.length} chars)")
                    onMessage(text)
                }
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

    fun isConnected(): Boolean = isConnected.get()

    fun send(message: String, onComplete: ((Boolean) -> Unit)? = null) {
        val ws = webSocket
        if (!isConnected.get() || ws == null) {
            Log.w(TAG, "Send skipped: websocket is not connected (${message.length} chars)")
            onComplete?.invoke(false)
            return
        }

        if (message.length <= CHUNK_SIZE) {
            val sent = ws.send(message)
            if (!sent) Log.w(TAG, "Send failed: OkHttp rejected message (${message.length} chars)")
            onComplete?.invoke(sent)
            return
        }

        sendExecutor.execute {
            val targetWs = webSocket
            if (!isConnected.get() || targetWs == null) {
                onComplete?.invoke(false)
                return@execute
            }
            val msgId = java.util.UUID.randomUUID().toString().replace("-", "").take(12)
            val total = (message.length + CHUNK_SIZE - 1) / CHUNK_SIZE
            Log.i(TAG, "Sending chunked message $msgId: ${message.length} chars in $total chunks")
            var failed = false
            for (idx in 0 until total) {
                val currentWs = webSocket
                if (!isConnected.get() || currentWs == null) {
                    failed = true
                    break
                }
                // Backpressure: wait for OkHttp outgoing queue to drain below 1.5 MiB
                // to stay safely below OkHttp's hard 16 MiB queue limit.
                var waitMs = 0
                while (currentWs.queueSize() > 1536 * 1024L) {
                    if (!isConnected.get() || waitMs >= 30_000) {
                        failed = true
                        break
                    }
                    try {
                        Thread.sleep(20)
                        waitMs += 20
                    } catch (e: InterruptedException) {
                        failed = true
                        break
                    }
                }
                if (failed) break

                val start = idx * CHUNK_SIZE
                val end = minOf(start + CHUNK_SIZE, message.length)
                val chunk = message.substring(start, end)
                val frame = "cs_chunk:v1:$msgId:$idx:$total:$chunk"
                val sent = currentWs.send(frame)
                if (!sent) {
                    Log.w(TAG, "Send failed on chunk $idx/$total of message $msgId (queue=${currentWs.queueSize()})")
                    failed = true
                    break
                }
            }
            if (!failed) {
                Log.i(TAG, "Successfully sent all $total chunks of message $msgId")
            }
            onComplete?.invoke(!failed)
        }
    }

    @Synchronized
    private fun handleChunk(frame: String): String? {
        val parts = frame.split(":", limit = 6)
        if (parts.size != 6) return null
        val msgId = parts[2]
        val idx = parts[3].toIntOrNull() ?: return null
        val total = parts[4].toIntOrNull() ?: return null
        val chunk = parts[5]

        val now = System.currentTimeMillis()
        chunkBuffer.entries.removeAll { now - it.value.created > 60_000 }

        val group = chunkBuffer.getOrPut(msgId) { ChunkGroup(total, now) }
        if (idx in 0 until total && group.chunks[idx] == null) {
            group.chunks[idx] = chunk
            group.received++
        }
        if (group.received == total) {
            chunkBuffer.remove(msgId)
            val sb = StringBuilder(total * CHUNK_SIZE)
            for (part in group.chunks) {
                sb.append(part ?: "")
            }
            return sb.toString()
        }
        return null
    }

    fun disconnect() {
        shouldReconnect = false
        reconnectScheduled.set(false)
        isConnected.set(false)
        webSocket?.close(1000, "User disconnected")
        webSocket = null
        reconnectExecutor.shutdownNow()
        sendExecutor.shutdownNow()
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
