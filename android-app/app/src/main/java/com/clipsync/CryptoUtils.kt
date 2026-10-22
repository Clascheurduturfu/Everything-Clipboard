package com.clipsync

import android.util.Base64
import org.json.JSONObject
import java.security.MessageDigest
import java.security.SecureRandom
import java.util.UUID
import javax.crypto.Cipher
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.PBEKeySpec
import javax.crypto.spec.SecretKeySpec

/** A decrypted clip from the room. */
sealed class Clip {
    abstract val device: String

    data class Text(override val device: String, val content: String) : Clip()

    class Image(
        override val device: String,
        val bytes: ByteArray,
        val mime: String,
        val width: Int,
        val height: Int,
    ) : Clip()
}

object CryptoUtils {
    private const val STATIC_SALT = "clipsync_static_salt_for_key_derivation"
    private const val IV_LENGTH = 12
    private const val TAG_LENGTH_BIT = 128

    // Payload v2: text keeps {"device_name","content"} so v1 clients still read
    // it; images carry no "content", so v1 clients skip them.
    private const val PAYLOAD_VERSION = 2

    fun deriveKey(secret: String): ByteArray {
        val spec = PBEKeySpec(secret.toCharArray(), STATIC_SALT.toByteArray(Charsets.UTF_8), 200000, 256)
        val factory = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256")
        return factory.generateSecret(spec).encoded
    }

    fun getRoomId(secret: String): String {
        val digest = MessageDigest.getInstance("SHA-256")
        val hash = digest.digest(secret.toByteArray(Charsets.UTF_8))
        return hash.joinToString("") { "%02x".format(it) }
    }

    fun sha256Hex(bytes: ByteArray): String =
        MessageDigest.getInstance("SHA-256").digest(bytes).joinToString("") { "%02x".format(it) }

    fun encryptPayload(deviceName: String, content: String, keyBytes: ByteArray): String {
        val json = JSONObject()
        json.put("v", PAYLOAD_VERSION)
        json.put("id", UUID.randomUUID().toString().replace("-", ""))
        json.put("device_name", deviceName)
        json.put("content", content)
        return encryptJson(json, keyBytes)
    }

    fun encryptImagePayload(
        deviceName: String,
        bytes: ByteArray,
        mime: String,
        width: Int,
        height: Int,
        keyBytes: ByteArray,
    ): String {
        val json = JSONObject()
        json.put("v", PAYLOAD_VERSION)
        json.put("id", UUID.randomUUID().toString().replace("-", ""))
        json.put("device_name", deviceName)
        json.put("type", "image")
        json.put("mime", mime)
        json.put("data", Base64.encodeToString(bytes, Base64.NO_WRAP))
        json.put("sha256", sha256Hex(bytes))
        json.put("w", width)
        json.put("h", height)
        return encryptJson(json, keyBytes)
    }

    private fun encryptJson(json: JSONObject, keyBytes: ByteArray): String {
        val key = SecretKeySpec(keyBytes, "AES")
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")

        val iv = ByteArray(IV_LENGTH)
        SecureRandom().nextBytes(iv)
        cipher.init(Cipher.ENCRYPT_MODE, key, GCMParameterSpec(TAG_LENGTH_BIT, iv))

        val ciphertext = cipher.doFinal(json.toString().toByteArray(Charsets.UTF_8))

        val payload = ByteArray(iv.size + ciphertext.size)
        System.arraycopy(iv, 0, payload, 0, iv.size)
        System.arraycopy(ciphertext, 0, payload, iv.size, ciphertext.size)

        return Base64.encodeToString(payload, Base64.NO_WRAP)
    }

    fun decryptPayload(payloadB64: String, keyBytes: ByteArray): Clip? {
        return try {
            val payload = Base64.decode(payloadB64, Base64.NO_WRAP)
            val iv = payload.copyOfRange(0, IV_LENGTH)
            val ciphertext = payload.copyOfRange(IV_LENGTH, payload.size)

            val key = SecretKeySpec(keyBytes, "AES")
            val cipher = Cipher.getInstance("AES/GCM/NoPadding")
            cipher.init(Cipher.DECRYPT_MODE, key, GCMParameterSpec(TAG_LENGTH_BIT, iv))
            val plaintext = cipher.doFinal(ciphertext)

            val json = JSONObject(String(plaintext, Charsets.UTF_8))
            val device = json.optString("device_name", "Unknown")
            if (json.optString("type") == "image") {
                val bytes = Base64.decode(json.getString("data"), Base64.NO_WRAP)
                val expected = json.optString("sha256")
                if (expected.isNotEmpty() && expected != sha256Hex(bytes)) return null
                Clip.Image(device, bytes, json.optString("mime", "image/png"), json.optInt("w"), json.optInt("h"))
            } else {
                Clip.Text(device, json.getString("content"))
            }
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }
}
