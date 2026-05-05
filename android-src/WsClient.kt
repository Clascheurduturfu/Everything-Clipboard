package com.clipsync

import okhttp3.*
import java.util.concurrent.TimeUnit

class WsClient(private val url: String, private val roomId: String, private val onMessage: (String) -> Unit) {
    private val client = OkHttpClient.Builder()
        .readTimeout(0, TimeUnit.MILLISECONDS)
        .pingInterval(30, TimeUnit.SECONDS)
        .build()

    private var webSocket: WebSocket? = null

    fun connect() {
        val fullUrl = if (url.endsWith("/")) "${url}ws/$roomId" else "$url/ws/$roomId"
        val request = Request.Builder().url(fullUrl).build()

        webSocket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onMessage(webSocket: WebSocket, text: String) {
                onMessage(text)
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                super.onFailure(webSocket, t, response)
                // Auto reconnect after 3 seconds
                Thread.sleep(3000)
                connect()
            }
            
            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                // Auto reconnect
                Thread.sleep(3000)
                connect()
            }
        })
    }

    fun send(message: String) {
        webSocket?.send(message)
    }

    fun disconnect() {
        webSocket?.close(1000, "User disconnected")
        webSocket = null
    }
}
