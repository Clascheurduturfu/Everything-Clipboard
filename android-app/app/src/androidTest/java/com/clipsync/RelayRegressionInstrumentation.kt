package com.clipsync

import android.app.Activity
import android.app.Instrumentation
import android.os.Bundle
import java.util.UUID
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

/** Regression checks against the public TLS relay using a disposable synthetic room. */
object RelayRegressionChecks {
    fun runWith(instrumentation: Instrumentation) {
        val clients = mutableListOf<WsClient>()
        var passed = 0
        fun verify(value: Boolean, label: String) {
            check(value) { label }
            passed++
            instrumentation.sendStatus(0, Bundle().apply { putString("check", label) })
        }
        try {
            verify(RelayAddress.normalize("wss://serv.everything-clipboard.online/") == RelayAddress.DEFAULT,
                "Known mistaken website-domain relay address is corrected")
            verify(RelayAddress.normalize(" wss://custom.example/relay/ ") == "wss://custom.example/relay",
                "Custom relay addresses are preserved")
            verify(runCatching { RelayAddress.normalize("https://example.com") }.isFailure,
                "Non-WebSocket schemes are rejected")
            verify(runCatching { RelayAddress.normalize("wss://example.com?secret=private") }.isFailure,
                "Query credentials are rejected")
            val connected = CountDownLatch(2)
            val received = CountDownLatch(1)
            val key = CryptoUtils.deriveKey(UUID.randomUUID().toString())
            val room = CryptoUtils.getRoomId(UUID.randomUUID().toString())
            repeat(2) { i ->
                clients += WsClient(RelayAddress.DEFAULT, room, { encrypted ->
                    if (i == 1 && (CryptoUtils.decryptPayload(encrypted, key) as? Clip.Text)?.content == "RC3 synthetic transfer") received.countDown()
                }, { connected.countDown() }, {})
            }
            clients.forEach { it.connect() }
            verify(connected.await(30, TimeUnit.SECONDS), "Both Android clients connect to the public WSS relay")
            clients[0].send(CryptoUtils.encryptPayload("RC3 test", "RC3 synthetic transfer", key))
            verify(received.await(15, TimeUnit.SECONDS), "Encrypted text crosses the public relay and decrypts on the paired client")
            val failed = CountDownLatch(1)
            var error = ""
            val invalid = WsClient("wss://clipsync-does-not-exist.invalid", room, {}, {}, {
                error = it; failed.countDown()
            })
            clients += invalid
            invalid.connect()
            verify(failed.await(15, TimeUnit.SECONDS) && error.contains("Server address not found"),
                "DNS failure explains the address problem instead of only Reconnecting")
            instrumentation.finish(Activity.RESULT_OK, Bundle().apply { putInt("passed", passed) })
        } catch (failure: Throwable) {
            instrumentation.finish(Activity.RESULT_CANCELED, Bundle().apply { putString("failure", failure.stackTraceToString()) })
        } finally { clients.forEach { it.disconnect() } }
    }
}
