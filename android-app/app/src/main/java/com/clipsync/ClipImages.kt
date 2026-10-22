package com.clipsync

import android.content.ClipData
import android.content.ClipDescription
import android.content.ClipboardManager
import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.ConnectivityManager
import android.net.Uri
import android.os.PersistableBundle
import androidx.core.content.FileProvider
import java.io.ByteArrayOutputStream
import java.io.File

/** Clipboard image helpers. Bytes are streamed, never decoded to full bitmaps. */
object ClipImages {
    const val MAX_IMAGE_BYTES = 5 * 1024 * 1024
    private const val THUMBNAIL_PX = 320

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

    fun clipFor(context: Context, uri: Uri, sensitive: Boolean): ClipData =
        ClipData.newUri(context.contentResolver, "ClipSync image", uri).apply {
            if (sensitive) {
                description.extras = PersistableBundle().apply {
                    putBoolean(ClipDescription.EXTRA_IS_SENSITIVE, true)
                }
            }
        }

    fun setClipboard(context: Context, uri: Uri, sensitive: Boolean) {
        (context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager)
            .setPrimaryClip(clipFor(context, uri, sensitive))
    }

    fun isMetered(context: Context): Boolean =
        (context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager).isActiveNetworkMetered
}
