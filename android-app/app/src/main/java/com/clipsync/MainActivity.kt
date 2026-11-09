package com.clipsync

import android.Manifest
import android.animation.ValueAnimator
import android.app.Activity
import android.app.AlertDialog
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.res.ColorStateList
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.ImageView
import android.widget.Switch
import android.widget.TextView
import android.widget.Toast
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat

class MainActivity : Activity() {

    companion object {
        private const val REQUEST_POST_NOTIFICATIONS = 1001
    }

    private var startServiceAfterNotificationPrompt = false
    private var pendingServiceAction: String? = null
    private lateinit var tvStatusTitle: TextView
    private lateinit var tvStatus: TextView
    private lateinit var statusDot: View
    private lateinit var statusHalo: View
    private lateinit var lastReceivedGroup: View
    private lateinit var tvLastReceivedFrom: TextView
    private lateinit var tvLastReceived: TextView
    private lateinit var ivLastImage: ImageView
    private lateinit var switchService: Switch
    private lateinit var switchSendNotificationAction: Switch
    private lateinit var editDeviceName: EditText
    private lateinit var editServerUrl: EditText
    private lateinit var editSecretKey: EditText
    private lateinit var switchCustomServer: Switch
    private var pulse: ValueAnimator? = null
    private var consentDialog: AlertDialog? = null
    private var returningFromPrivacy = false
    private var refreshingPrivacyControls = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        // API 36 enforces edge-to-edge; keep controls clear of bars, cutouts and IME.
        val content = findViewById<android.view.ViewGroup>(android.R.id.content).getChildAt(0)
        ViewCompat.setOnApplyWindowInsetsListener(content) { view, insets ->
            val safe = insets.getInsets(
                WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout() or
                    WindowInsetsCompat.Type.ime()
            )
            view.setPadding(safe.left, safe.top, safe.right, safe.bottom)
            insets
        }
        ViewCompat.requestApplyInsets(content)

        editDeviceName = findViewById(R.id.editDeviceName)
        editServerUrl = findViewById(R.id.editServerUrl)
        editSecretKey = findViewById(R.id.editSecretKey)
        switchService = findViewById(R.id.switchService)
        switchSendNotificationAction = findViewById(R.id.switchSendNotificationAction)
        tvStatusTitle = findViewById(R.id.tvStatusTitle)
        tvStatus = findViewById(R.id.tvStatus)
        statusDot = findViewById(R.id.statusDot)
        statusHalo = findViewById(R.id.statusHalo)
        lastReceivedGroup = findViewById(R.id.lastReceivedGroup)
        tvLastReceivedFrom = findViewById(R.id.tvLastReceivedFrom)
        tvLastReceived = findViewById(R.id.tvLastReceived)
        ivLastImage = findViewById(R.id.ivLastImage)
        findViewById<TextView>(R.id.tvVersion).text = "ClipSync ${BuildConfig.VERSION_NAME} · Android"

