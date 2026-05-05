package com.clipsync

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
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
    }

    private var startServiceAfterNotificationPrompt = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        val editDeviceName = findViewById<EditText>(R.id.editDeviceName)
        val editServerUrl = findViewById<EditText>(R.id.editServerUrl)
        val editSecretKey = findViewById<EditText>(R.id.editSecretKey)
        val btnSave = findViewById<Button>(R.id.btnSave)
        val btnAccessibility = findViewById<Button>(R.id.btnAccessibility)
        val switchService = findViewById<Switch>(R.id.switchService)
        val switchSendNotificationAction = findViewById<Switch>(R.id.switchSendNotificationAction)
        val tvStatus = findViewById<TextView>(R.id.tvStatus)

        // Load saved prefs
        val prefs = getSharedPreferences("clipsync_prefs", Context.MODE_PRIVATE)
        editDeviceName.setText(prefs.getString("device_name", "Android Phone"))
        editServerUrl.setText(prefs.getString("server_url", ""))
        editSecretKey.setText(prefs.getString("secret_key", ""))
        switchSendNotificationAction.isChecked =
            prefs.getBoolean(ClipSyncService.PREF_SHOW_SEND_NOTIFICATION_ACTION, false)

        // Check if service is supposed to be running
        val wasRunning = prefs.getBoolean("service_running", false)
        switchService.isChecked = wasRunning
        tvStatus.text = if (wasRunning) "Service: Running" else "Service: Stopped"

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
            if (switchService.isChecked) {
                stopClipSyncService()
                startClipSyncServiceWithPermissionPrompt()
                tvStatus.text = "Service: Restarting..."
            }
        }

        btnAccessibility.setOnClickListener {
            startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))
        }

        switchSendNotificationAction.setOnCheckedChangeListener { _, isChecked ->
            prefs.edit()
                .putBoolean(ClipSyncService.PREF_SHOW_SEND_NOTIFICATION_ACTION, isChecked)
                .apply()

            if (isChecked) {
                requestNotificationPermissionIfNeeded()
            }

            if (switchService.isChecked) {
                startClipSyncServiceWithPermissionPrompt()
            }
        }

        switchService.setOnCheckedChangeListener { _, isChecked ->
            prefs.edit().putBoolean("service_running", isChecked).apply()
            if (isChecked) {
                val url = editServerUrl.text.toString().trim()
                val key = editSecretKey.text.toString().trim()
                if (url.isEmpty() || key.isEmpty()) {
                    Toast.makeText(this, "Set Server URL and Secret Key first!", Toast.LENGTH_SHORT).show()
                    switchService.isChecked = false
                    return@setOnCheckedChangeListener
                }
                startClipSyncServiceWithPermissionPrompt()
                tvStatus.text = "Service: Running"
            } else {
                stopClipSyncService()
                tvStatus.text = "Service: Stopped"
            }
        }
    }

    private fun startClipSyncServiceWithPermissionPrompt() {
        if (requestNotificationPermissionIfNeeded()) {
            startServiceAfterNotificationPrompt = true
            return
        }
        startClipSyncService()
    }

    private fun requestNotificationPermissionIfNeeded(): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return false
        if (checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) {
            return false
        }

        requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), REQUEST_POST_NOTIFICATIONS)
        return true
    }

    private fun startClipSyncService() {
        val intent = Intent(this, ClipSyncService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(intent)
        } else {
            startService(intent)
        }
    }

    private fun stopClipSyncService() {
        stopService(Intent(this, ClipSyncService::class.java))
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
            startClipSyncService()
        }
    }
}
