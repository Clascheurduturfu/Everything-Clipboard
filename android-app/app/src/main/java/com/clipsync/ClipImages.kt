package com.clipsync

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Matrix
import android.media.ExifInterface
import android.net.ConnectivityManager
import android.net.Uri
import androidx.core.content.FileProvider
import java.io.ByteArrayOutputStream
import java.io.File

/** Clipboard image helpers. Bytes are streamed, never decoded to full bitmaps (except in [shrink]). */
object ClipImages {
    /**
     * Cap on the encoded image bytes. Wire size (see CryptoUtils.encryptImagePayload): the image is
     * base64'd into the JSON (x4/3), the JSON is AES-GCM encrypted (+28 bytes), and the result is
     * base64'd again (x4/3), so about 16/9 = 1.78x. 8 MiB becomes about 14.9 MB (14.2 MiB), under
     * the relay's 16 MiB WebSocket message limit and OkHttp's 16 MiB outgoing queue limit
     * (RealWebSocket.MAX_QUEUE_SIZE, which also counts messages not yet written to the socket).
     */
    const val MAX_IMAGE_BYTES = 8 * 1024 * 1024
    private const val THUMBNAIL_PX = 320
    private const val MAX_DECODE_PIXELS = 24_000_000L

    fun authority(context: Context) = "${context.packageName}.clips"

    /** The clip's image URI and MIME type, or null when it is not an image. */
    fun imageOf(context: Context, clip: ClipData?): Pair<Uri, String>? {
        if (clip == null || clip.itemCount == 0) return null
        val uri = clip.getItemAt(0).uri ?: return null
        val mime = context.contentResolver.getType(uri)
            ?: (0 until clip.description.mimeTypeCount)
                .map { clip.description.getMimeType(it) }
                .firstOrNull { it.startsWith("image/") }
            ?: return null
        return if (mime.startsWith("image/")) uri to mime else null
    }

    /** True for the file ClipSync itself put on the clipboard. */
    fun isOwn(context: Context, uri: Uri) = uri.authority == authority(context)

    /** Reads at most [MAX_IMAGE_BYTES] + 1 bytes; a longer result means "too large". */
    fun read(context: Context, uri: Uri): ByteArray? = try {
        context.contentResolver.openInputStream(uri)?.use { input ->
            val out = ByteArrayOutputStream()
            val buffer = ByteArray(64 * 1024)
            while (out.size() <= MAX_IMAGE_BYTES) {
                val n = input.read(buffer)
                if (n < 0) break
                out.write(buffer, 0, n)
            }
            out.toByteArray()
        }
    } catch (e: Exception) {
        null
    }

    fun dimensions(bytes: ByteArray): Pair<Int, Int> {
        val options = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeByteArray(bytes, 0, bytes.size, options)
        return options.outWidth to options.outHeight
    }

    /** Small preview for the app screen, decoded at reduced size. */
    fun thumbnail(bytes: ByteArray): Bitmap? {
        val (width, height) = dimensions(bytes)
        if (width <= 0 || height <= 0) return null
        var sample = 1
        while (width / (sample * 2) >= THUMBNAIL_PX || height / (sample * 2) >= THUMBNAIL_PX) sample *= 2
        return BitmapFactory.decodeByteArray(bytes, 0, bytes.size, BitmapFactory.Options().apply { inSampleSize = sample })
    }

    /** Stores the incoming image in one reusable cache file and returns its content URI. */
    fun store(context: Context, bytes: ByteArray, mime: String): Uri {
        val dir = File(context.cacheDir, "clips").apply { mkdirs() }
        dir.listFiles()?.forEach { it.delete() }
        val extension = when (mime) {
            "image/jpeg" -> "jpg"
            "image/webp" -> "webp"
            "image/gif" -> "gif"
            else -> "png"
        }
        val file = File(dir, "latest.$extension")
        file.writeBytes(bytes)
        return FileProvider.getUriForFile(context, authority(context), file)
    }

    fun clipFor(context: Context, uri: Uri): ClipData =
        ClipData.newUri(context.contentResolver, "ClipSync image", uri)

    fun setClipboard(context: Context, uri: Uri) {
        (context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager)
            .setPrimaryClip(clipFor(context, uri))
    }

    /** An oversize image re-encoded to fit [MAX_IMAGE_BYTES]. */
    class Resized(val bytes: ByteArray, val mime: String)