        // Load saved prefs
        val prefs = getSharedPreferences("clipsync_prefs", Context.MODE_PRIVATE)
        editDeviceName.setText(prefs.getString("device_name", "Android Phone"))
        val savedUrl = prefs.getString("server_url", RelayAddress.DEFAULT) ?: RelayAddress.DEFAULT
        val normalizedUrl = runCatching { RelayAddress.normalize(savedUrl) }.getOrDefault(savedUrl)
        if (normalizedUrl != savedUrl) {
            prefs.edit().putString("server_url", normalizedUrl).apply()
            Toast.makeText(this, "Relay address corrected to serv.everything-clipboard.com", Toast.LENGTH_LONG).show()
        }
        editServerUrl.setText(normalizedUrl)
        editSecretKey.setText(prefs.getString("secret_key", ""))
        switchCustomServer = findViewById(R.id.switchCustomServer)
        switchCustomServer.isChecked = prefs.getBoolean(RelayAddress.PREF_CUSTOM_SERVER, false)
        updateServerVisibility()
        switchCustomServer.setOnCheckedChangeListener { _, checked ->
            prefs.edit().putBoolean(RelayAddress.PREF_CUSTOM_SERVER, checked).apply()
            updateServerVisibility()
            if (PrivacyConsent.isGranted(this) && !prefs.getString("secret_key", "").isNullOrBlank()) {
                startClipSyncServiceWithPermissionPrompt(ClipSyncService.ACTION_APP_OPENED)
            }
        }
        val reveal = findViewById<android.widget.ImageButton>(R.id.btnRevealKey)
        reveal.setOnClickListener {
            val showing = editSecretKey.transformationMethod is android.text.method.PasswordTransformationMethod
            editSecretKey.transformationMethod = if (showing) null else android.text.method.PasswordTransformationMethod.getInstance()
            editSecretKey.setSelection(editSecretKey.text.length)
            reveal.setImageResource(if (showing) R.drawable.ic_visibility_off else R.drawable.ic_visibility)
            reveal.contentDescription = getString(if (showing) R.string.hide_key else R.string.show_key)
        }
        findViewById<Button>(R.id.btnGenerateKey).setOnClickListener {
            val generate = {
                val bytes = ByteArray(48).also { java.security.SecureRandom().nextBytes(it) }
                editSecretKey.setText(android.util.Base64.encodeToString(bytes,
                    android.util.Base64.URL_SAFE or android.util.Base64.NO_WRAP or android.util.Base64.NO_PADDING))
                Toast.makeText(this, "New key ready. Share it with your devices, then Save & Connect.", Toast.LENGTH_LONG).show()
            }
            if (editSecretKey.text.isEmpty()) generate() else {
                AlertDialog.Builder(this).setTitle("Generate a new key?")
                    .setMessage("This replaces the key in this form. Your other devices will need the new key after you save.")
                    .setPositiveButton("Generate") { _, _ -> generate() }.setNegativeButton("Cancel", null).show()
            }
        }
        findViewById<Button>(R.id.btnShareKey).setOnClickListener {
            val key = editSecretKey.text.toString().trim()
            if (key.isEmpty()) Toast.makeText(this, "Enter or generate a key first", Toast.LENGTH_SHORT).show()
            else startActivity(Intent.createChooser(Intent(Intent.ACTION_SEND).apply {
                type = "text/plain"
                putExtra(Intent.EXTRA_TEXT, key)
            }, "Share secret key with a trusted device"))
        }
        switchSendNotificationAction.isChecked =
            prefs.getBoolean(ClipSyncService.PREF_SHOW_SEND_NOTIFICATION_ACTION, false)

        val switchSyncImages = findViewById<Switch>(R.id.switchSyncImages)
        val switchImagesWifiOnly = findViewById<Switch>(R.id.switchImagesWifiOnly)
        switchSyncImages.isChecked = prefs.getBoolean(ClipSyncService.PREF_SYNC_IMAGES, true)
        switchImagesWifiOnly.isChecked = prefs.getBoolean(ClipSyncService.PREF_IMAGES_WIFI_ONLY, true)
        switchImagesWifiOnly.isEnabled = switchSyncImages.isChecked
        switchSyncImages.setOnCheckedChangeListener { _, isChecked ->
            prefs.edit().putBoolean(ClipSyncService.PREF_SYNC_IMAGES, isChecked).apply()
            switchImagesWifiOnly.isEnabled = isChecked
        }
        switchImagesWifiOnly.setOnCheckedChangeListener { _, isChecked ->
            prefs.edit().putBoolean(ClipSyncService.PREF_IMAGES_WIFI_ONLY, isChecked).apply()
        }

        // This toggle means "keep ClipSync alive after the app closes".
        switchService.isChecked = prefs.getBoolean(ClipSyncService.PREF_RUN_IN_BACKGROUND, false)

