package com.clipsync

import android.Manifest
import android.animation.ValueAnimator
import android.app.Activity
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
    private var pulse: ValueAnimator? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

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
        editServerUrl.setText(prefs.getString("server_url", ""))
        editSecretKey.setText(prefs.getString("secret_key", ""))
        switchSendNotificationAction.isChecked =
            prefs.getBoolean(ClipSyncService.PREF_SHOW_SEND_NOTIFICATION_ACTION, false)

        val switchSyncImages = findViewById<Switch>(R.id.switchSyncImages)
        val switchImagesWifiOnly = findViewById<Switch>(R.id.switchImagesWifiOnly)
        val switchImagesWifiOnlyReceive = findViewById<Switch>(R.id.switchImagesWifiOnlyReceive)
        switchSyncImages.isChecked = prefs.getBoolean(ClipSyncService.PREF_SYNC_IMAGES, true)
        switchImagesWifiOnly.isChecked = prefs.getBoolean(ClipSyncService.PREF_IMAGES_WIFI_ONLY, true)
        switchImagesWifiOnlyReceive.isChecked = prefs.getBoolean(ClipSyncService.PREF_IMAGES_WIFI_ONLY_RECEIVE, false)
        switchImagesWifiOnly.isEnabled = switchSyncImages.isChecked
        switchImagesWifiOnlyReceive.isEnabled = switchSyncImages.isChecked
        switchSyncImages.setOnCheckedChangeListener { _, isChecked ->
            prefs.edit().putBoolean(ClipSyncService.PREF_SYNC_IMAGES, isChecked).apply()
            switchImagesWifiOnly.isEnabled = isChecked
            switchImagesWifiOnlyReceive.isEnabled = isChecked
        }
        switchImagesWifiOnly.setOnCheckedChangeListener { _, isChecked ->
            prefs.edit().putBoolean(ClipSyncService.PREF_IMAGES_WIFI_ONLY, isChecked).apply()
        }
        switchImagesWifiOnlyReceive.setOnCheckedChangeListener { _, isChecked ->
            prefs.edit().putBoolean(ClipSyncService.PREF_IMAGES_WIFI_ONLY_RECEIVE, isChecked).apply()
        }

        // This toggle means "keep ClipSync alive after the app closes".
        switchService.isChecked = prefs.getBoolean(ClipSyncService.PREF_RUN_IN_BACKGROUND, false)

        findViewById<Button>(R.id.btnSave).setOnClickListener {
            val url = editServerUrl.text.toString().trim()
            val key = editSecretKey.text.toString().trim()
            val name = editDeviceName.text.toString().trim()

            if (url.isEmpty() || key.isEmpty()) {
                Toast.makeText(this, "Server URL and Secret Key are required!", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            prefs.edit()
                .putString("device_name", name)
                .putString("server_url", url)
                .putString("secret_key", key)
                .apply()

            Toast.makeText(this, "Settings saved", Toast.LENGTH_SHORT).show()
            startClipSyncServiceWithPermissionPrompt(ClipSyncService.ACTION_APP_OPENED)
        }

        findViewById<Button>(R.id.btnSendClipboard).setOnClickListener { sendClipboardNow() }
        findViewById<Button>(R.id.btnCopyLast).setOnClickListener { copyLastReceived() }

        findViewById<Button>(R.id.btnAccessibility).setOnClickListener {
            startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))
        }

        switchSendNotificationAction.setOnCheckedChangeListener { _, isChecked ->
            prefs.edit()
                .putBoolean(ClipSyncService.PREF_SHOW_SEND_NOTIFICATION_ACTION, isChecked)
                .apply()

            if (hasUsableSettings()) {
                startClipSyncServiceWithPermissionPrompt(ClipSyncService.ACTION_REFRESH_NOTIFICATION)
            }
        }

        switchService.setOnCheckedChangeListener { _, isChecked ->
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
        if (hasUsableSettings()) {
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

    private fun hasUsableSettings(): Boolean {
        return editServerUrl.text.toString().trim().isNotEmpty() &&
            editSecretKey.text.toString().trim().isNotEmpty()
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