    /**
     * Re-encodes an image larger than [MAX_IMAGE_BYTES] (e.g. a Samsung motion photo, a JPEG with a
     * video appended). Tries the original size as JPEG q90, then a 2560/1920/1280 px long edge at
     * q90/80/70, and returns the first result that fits, or null when none does. Must run off the
     * main thread. Images that already fit must NOT go through here: they are sent untouched.
     * Sources with transparency stay PNG when that fits, otherwise they are flattened onto white.
     */
    fun shrink(context: Context, uri: Uri, sourceMime: String): Resized? = try {
        fun open() = context.contentResolver.openInputStream(uri)
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        open()?.use { BitmapFactory.decodeStream(it, null, bounds) }
        val width = bounds.outWidth
        val height = bounds.outHeight
        var result: Resized? = null
        if (width > 0 && height > 0) {
            val orientation = if (sourceMime == "image/jpeg" || bounds.outMimeType == "image/jpeg") {
                try {
                    open()?.use { ExifInterface(it).getAttributeInt(ExifInterface.TAG_ORIENTATION, 1) } ?: 1
                } catch (e: Exception) { 1 }
            } else 1
            var flatten = false
            for ((edge, quality) in listOf(Int.MAX_VALUE to 90, 2560 to 90, 1920 to 80, 1280 to 70)) {
                // Power-of-two subsampling in the decoder keeps big sources from ever being fully decoded.
                var sample = 1
                while (maxOf(width, height) / (sample * 2) >= edge) sample *= 2
                // Even "original size" is capped at ~24 MP (96 MB of pixels) to stay memory-safe.
                while ((width / sample).toLong() * (height / sample) > MAX_DECODE_PIXELS) sample *= 2
                var bitmap = open()?.use {
                    BitmapFactory.decodeStream(it, null, BitmapFactory.Options().apply { inSampleSize = sample })
                } ?: break
                if (maxOf(bitmap.width, bitmap.height) > edge) {
                    val scale = edge.toFloat() / maxOf(bitmap.width, bitmap.height)
                    val scaled = Bitmap.createScaledBitmap(
                        bitmap, maxOf(1, (bitmap.width * scale).toInt()), maxOf(1, (bitmap.height * scale).toInt()), true
                    )
                    if (scaled !== bitmap) bitmap.recycle()
                    bitmap = scaled
                }
                val matrix = orientationMatrix(orientation)
                if (matrix != null) {
                    val rotated = Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
                    if (rotated !== bitmap) bitmap.recycle()
                    bitmap = rotated
                }
                if (bitmap.hasAlpha() && !flatten) {
                    val png = encode(bitmap, Bitmap.CompressFormat.PNG, 100)
                    if (png.size <= MAX_IMAGE_BYTES) result = Resized(png, "image/png")
                    flatten = true
                }
                if (result == null) {
                    if (flatten) {
                        val flat = Bitmap.createBitmap(bitmap.width, bitmap.height, Bitmap.Config.ARGB_8888)
                        Canvas(flat).apply { drawColor(Color.WHITE); drawBitmap(bitmap, 0f, 0f, null) }
                        bitmap.recycle()
                        bitmap = flat
                    }
                    val jpeg = encode(bitmap, Bitmap.CompressFormat.JPEG, quality)
                    if (jpeg.size <= MAX_IMAGE_BYTES) result = Resized(jpeg, "image/jpeg")
                }
                bitmap.recycle()
                if (result != null) break
            }
        }
        result
    } catch (e: Exception) {
        null
    } catch (e: OutOfMemoryError) {
        null
    }

    private fun encode(bitmap: Bitmap, format: Bitmap.CompressFormat, quality: Int): ByteArray =
        ByteArrayOutputStream().also { bitmap.compress(format, quality, it) }.toByteArray()

    /** Matrix that turns an EXIF-oriented JPEG upright, or null when it already is. */
    private fun orientationMatrix(orientation: Int): Matrix? = Matrix().let { m ->
        when (orientation) {
            2 -> m.postScale(-1f, 1f)
            3 -> m.postRotate(180f)
            4 -> m.postScale(1f, -1f)
            5 -> { m.postRotate(90f); m.postScale(-1f, 1f) }
            6 -> m.postRotate(90f)
            7 -> { m.postRotate(-90f); m.postScale(-1f, 1f) }
            8 -> m.postRotate(270f)
            else -> return null
        }
        m
    }

    fun isMetered(context: Context): Boolean =
        (context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager).isActiveNetworkMetered
}
