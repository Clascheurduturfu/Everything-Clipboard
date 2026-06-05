//
//  ClipSyncManager.swift
//  ClipSync
//
//  Core sync manager that orchestrates clipboard syncing over WebSocket.
//  Equivalent of the Android ClipSyncService, adapted for iOS/SwiftUI.
//

import Foundation
import UIKit
import CryptoKit
import os

/// Central manager for ClipSync clipboard synchronization.
///
/// Holds the WebSocket connection, encrypts/decrypts clipboard payloads,
/// and exposes observable state for the SwiftUI views.
@MainActor
final class ClipSyncManager: ObservableObject {

    // MARK: - Published UI State

    @Published var statusText: String = "Disconnected"
    @Published var isConnected: Bool = false
    @Published var isConnecting: Bool = false
    @Published var lastReceivedText: String = ""
    @Published var lastReceivedDevice: String = ""
    @Published var lastReceivedPreview: String = ""

    // MARK: - UserDefaults-backed Settings

    /// Display name for this device, sent along with clipboard payloads.
    var deviceName: String {
        get { defaults.string(forKey: Keys.deviceName) ?? "iPhone" }
        set { defaults.set(newValue, forKey: Keys.deviceName) }
    }

    /// Base URL of the ClipSync relay server (e.g. "wss://example.com").
    var serverUrl: String {
        get { defaults.string(forKey: Keys.serverUrl) ?? "" }
        set { defaults.set(newValue, forKey: Keys.serverUrl) }
    }

    /// Alias so ContentView can use the capitalised spelling.
    var serverURL: String {
        get { serverUrl }
        set { serverUrl = newValue }
    }

    /// Shared secret used to derive the AES key and room ID.
    var secretKey: String {
        get { defaults.string(forKey: Keys.secretKey) ?? "" }
        set { defaults.set(newValue, forKey: Keys.secretKey) }
    }

    /// When true, incoming clipboard content is automatically copied to the pasteboard.
    var autoCopyIncoming: Bool {
        get { defaults.bool(forKey: Keys.autoCopyIncoming, defaultValue: true) }
        set { defaults.set(newValue, forKey: Keys.autoCopyIncoming) }
    }

    // MARK: - Private State

    private let logger = Logger(subsystem: "com.clipsync", category: "ClipSyncManager")

    private var wsClient: WebSocketClient?
    private var derivedKey: SymmetricKey?
    private var lastSentText: String = ""

    private let defaults = UserDefaults(suiteName: "group.com.clipsync.ios") ?? .standard

    /// Keys for UserDefaults storage (prefixed with "clipsync_").
    private enum Keys {
        static let deviceName       = "clipsync_device_name"
        static let serverUrl        = "clipsync_server_url"
        static let secretKey        = "clipsync_secret_key"
        static let autoCopyIncoming = "clipsync_auto_copy_incoming"
    }

    // MARK: - Initializer

    init() {
        // Auto-connect on launch if settings look valid.
        if !serverUrl.isEmpty && !secretKey.isEmpty {
            connect()
        }
    }

    // MARK: - Connection Lifecycle

    /// Derives the encryption key on a background queue, then opens a WebSocket.
    func connect() {
        let server = serverUrl.trimmingCharacters(in: .whitespacesAndNewlines)
        let secret = secretKey.trimmingCharacters(in: .whitespacesAndNewlines)

        guard !server.isEmpty, !secret.isEmpty else {
            logger.warning("Cannot connect: server URL or secret key is empty.")
            updateStatus("Missing server URL or secret key")
            return
        }

        // Tear down any existing connection first.
        wsClient?.disconnect()
        wsClient = nil
        derivedKey = nil
        isConnecting = true
        isConnected = false
        updateStatus("Connecting...")

        // PBKDF2 with 200 000 iterations is CPU-heavy — run off the main thread.
        Task {
            let (key, roomId) = await Task.detached(priority: .userInitiated) {
                let k = CryptoUtils.deriveKey(secret: secret)
                let r = CryptoUtils.getRoomId(secret: secret)
                return (k, r)
            }.value

            self.derivedKey = key
            self.startWebSocket(serverUrl: server, roomId: roomId)
        }
    }

    /// Disconnects the WebSocket and resets connection state.
    func disconnect() {
        wsClient?.disconnect()
        wsClient = nil
        derivedKey = nil
        isConnected = false
        isConnecting = false
        updateStatus("Disconnected")
        logger.info("Disconnected by user request.")
    }

