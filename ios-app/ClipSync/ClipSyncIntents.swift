import AppIntents
import SwiftUI
import UniformTypeIdentifiers

@available(iOS 16.0, *)
struct SendClipboardIntent: AppIntent {
    static var title: LocalizedStringResource = "Send Clipboard to ClipSync"
    static var description = IntentDescription("Sends your current iOS clipboard to all connected ClipSync devices.")
    
    // No UI needed unless we want to show a result
    
    @MainActor
    func perform() async throws -> some IntentResult {
        guard let text = UIPasteboard.general.string, !text.isEmpty else {
            return .result() // empty clipboard
        }
        
        let defaults = UserDefaults(suiteName: "group.com.clipsync.ios") ?? .standard
        let serverUrl = defaults.string(forKey: "clipsync_server_url") ?? ""
        let secretKey = defaults.string(forKey: "clipsync_secret_key") ?? ""
        let deviceName = defaults.string(forKey: "clipsync_device_name") ?? "iOS Shortcuts"
        
        guard !serverUrl.isEmpty, !secretKey.isEmpty else {
            return .result() // not configured
        }
        
        let (key, roomId) = await Task.detached(priority: .userInitiated) {
            let k = CryptoUtils.deriveKey(secret: secretKey)
            let r = CryptoUtils.getRoomId(secret: secretKey)
            return (k, r)
        }.value
        
        guard let payload = CryptoUtils.encryptPayload(deviceName: deviceName, content: text, key: key) else {
            return .result()
        }
        
        // Connect, send, and disconnect
        await withCheckedContinuation { continuation in
            var client: WebSocketClient?
            client = WebSocketClient(
                url: serverUrl,
                roomId: roomId,
                onMessage: { _ in },
                onConnected: {
                    client?.send(payload)
                    // Disconnect after short delay to ensure transmission
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                        client?.disconnect()
                        continuation.resume()
                    }
                },
                onDisconnected: { _ in
                    // If we disconnected before finishing, just resume to not hang Siri
                    continuation.resume()
                }
            )
            client?.connect()
            
            // Timeout failsafe
            DispatchQueue.main.asyncAfter(deadline: .now() + 3.0) {
                client?.disconnect()
            }
        }
        return .result()
    }
}

@available(iOS 16.0, *)
struct ReceiveClipboardIntent: AppIntent {
    static var title: LocalizedStringResource = "Receive Clipboard from ClipSync"
    static var description = IntentDescription("Connects to ClipSync, fetches the latest clipboard, and copies it to your iOS device.")
    
    @MainActor
    func perform() async throws -> some IntentResult {
        let defaults = UserDefaults(suiteName: "group.com.clipsync.ios") ?? .standard
        let serverUrl = defaults.string(forKey: "clipsync_server_url") ?? ""
        let secretKey = defaults.string(forKey: "clipsync_secret_key") ?? ""
        
        guard !serverUrl.isEmpty, !secretKey.isEmpty else {
            return .result()
        }
        
        let (key, roomId) = await Task.detached(priority: .userInitiated) {
            let k = CryptoUtils.deriveKey(secret: secretKey)
            let r = CryptoUtils.getRoomId(secret: secretKey)
            return (k, r)
        }.value
        
        await withCheckedContinuation { continuation in
            var client: WebSocketClient?
            var finished = false
            
            client = WebSocketClient(
                url: serverUrl,
                roomId: roomId,
                onMessage: { encrypted in
                    guard !finished else { return }
                    if let result = CryptoUtils.decryptPayload(base64Payload: encrypted, key: key) {
                        UIPasteboard.general.string = result.content
                    }
                    finished = true
                    client?.disconnect()
                    continuation.resume()
                },
                onConnected: {
                    // We just wait for a message now
                },
                onDisconnected: { _ in
                    if !finished {
                        finished = true
                        continuation.resume()
                    }
                }
            )
            client?.connect()
            
            // Timeout failsafe
            DispatchQueue.main.asyncAfter(deadline: .now() + 3.0) {
                if !finished {
                    finished = true
                    client?.disconnect()
                    continuation.resume()
                }
            }
        }
        return .result()
    }
}
