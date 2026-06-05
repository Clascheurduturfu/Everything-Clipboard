import Foundation
import os

/// Native WebSocket client for ClipSync, matching the Android `WsClient.kt` behavior.
///
/// Features:
///   • Connects to `{baseUrl}/ws/{roomId}`
///   • Auto-reconnect after 3 seconds on failure or unexpected close
///   • Ping every 20 seconds to keep the connection alive
///   • Thread-safe via `@MainActor`
@MainActor
final class WebSocketClient {

    // MARK: - Configuration

    private static let reconnectDelaySeconds: TimeInterval = 3
    private static let pingIntervalSeconds: TimeInterval = 20
    private static let logger = Logger(subsystem: "com.clipsync", category: "WebSocketClient")

    // MARK: - Callbacks

    private let baseUrl: String
    private let roomId: String
    private let onMessage: (String) -> Void
    private let onConnected: () -> Void
    private let onDisconnected: (String) -> Void

    // MARK: - State

    private var webSocketTask: URLSessionWebSocketTask?
    private var session: URLSession?
    private var isConnected = false
    private var shouldReconnect = true
    private var reconnectTask: Task<Void, Never>?
    private var pingTimer: Timer?

    // MARK: - Init

    /// Creates a new WebSocket client.
    ///
    /// - Parameters:
    ///   - url: The base server URL (e.g. `https://example.com` or `wss://example.com/`).
    ///   - roomId: The room identifier (SHA-256 hex of the secret).
    ///   - onMessage: Called on the main actor when a text message is received.
    ///   - onConnected: Called on the main actor when the connection opens.
    ///   - onDisconnected: Called on the main actor with a reason string when the connection drops.
    init(
        url: String,
        roomId: String,
        onMessage: @escaping (String) -> Void,
        onConnected: @escaping () -> Void,
        onDisconnected: @escaping (String) -> Void
    ) {
        self.baseUrl = url
        self.roomId = roomId
        self.onMessage = onMessage
        self.onConnected = onConnected
        self.onDisconnected = onDisconnected
    }

    // MARK: - Public API

    /// Opens the WebSocket connection. Safe to call multiple times — previous connections are torn down first.
    func connect() {
        shouldReconnect = true
        reconnectTask?.cancel()
        reconnectTask = nil

        // Build the full URL: {baseUrl}/ws/{roomId}
        let trimmed = baseUrl.hasSuffix("/") ? String(baseUrl.dropLast()) : baseUrl
        let fullUrlString = "\(trimmed)/ws/\(roomId)"

        guard let fullUrl = URL(string: fullUrlString) else {
            Self.logger.error("Invalid WebSocket URL: \(fullUrlString)")
            return
        }

        Self.logger.info("Connecting to \(fullUrlString)")

        // Create a fresh URLSession (no delegate needed for basic usage)
        let config = URLSessionConfiguration.default
        // URLSession manages its own timeout; we handle ping ourselves.
        config.timeoutIntervalForRequest = 60
        let newSession = URLSession(configuration: config)
        session = newSession

        let task = newSession.webSocketTask(with: fullUrl)
        webSocketTask = task

        task.resume()

        // Treat the first successful receive as "connected"
        // (URLSessionWebSocketTask doesn't have an onOpen callback)
        handleOpen()
        startReceiveLoop()
        startPingTimer()
    }

    /// Sends a text message over the WebSocket.
    ///
    /// - Returns: `true` if the message was queued for sending, `false` if not connected.
    @discardableResult
    func send(_ message: String) -> Bool {
        guard isConnected, let task = webSocketTask else {
            Self.logger.warning("Send skipped: not connected (\(message.count) chars)")
            return false
        }

        task.send(.string(message)) { [weak self] error in
            if let error {
                Self.logger.error("Send failed: \(error.localizedDescription)")
                // Treat a send failure as a disconnect trigger
                Task { @MainActor [weak self] in
                    self?.handleDisconnect(reason: "Send error: \(error.localizedDescription)")
                }
            } else {
                Self.logger.debug("Sent \(message.count) chars")
            }
        }
        return true
    }