    /// Persists current settings to UserDefaults and reconnects.
    ///
    /// Call this after the user edits any connection-related setting
    /// (serverUrl, secretKey, deviceName).
    func saveAndReconnect() {
        // Settings are already written through the computed-property setters,
        // so we only need to trigger a fresh connection.
        disconnect()
        connect()
    }

    /// Alias used by ContentView.
    func saveAndConnect() {
        saveAndReconnect()
    }

    // MARK: - Clipboard Send / Receive

    /// Reads the current pasteboard, encrypts, and sends it to the room.
    func sendClipboard() {
        guard let text = UIPasteboard.general.string, !text.isEmpty else {
            logger.debug("sendClipboard: pasteboard is empty.")
            return
        }

        // Skip if this is the exact same text we already sent.
        guard text != lastSentText else {
            logger.debug("sendClipboard: duplicate — skipping.")
            return
        }

        guard let key = derivedKey else {
            logger.warning("sendClipboard: encryption key not ready.")
            updateStatus("Cannot send — not connected")
            return
        }

        guard let payload = CryptoUtils.encryptPayload(
            deviceName: deviceName,
            content: text,
            key: key
        ) else {
            logger.error("sendClipboard: encryption failed.")
            updateStatus("Encryption error")
            return
        }

        let sent = wsClient?.send(payload) ?? false
        if sent {
            lastSentText = text
            let preview = String(text.prefix(25))
            updateStatus("Sent: \(preview)...")
            logger.info("Sent clipboard (\(text.count) chars): \(preview)...")
        } else {
            updateStatus("Send failed — not connected")
            logger.warning("sendClipboard: WebSocket send returned false.")
        }
    }

    /// Copies the most recently received clipboard text to the local pasteboard.
    func copyLastReceived() {
        guard !lastReceivedText.isEmpty else { return }
        // Remember this text so we don't echo it back to the room.
        lastSentText = lastReceivedText
        UIPasteboard.general.string = lastReceivedText
        logger.info("Copied last received text to pasteboard.")
    }

    // MARK: - Internal Helpers

    /// Creates and connects the WebSocket client.
    private func startWebSocket(serverUrl: String, roomId: String) {
        let client = WebSocketClient(
            url: serverUrl,
            roomId: roomId,
            onMessage: { [weak self] encrypted in
                self?.handleIncomingPayload(encrypted)
            },
            onConnected: { [weak self] in
                DispatchQueue.main.async {
                    self?.isConnected = true
                    self?.isConnecting = false
                    self?.updateStatus("Connected — syncing clipboard")
                    self?.logger.info("WebSocket connected.")
                }
            },
            onDisconnected: { [weak self] reason in
                DispatchQueue.main.async {
                    self?.isConnected = false
                    self?.isConnecting = false
                    self?.updateStatus("Disconnected — \(reason)")
                    self?.logger.warning("WebSocket disconnected: \(reason)")
                }
            }
        )
        wsClient = client
        client.connect()
    }

    /// Decrypts an incoming payload, updates published state, and optionally
    /// copies the content to the local pasteboard.
    private func handleIncomingPayload(_ encrypted: String) {
        guard let key = derivedKey else {
            logger.warning("Incoming payload ignored: encryption key not ready.")
            return
        }

        guard let result = CryptoUtils.decryptPayload(base64Payload: encrypted, key: key) else {
            logger.warning("Incoming payload ignored: decryption failed.")
            return
        }

        let senderDevice = result.deviceName
        let content = result.content
        let preview = String(content.prefix(25))

        logger.info("Received from \(senderDevice): \(preview)...")

        DispatchQueue.main.async { [weak self] in
            guard let self else { return }

            self.lastReceivedText = content
            self.lastReceivedDevice = senderDevice
            self.lastReceivedPreview = preview
            self.updateStatus("From \(senderDevice): \(preview)...")

            if self.autoCopyIncoming {
                // Remember this text so we don't echo it back.
                self.lastSentText = content
                UIPasteboard.general.string = content
                self.logger.debug("Auto-copied incoming clipboard to pasteboard.")
            }
        }
    }

    /// Updates `statusText`. Since this is now a @MainActor class, we can just assign it.
    private func updateStatus(_ text: String) {
        statusText = text
    }
}

// MARK: - UserDefaults Convenience

private extension UserDefaults {
    /// Returns the boolean for `key`, falling back to `defaultValue`
    /// when no value has been stored yet (avoids the implicit `false`
    /// default of the standard `bool(forKey:)` method).
    func bool(forKey key: String, defaultValue: Bool) -> Bool {
        object(forKey: key) == nil ? defaultValue : bool(forKey: key)
    }
}
