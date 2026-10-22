import Foundation
import CryptoKit
import CommonCrypto

/// Cryptographic utilities for ClipSync — wire-compatible with the Android and Python implementations.
///
/// Protocol details:
///   • Key derivation: PBKDF2-HMAC-SHA256, 200 000 iterations, 32-byte key
///   • Static salt:    "clipsync_static_salt_for_key_derivation" (UTF-8)
///   • Room ID:        SHA-256 hex digest of the secret (UTF-8)
///   • Encryption:     AES-256-GCM with random 12-byte IV
///   • Payload format: Base64( IV ‖ ciphertext ‖ auth_tag )
///   • Plaintext:      JSON  {"device_name": "…", "content": "…"}
struct CryptoUtils {

    // MARK: - Constants

    private static let staticSalt = "clipsync_static_salt_for_key_derivation"
    private static let pbkdf2Iterations: UInt32 = 200_000
    private static let keyLengthBytes = 32 // 256 bits

    // MARK: - Key Derivation

    /// Derives a 256-bit symmetric key from the user's secret using PBKDF2-HMAC-SHA256.
    static func deriveKey(secret: String) -> SymmetricKey {
        let passwordData = Array(secret.utf8)
        let saltData = Array(staticSalt.utf8)

        var derivedKeyBytes = [UInt8](repeating: 0, count: keyLengthBytes)

        let status = CCKeyDerivationPBKDF(
            CCPBKDFAlgorithm(kCCPBKDF2),
            passwordData,
            passwordData.count,
            saltData,
            saltData.count,
            CCPseudoRandomAlgorithm(kCCPRFHmacAlgSHA256),
            pbkdf2Iterations,
            &derivedKeyBytes,
            keyLengthBytes
        )

        // CCKeyDerivationPBKDF returns kCCSuccess (0) on success.
        // A failure here is a programming error (bad parameters), so we trap.
        precondition(status == kCCSuccess, "PBKDF2 key derivation failed with status \(status)")

        return SymmetricKey(data: derivedKeyBytes)
    }

    // MARK: - Room ID

    /// Returns the room ID as the lowercase hex SHA-256 digest of the secret (UTF-8 encoded).
    static func getRoomId(secret: String) -> String {
        let data = Data(secret.utf8)
        let digest = SHA256.hash(data: data)
        return digest.map { String(format: "%02x", $0) }.joined()
    }

    // MARK: - Encrypt

    /// Encrypts `content` together with `deviceName` into a Base64 payload.
    ///
    /// The plaintext is a JSON object: `{"device_name": "…", "content": "…"}`.
    /// Output is `Base64( nonce ‖ ciphertext ‖ tag )` — CryptoKit's `sealedBox.combined`
    /// already produces that layout.
    ///
    /// Returns `nil` if encryption or JSON serialization fails.
    static func encryptPayload(deviceName: String, content: String, key: SymmetricKey) -> String? {
        // v2 keeps {"device_name","content"} so v1 clients still read text.
        return encryptJSON([
            "v": 2,
            "id": UUID().uuidString.replacingOccurrences(of: "-", with: "").lowercased(),
            "device_name": deviceName,
            "content": content
        ], key: key)
    }

    /// Encrypts an image clip. There is no "content", so v1 clients skip it.
    static func encryptImagePayload(deviceName: String, data: Data, mime: String,
                                    width: Int, height: Int, key: SymmetricKey) -> String? {
        return encryptJSON([
            "v": 2,
            "id": UUID().uuidString.replacingOccurrences(of: "-", with: "").lowercased(),
            "device_name": deviceName,
            "type": "image",
            "mime": mime,
            "data": data.base64EncodedString(),
            "sha256": sha256Hex(data),
            "w": width,
            "h": height
        ], key: key)
    }

    static func sha256Hex(_ data: Data) -> String {
        SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
    }

    private static func encryptJSON(_ json: [String: Any], key: SymmetricKey) -> String? {
        do {
            let jsonData = try JSONSerialization.data(withJSONObject: json, options: [])

            // Encrypt with AES-256-GCM (random 12-byte nonce by default)
            let sealedBox = try AES.GCM.seal(jsonData, using: key)

            // .combined = nonce (12) + ciphertext + tag (16) — matches Android layout
            guard let combined = sealedBox.combined else { return nil }

            return combined.base64EncodedString()
        } catch {
            print("[CryptoUtils] encryptPayload error: \(error)")
            return nil
        }
    }

    // MARK: - Decrypt

    /// A decrypted clip: text, or an image with its encoded bytes.
    enum Clip {
        case text(deviceName: String, content: String)
        case image(deviceName: String, data: Data, mime: String, width: Int, height: Int)
    }

    /// Decrypts any v1/v2 payload. Returns nil on failure or a damaged image.
    static func decryptClip(base64Payload: String, key: SymmetricKey) -> Clip? {
        guard let payloadData = Data(base64Encoded: base64Payload),
              let sealedBox = try? AES.GCM.SealedBox(combined: payloadData),
              let plaintext = try? AES.GCM.open(sealedBox, using: key),
              let json = (try? JSONSerialization.jsonObject(with: plaintext, options: [])) as? [String: Any]
        else { return nil }

        let deviceName = json["device_name"] as? String ?? "Unknown"
        if json["type"] as? String == "image" {
            guard let encoded = json["data"] as? String,
                  let data = Data(base64Encoded: encoded) else { return nil }
            if let expected = json["sha256"] as? String, expected != sha256Hex(data) { return nil }
            return .image(deviceName: deviceName, data: data,
                          mime: json["mime"] as? String ?? "image/png",
                          width: json["w"] as? Int ?? 0, height: json["h"] as? Int ?? 0)
        }
        guard let content = json["content"] as? String else { return nil }
        return .text(deviceName: deviceName, content: content)
    }

    /// Decrypts a Base64 payload produced by any ClipSync client.
    ///
    /// Expected input: `Base64( 12-byte nonce ‖ ciphertext ‖ 16-byte tag )`.
    /// Returns `(deviceName, content)` on success, or `nil` on any failure.
    static func decryptPayload(base64Payload: String, key: SymmetricKey) -> (deviceName: String, content: String)? {
        do {
            guard let payloadData = Data(base64Encoded: base64Payload) else {
                print("[CryptoUtils] decryptPayload: invalid Base64")
                return nil
            }

            // Reconstruct the sealed box from the combined representation (nonce + ciphertext + tag)
            let sealedBox = try AES.GCM.SealedBox(combined: payloadData)

            let plaintext = try AES.GCM.open(sealedBox, using: key)

            // Parse the JSON plaintext
            guard let json = try JSONSerialization.jsonObject(with: plaintext, options: []) as? [String: Any],
                  let deviceName = json["device_name"] as? String,
                  let content = json["content"] as? String else {
                print("[CryptoUtils] decryptPayload: JSON parsing failed")
                return nil
            }

            return (deviceName: deviceName, content: content)
        } catch {
            print("[CryptoUtils] decryptPayload error: \(error)")
            return nil
        }
    }
}