    /// Gracefully closes the connection and stops auto-reconnect.
    func disconnect() {
        Self.logger.info("Disconnecting (user-initiated)")
        shouldReconnect = false
        reconnectTask?.cancel()
        reconnectTask = nil
        stopPingTimer()

        isConnected = false
        webSocketTask?.cancel(with: .normalClosure, reason: "User disconnected".data(using: .utf8))
        webSocketTask = nil
        session?.invalidateAndCancel()
        session = nil
    }

    // MARK: - Connection Lifecycle (private)

    private func handleOpen() {
        isConnected = true
        Self.logger.info("Connected")
        onConnected()
    }

    private func handleDisconnect(reason: String) {
        guard isConnected else { return } // avoid duplicate callbacks
        isConnected = false
        stopPingTimer()
        webSocketTask = nil

        Self.logger.info("Disconnected: \(reason)")
        onDisconnected(reason)
        scheduleReconnect(reason: reason)
    }

    // MARK: - Receive Loop

    /// Continuously listens for incoming messages. Exits when the task is cancelled or errors.
    private func startReceiveLoop() {
        guard let task = webSocketTask else { return }

        task.receive { [weak self] result in
            Task { @MainActor [weak self] in
                guard let self else { return }

                switch result {
                case .success(let message):
                    switch message {
                    case .string(let text):
                        Self.logger.debug("Received message (\(text.count) chars)")
                        self.onMessage(text)
                    case .data(let data):
                        // Attempt to interpret binary frames as UTF-8 text
                        if let text = String(data: data, encoding: .utf8) {
                            Self.logger.debug("Received binary message as text (\(text.count) chars)")
                            self.onMessage(text)
                        } else {
                            Self.logger.warning("Received non-text binary data (\(data.count) bytes), ignoring")
                        }
                    @unknown default:
                        Self.logger.warning("Received unknown message type")
                    }
                    // Continue listening
                    self.startReceiveLoop()

                case .failure(let error):
                    let reason = "Receive error: \(error.localizedDescription)"
                    Self.logger.warning("\(reason)")
                    self.handleDisconnect(reason: reason)
                }
            }
        }
    }

    // MARK: - Ping

    private func startPingTimer() {
        stopPingTimer()
        pingTimer = Timer.scheduledTimer(withTimeInterval: Self.pingIntervalSeconds, repeats: true) { [weak self] _ in
            Task { @MainActor [weak self] in
                self?.sendPing()
            }
        }
    }

    private func stopPingTimer() {
        pingTimer?.invalidate()
        pingTimer = nil
    }

    private func sendPing() {
        guard let task = webSocketTask else { return }
        task.sendPing { [weak self] error in
            if let error {
                Self.logger.warning("Ping failed: \(error.localizedDescription)")
                Task { @MainActor [weak self] in
                    self?.handleDisconnect(reason: "Ping failed: \(error.localizedDescription)")
                }
            }
        }
    }

    // MARK: - Auto-Reconnect

    private func scheduleReconnect(reason: String) {
        guard shouldReconnect else {
            Self.logger.info("Reconnect skipped (shouldReconnect=false) after: \(reason)")
            return
        }

        // Avoid stacking reconnect attempts
        guard reconnectTask == nil else {
            Self.logger.debug("Reconnect already scheduled")
            return
        }

        Self.logger.info("Reconnecting in \(Self.reconnectDelaySeconds)s after: \(reason)")

        reconnectTask = Task { [weak self] in
            try? await Task.sleep(nanoseconds: UInt64(Self.reconnectDelaySeconds * 1_000_000_000))

            guard !Task.isCancelled else { return }

            await MainActor.run {
                guard let self, self.shouldReconnect else { return }
                self.reconnectTask = nil
                self.connect()
            }
        }
    }
}
