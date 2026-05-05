package com.clipsync

import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import android.widget.Button
import android.widget.EditText
import android.widget.Switch
import android.widget.TextView

class MainActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        val editDeviceName = findViewById<EditText>(R.id.editDeviceName)
        val editServerUrl = findViewById<EditText>(R.id.editServerUrl)
        val editSecretKey = findViewById<EditText>(R.id.editSecretKey)
        val btnSave = findViewById<Button>(R.id.btnSave)
        val switchService = findViewById<Switch>(R.id.switchService)
        val tvStatus = findViewById<TextView>(R.id.tvStatus)

        // Load saved prefs
        val prefs = getSharedPreferences("clipsync_prefs", Context.MODE_PRIVATE)
        editDeviceName.setText(prefs.getString("device_name", "Android Phone"))
        editServerUrl.setText(prefs.getString("server_url", ""))
        editSecretKey.setText(prefs.getString("secret_key", ""))

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
                startClipSyncService()
                tvStatus.text = "Service: Restarting..."
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
                startClipSyncService()
                tvStatus.text = "Service: Running"
            } else {
                stopClipSyncService()
                tvStatus.text = "Service: Stopped"
            }
        }
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
}
