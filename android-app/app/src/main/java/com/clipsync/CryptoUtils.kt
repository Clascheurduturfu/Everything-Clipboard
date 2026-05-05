package com.clipsync

import android.util.Base64
import org.json.JSONObject
import java.security.MessageDigest
import java.security.SecureRandom
import javax.crypto.Cipher
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.PBEKeySpec
import javax.crypto.spec.SecretKeySpec

object CryptoUtils {
    private const val STATIC_SALT = "clipsync_static_salt_for_key_derivation"
    private const val IV_LENGTH = 12
    private const val TAG_LENGTH_BIT = 128

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

    fun encryptPayload(deviceName: String, content: String, keyBytes: ByteArray): String {
        val key = SecretKeySpec(keyBytes, "AES")
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")

        val iv = ByteArray(IV_LENGTH)
        SecureRandom().nextBytes(iv)
        val spec = GCMParameterSpec(TAG_LENGTH_BIT, iv)

        cipher.init(Cipher.ENCRYPT_MODE, key, spec)

        val json = JSONObject()
        json.put("device_name", deviceName)
        json.put("content", content)
        val plaintext = json.toString().toByteArray(Charsets.UTF_8)

        val ciphertext = cipher.doFinal(plaintext)

        val payload = ByteArray(iv.size + ciphertext.size)
        System.arraycopy(iv, 0, payload, 0, iv.size)
        System.arraycopy(ciphertext, 0, payload, iv.size, ciphertext.size)

        return Base64.encodeToString(payload, Base64.NO_WRAP)
    }

    fun decryptPayload(payloadB64: String, keyBytes: ByteArray): Pair<String, String>? {
        return try {
            val payload = Base64.decode(payloadB64, Base64.NO_WRAP)
            val iv = payload.copyOfRange(0, IV_LENGTH)
            val ciphertext = payload.copyOfRange(IV_LENGTH, payload.size)

            val key = SecretKeySpec(keyBytes, "AES")
            val cipher = Cipher.getInstance("AES/GCM/NoPadding")
            val spec = GCMParameterSpec(TAG_LENGTH_BIT, iv)

            cipher.init(Cipher.DECRYPT_MODE, key, spec)
            val plaintext = cipher.doFinal(ciphertext)

            val json = JSONObject(String(plaintext, Charsets.UTF_8))
            Pair(json.getString("device_name"), json.getString("content"))
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }
}
