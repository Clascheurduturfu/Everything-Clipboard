package com.clipsync

import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.Switch
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        val editDeviceName = findViewById<EditText>(R.id.editDeviceName)
        val editServerUrl = findViewById<EditText>(R.id.editServerUrl)
        val editSecretKey = findViewById<EditText>(R.id.editSecretKey)
        val btnSave = findViewById<Button>(R.id.btnSave)
        val switchService = findViewById<Switch>(R.id.switchService)

        // Load saved preferences
        val prefs = getSharedPreferences("clipsync_prefs", Context.MODE_PRIVATE)
        editDeviceName.setText(prefs.getString("device_name", "Android Phone"))
        editServerUrl.setText(prefs.getString("server_url", ""))
        editSecretKey.setText(prefs.getString("secret_key", ""))

        btnSave.setOnClickListener {
            prefs.edit()
                .putString("device_name", editDeviceName.text.toString().trim())
                .putString("server_url", editServerUrl.text.toString().trim())
                .putString("secret_key", editSecretKey.text.toString().trim())
                .apply()
            
            Toast.makeText(this, "Settings Saved!", Toast.LENGTH_SHORT).show()
            
            // If service is running, restart it to apply new settings
            if (switchService.isChecked) {
                startClipSyncService()
            }
        }

        switchService.setOnCheckedChangeListener { _, isChecked ->
            if (isChecked) {
                startClipSyncService()
            } else {
                stopClipSyncService()
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
        val intent = Intent(this, ClipSyncService::class.java)
        stopService(intent)
    }
}