        findViewById<Button>(R.id.btnSave).setOnClickListener {
            val url = try {
                RelayAddress.normalize(if (switchCustomServer.isChecked) editServerUrl.text.toString() else RelayAddress.DEFAULT)
            } catch (_: Exception) {
                editServerUrl.error = "Use a valid ws:// or wss:// server address."
                return@setOnClickListener
            }
            val key = editSecretKey.text.toString().trim()
            val name = editDeviceName.text.toString().trim()

            if (url.isEmpty() || key.isEmpty()) {
                Toast.makeText(this, "Server URL and Secret Key are required!", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            prefs.edit()
                .putString("device_name", name)
                .putString("server_url", if (switchCustomServer.isChecked) url else editServerUrl.text.toString().trim())
                .putString("secret_key", key)
                .apply()

            if (switchCustomServer.isChecked) editServerUrl.setText(url)

            Toast.makeText(this, "Settings saved", Toast.LENGTH_SHORT).show()
            startClipSyncServiceWithPermissionPrompt(ClipSyncService.ACTION_APP_OPENED)
        }

        findViewById<Button>(R.id.btnSendClipboard).setOnClickListener { sendClipboardNow() }
        findViewById<Button>(R.id.btnCopyLast).setOnClickListener { copyLastReceived() }
        findViewById<Button>(R.id.btnPrivacy).setOnClickListener {
            returningFromPrivacy = true
            startActivity(Intent(this, PrivacyActivity::class.java))
        }

        switchSendNotificationAction.setOnCheckedChangeListener { _, isChecked ->
            if (refreshingPrivacyControls) return@setOnCheckedChangeListener
            prefs.edit()
                .putBoolean(ClipSyncService.PREF_SHOW_SEND_NOTIFICATION_ACTION, isChecked)
                .apply()

            if (hasUsableSettings()) {
                startClipSyncServiceWithPermissionPrompt(ClipSyncService.ACTION_REFRESH_NOTIFICATION)
            }
        }

        switchService.setOnCheckedChangeListener { _, isChecked ->
            if (refreshingPrivacyControls) return@setOnCheckedChangeListener
            prefs.edit().putBoolean(ClipSyncService.PREF_RUN_IN_BACKGROUND, isChecked).apply()
            if (isChecked) {
                if (!hasUsableSettings()) {
                    Toast.makeText(this, "Set Server URL and Secret Key first!", Toast.LENGTH_SHORT).show()
                    switchService.isChecked = false
                    return@setOnCheckedChangeListener
                }
                startClipSyncServiceWithPermissionPrompt(ClipSyncService.ACTION_APP_OPENED)
            } else {
                if (hasUsableSettings()) {
                    startClipSyncServiceWithPermissionPrompt(ClipSyncService.ACTION_REFRESH_NOTIFICATION)
                } else {
                    stopClipSyncService()
                }
            }
        }
    }

    override fun onResume() {
        super.onResume()
        ClipState.setListener { render() }
        if (returningFromPrivacy) {
            returningFromPrivacy = false
            val prefs = getSharedPreferences("clipsync_prefs", MODE_PRIVATE)
            editDeviceName.setText(prefs.getString("device_name", "Android Phone"))
            editServerUrl.setText(prefs.getString("server_url", ""))
            editSecretKey.setText(prefs.getString("secret_key", ""))
            switchCustomServer.isChecked = prefs.getBoolean(RelayAddress.PREF_CUSTOM_SERVER, false)
            updateServerVisibility()
        }
        val saved = getSharedPreferences("clipsync_prefs", MODE_PRIVATE)
        refreshingPrivacyControls = true
        switchService.isChecked = PrivacyConsent.isGranted(this) && saved.getBoolean(ClipSyncService.PREF_RUN_IN_BACKGROUND, false)
        switchSendNotificationAction.isChecked = PrivacyConsent.isGranted(this) && saved.getBoolean(ClipSyncService.PREF_SHOW_SEND_NOTIFICATION_ACTION, false)
        refreshingPrivacyControls = false
        if (hasUsableSettings() && PrivacyConsent.isGranted(this)) {
            startClipSyncServiceWithPermissionPrompt(ClipSyncService.ACTION_APP_OPENED)
        }
        render()
    }

    override fun onPause() {
        super.onPause()
        ClipState.setListener(null)
        stopPulse()
    }

    override fun onStop() {
        super.onStop()
        if (!PrivacyConsent.isGranted(this)) return
        val closeIntent = Intent(this, ClipSyncService::class.java).apply {
            action = ClipSyncService.ACTION_APP_CLOSED
        }
        startService(closeIntent)
    }

    private fun render() {
        val (title, color, animate) = when {
            !hasUsableSettings() ->
                Triple(getString(R.string.status_not_configured), R.color.cs_text_secondary, false)
            ClipState.connection == ClipState.Connection.CONNECTED ->
                Triple(getString(R.string.status_connected), R.color.cs_status_green, true)
            ClipState.connection == ClipState.Connection.CONNECTING ->
                Triple(getString(R.string.status_connecting), R.color.cs_status_orange, true)
            ClipState.connection == ClipState.Connection.DISCONNECTED ->
                Triple(getString(R.string.status_disconnected), R.color.cs_status_red, false)
            else -> Triple(getString(R.string.status_idle), R.color.cs_text_secondary, false)
        }
        tvStatusTitle.text = title
        tvStatus.text = when {
            !hasUsableSettings() -> "Enter your server URL and secret key below."
            ClipState.detail.isNotEmpty() -> ClipState.detail
            else -> "Syncs while the app is open" +
                if (switchService.isChecked) " and in the background." else "."
        }
        val tint = ColorStateList.valueOf(getColor(color))
        statusDot.backgroundTintList = tint
        statusHalo.backgroundTintList = tint
        if (animate) startPulse() else stopPulse()

        if (ClipState.lastText.isEmpty()) {
            lastReceivedGroup.visibility = View.GONE
        } else {
            lastReceivedGroup.visibility = View.VISIBLE
            tvLastReceivedFrom.text = getString(R.string.last_received_from, ClipState.lastDevice)
            tvLastReceived.text = ClipState.lastText
            val thumbnail = ClipState.lastImage
            ivLastImage.visibility = if (thumbnail != null) View.VISIBLE else View.GONE
            ivLastImage.setImageBitmap(thumbnail)
        }
    }

    /** Expanding halo behind the status dot; runs only while this screen is visible. */
    private fun startPulse() {
        if (pulse?.isRunning == true) return
        pulse = ValueAnimator.ofFloat(0f, 1f).apply {
            duration = 1600
            repeatCount = ValueAnimator.INFINITE
            addUpdateListener {
                val fraction = it.animatedValue as Float
                statusHalo.scaleX = 1f + fraction
                statusHalo.scaleY = 1f + fraction
                statusHalo.alpha = 0.5f * (1f - fraction)
            }
            start()
        }
    }

    private fun stopPulse() {
        pulse?.cancel()
        pulse = null
        statusHalo.alpha = 0f
    }

    private fun sendClipboardNow() {
        if (!PrivacyConsent.isGranted(this)) {
            withClipboardConsent { sendClipboardNow() }
            return
        }
        if (!hasUsableSettings()) {
            Toast.makeText(this, "Set Server URL and Secret Key first!", Toast.LENGTH_SHORT).show()
            return
        }
        val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        val clip = clipboard.primaryClip
        val image = ClipImages.imageOf(this, clip)
        val text = if (image == null && clip != null && clip.itemCount > 0) {
            clip.getItemAt(0).coerceToText(this)?.toString()
        } else {
            null
        }
        if (image == null && text.isNullOrBlank()) {
            Toast.makeText(this, "Clipboard is empty", Toast.LENGTH_SHORT).show()
            return
        }
        val intent = Intent(this, ClipSyncService::class.java).apply {
            action = ClipSyncService.ACTION_SEND_TEXT
            if (image != null) {
                putExtra(ClipSyncService.EXTRA_IMAGE_URI, image.first.toString())
            } else {
                putExtra(ClipSyncService.EXTRA_TEXT, text)
            }
            putExtra(ClipSyncService.EXTRA_SOURCE, "in_app_button")
            putExtra(ClipSyncService.EXTRA_FORCE, true)
        }
        if (needsPersistentNotification() && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(intent)
        } else {
            startService(intent)
        }
        Toast.makeText(this, "Sending clipboard", Toast.LENGTH_SHORT).show()
    }

    private fun copyLastReceived() {
        val imageUri = ClipState.lastImageUri
        if (imageUri != null) {
            ClipImages.setClipboard(this, imageUri)
            Toast.makeText(this, "Image copied to clipboard", Toast.LENGTH_SHORT).show()
            return
        }
        val text = ClipState.lastText
        if (text.isEmpty()) return
        (getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager)
            .setPrimaryClip(ClipData.newPlainText("ClipSync", text))
        Toast.makeText(this, "Copied to clipboard", Toast.LENGTH_SHORT).show()
    }

    private fun startClipSyncServiceWithPermissionPrompt(action: String? = null) {
        if (!PrivacyConsent.isGranted(this)) {
            withClipboardConsent { startClipSyncServiceWithPermissionPrompt(action) }
            return
        }
        if (needsPersistentNotification() && requestNotificationPermissionIfNeeded()) {
            startServiceAfterNotificationPrompt = true
            pendingServiceAction = action
            return
        }
        startClipSyncService(action)
    }

    private fun requestNotificationPermissionIfNeeded(): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return false
        if (checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) {
            return false
        }

        requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), REQUEST_POST_NOTIFICATIONS)
        return true
    }

    private fun startClipSyncService(action: String? = null) {
        if (!PrivacyConsent.isGranted(this)) return
        val intent = Intent(this, ClipSyncService::class.java).apply {
            if (action != null) this.action = action
        }
        if (needsPersistentNotification() && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(intent)
        } else {
            startService(intent)
        }
    }

    private fun stopClipSyncService() {
        stopService(Intent(this, ClipSyncService::class.java))
    }

    private fun withClipboardConsent(onAllowed: () -> Unit) {
        if (PrivacyConsent.isGranted(this)) {
            onAllowed()
            return
        }
        if (consentDialog?.isShowing == true) return
        val content = layoutInflater.inflate(R.layout.dialog_clipboard_consent, null)
        val dialog = AlertDialog.Builder(this).setView(content)
            .setOnCancelListener { declineClipboardConsent() }.create()
        consentDialog = dialog
        content.findViewById<Button>(R.id.btnAllowSync).setOnClickListener {
            PrivacyConsent.grant(this)
            dialog.dismiss()
            onAllowed()
        }
        content.findViewById<Button>(R.id.btnDeclineSync).setOnClickListener {
            dialog.dismiss()
            declineClipboardConsent()
        }
        content.findViewById<Button>(R.id.btnConsentPrivacy).setOnClickListener {
            dialog.dismiss()
            returningFromPrivacy = true
            startActivity(Intent(this, PrivacyActivity::class.java))
        }
        dialog.show()
        dialog.window?.setBackgroundDrawableResource(R.drawable.bg_consent)
        val width = minOf(resources.displayMetrics.widthPixels - (32 * resources.displayMetrics.density).toInt(),
            (420 * resources.displayMetrics.density).toInt())
        dialog.window?.setLayout(width, android.view.ViewGroup.LayoutParams.WRAP_CONTENT)
        // Keep actions visible with large fonts, small screens and landscape.
        val body = content.findViewById<android.widget.ScrollView>(R.id.consentBody)
        content.measure(View.MeasureSpec.makeMeasureSpec(width, View.MeasureSpec.EXACTLY),
            View.MeasureSpec.makeMeasureSpec(0, View.MeasureSpec.UNSPECIFIED))
        val fixedHeight = content.measuredHeight - body.measuredHeight
        val available = (resources.displayMetrics.heightPixels * 0.8f).toInt() - fixedHeight
        body.layoutParams = body.layoutParams.apply { height = minOf(body.measuredHeight, available.coerceAtLeast(64)) }
    }

    private fun declineClipboardConsent() {
        PrivacyConsent.revoke(this)
        stopClipSyncService()
        refreshingPrivacyControls = true
        switchService.isChecked = false
        switchSendNotificationAction.isChecked = false
        refreshingPrivacyControls = false
    }

    private fun hasUsableSettings(): Boolean {
        return (!switchCustomServer.isChecked || editServerUrl.text.toString().trim().isNotEmpty()) &&
            editSecretKey.text.toString().trim().isNotEmpty()
    }

    private fun updateServerVisibility() {
        val visibility = if (switchCustomServer.isChecked) View.VISIBLE else View.GONE
        editServerUrl.visibility = visibility
        findViewById<View>(R.id.labelServerUrl).visibility = visibility
    }

    private fun needsPersistentNotification(): Boolean {
        val prefs = getSharedPreferences("clipsync_prefs", Context.MODE_PRIVATE)
        return prefs.getBoolean(ClipSyncService.PREF_RUN_IN_BACKGROUND, false) ||
            prefs.getBoolean(ClipSyncService.PREF_SHOW_SEND_NOTIFICATION_ACTION, false)
    }

    @Deprecated("Deprecated in Java")
    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode != REQUEST_POST_NOTIFICATIONS) return

        if (grantResults.firstOrNull() != PackageManager.PERMISSION_GRANTED) {
            Toast.makeText(
                this,
                "ClipSync can still sync, but Android may hide its notification.",
                Toast.LENGTH_LONG
            ).show()
        }

        if (startServiceAfterNotificationPrompt) {
            startServiceAfterNotificationPrompt = false
            startClipSyncService(pendingServiceAction)
            pendingServiceAction = null
        }
    }
}
