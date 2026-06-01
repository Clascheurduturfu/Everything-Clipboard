package com.clipsync

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import android.widget.Button
import android.widget.EditText
import android.widget.Switch
import android.widget.TextView

class MainActivity : AppCompatActivity() {

    companion object {
        private const val REQUEST_POST_NOTIFICATIONS = 1001
        private const val STATUS_REFRESH_MS = 1000L
    }

    private var startServiceAfterNotificationPrompt = false
    private var pendingServiceAction: String? = null
    private lateinit var tvStatus: TextView
    private lateinit var switchService: Switch
    private lateinit var switchSendNotificationAction: Switch
    private lateinit var switchSensitiveClipboard: Switch
    private lateinit var editDeviceName: EditText
    private lateinit var editServerUrl: EditText
    private lateinit var editSecretKey: EditText
    private val statusHandler = Handler(Looper.getMainLooper())
    private val statusRefreshRunnable = object : Runnable {
        override fun run() {
            refreshStatusDisplay()
            statusHandler.postDelayed(this, STATUS_REFRESH_MS)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        editDeviceName = findViewById(R.id.editDeviceName)
        editServerUrl = findViewById(R.id.editServerUrl)
        editSecretKey = findViewById(R.id.editSecretKey)
        val btnSave = findViewById<Button>(R.id.btnSave)
        val btnAccessibility = findViewById<Button>(R.id.btnAccessibility)
        switchService = findViewById(R.id.switchService)
        switchSendNotificationAction = findViewById(R.id.switchSendNotificationAction)
        switchSensitiveClipboard = findViewById(R.id.switchSensitiveClipboard)
        tvStatus = findViewById(R.id.tvStatus)

        // Load saved prefs
        val prefs = getSharedPreferences("clipsync_prefs", Context.MODE_PRIVATE)
        editDeviceName.setText(prefs.getString("device_name", "Android Phone"))
        editServerUrl.setText(prefs.getString("server_url", ""))
        editSecretKey.setText(prefs.getString("secret_key", ""))
        switchSendNotificationAction.isChecked =
            prefs.getBoolean(ClipSyncService.PREF_SHOW_SEND_NOTIFICATION_ACTION, false)
        switchSensitiveClipboard.isChecked =
            prefs.getBoolean(ClipSyncService.PREF_USE_SENSITIVE_CLIPBOARD, true)

        // This toggle means "keep ClipSync alive after the app closes".
        val wasRunning = prefs.getBoolean(ClipSyncService.PREF_RUN_IN_BACKGROUND, false)
        switchService.isChecked = wasRunning
        refreshStatusDisplay()

        btnSave.setOnClickListener {
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

            Toast.makeText(this, "Settings saved!", Toast.LENGTH_SHORT).show()

            // Restart service if it's running to apply new settings
            if (hasUsableSettings()) {
                startClipSyncServiceWithPermissionPrompt(ClipSyncService.ACTION_APP_OPENED)
            }
        }

        btnAccessibility.setOnClickListener {
            startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))
        }

        switchSendNotificationAction.setOnCheckedChangeListener { _, isChecked ->
            prefs.edit()
                .putBoolean(ClipSyncService.PREF_SHOW_SEND_NOTIFICATION_ACTION, isChecked)
                .apply()

            if (hasUsableSettings()) {
                startClipSyncServiceWithPermissionPrompt(ClipSyncService.ACTION_REFRESH_NOTIFICATION)
            }
            refreshStatusDisplay()
        }

        switchSensitiveClipboard.setOnCheckedChangeListener { _, isChecked ->
            prefs.edit()
                .putBoolean(ClipSyncService.PREF_USE_SENSITIVE_CLIPBOARD, isChecked)
                .apply()
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
            refreshStatusDisplay()
        }
    }

    override fun onResume() {
        super.onResume()
        if (hasUsableSettings()) {
            startClipSyncServiceWithPermissionPrompt(ClipSyncService.ACTION_APP_OPENED)
        }
        refreshStatusDisplay()
        statusHandler.postDelayed(statusRefreshRunnable, STATUS_REFRESH_MS)
    }

    override fun onStop() {
        super.onStop()
        statusHandler.removeCallbacks(statusRefreshRunnable)
        val closeIntent = Intent(this, ClipSyncService::class.java).apply {
            action = ClipSyncService.ACTION_APP_CLOSED
        }
        startService(closeIntent)
    }

    /**
     * Reads the live service status from SharedPreferences (written by ClipSyncService)
     * and displays it in tvStatus. Shows "Stopped" when the service isn't running.
     */
    private fun refreshStatusDisplay() {
        val prefs = getSharedPreferences("clipsync_prefs", Context.MODE_PRIVATE)
        val isRunning = prefs.getBoolean(ClipSyncService.PREF_RUN_IN_BACKGROUND, false)
        val isVisible = prefs.getBoolean(ClipSyncService.PREF_APP_VISIBLE, false)

        if (!isRunning && !isVisible) {
            tvStatus.text = "Opens when the app is open"
            return
        }

        // The service writes its live status (connection state, last clipboard, etc.)
        val liveStatus = prefs.getString(ClipSyncService.PREF_SERVICE_STATUS, null)
        tvStatus.text = liveStatus ?: "Service starting..."
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
