package com.clipsync

import android.util.Log
import okhttp3.*
import java.util.concurrent.TimeUnit

class WsClient(
    private val url: String,
    private val roomId: String,
    private val onMessage: (String) -> Unit,
    private val onConnected: () -> Unit,
    private val onDisconnected: () -> Unit,
) {
    companion object {
        private const val TAG = "WsClient"
    }

    private val client = OkHttpClient.Builder()
        .readTimeout(0, TimeUnit.MILLISECONDS)
        .pingInterval(20, TimeUnit.SECONDS)
        .retryOnConnectionFailure(true)
        .build()

    private var webSocket: WebSocket? = null
    @Volatile
    private var shouldReconnect = true

    fun connect() {
        shouldReconnect = true
        val fullUrl = if (url.endsWith("/")) "${url}ws/$roomId" else "$url/ws/$roomId"
        Log.i(TAG, "Connecting to $fullUrl")

        val request = Request.Builder().url(fullUrl).build()

        webSocket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                Log.i(TAG, "Connected!")
                onConnected()
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                onMessage(text)
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                Log.w(TAG, "Connection failed: ${t.message}")
                onDisconnected()
                if (shouldReconnect) {
                    Thread.sleep(3000)
                    connect()
                }
            }

            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                Log.i(TAG, "Connection closed: $reason")
                onDisconnected()
                if (shouldReconnect) {
                    Thread.sleep(3000)
                    connect()
                }
            }
        })
    }

    fun send(message: String): Boolean {
        return webSocket?.send(message) ?: false
    }

    fun disconnect() {
        shouldReconnect = false
        webSocket?.close(1000, "User disconnected")
        webSocket = null
    }
}
