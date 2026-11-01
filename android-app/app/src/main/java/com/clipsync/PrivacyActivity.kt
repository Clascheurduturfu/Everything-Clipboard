package com.clipsync

import android.app.Activity
import android.app.AlertDialog
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat

class PrivacyActivity : Activity() {
    private var eraseDialog: AlertDialog? = null
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            val pad = (20 * resources.displayMetrics.density).toInt()
            setPadding(pad, pad, pad, pad)
        }
        fun button(label: Int, action: () -> Unit) {
            layout.addView(Button(this).apply { setText(label); setOnClickListener { action() } })
        }
        button(R.string.back_to_clipsync) { finish() }
        button(R.string.online_privacy_policy) {
            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(PrivacyConsent.POLICY_URL)))
        }
        button(R.string.withdraw_consent) {
            PrivacyConsent.revoke(this)
            stopService(Intent(this, ClipSyncService::class.java))
            ClipState.clear()
            finish()
        }
        button(R.string.erase_local_data) {
            eraseDialog = AlertDialog.Builder(this).setTitle(R.string.erase_local_data)
                .setMessage(R.string.erase_local_data_warning)
                .setNegativeButton(android.R.string.cancel, null)
                .setPositiveButton(R.string.erase_local_data) { _, _ ->
                    PrivacyConsent.revoke(this)
                    stopService(Intent(this, ClipSyncService::class.java))
                    getSharedPreferences("clipsync_prefs", MODE_PRIVATE).edit().clear().apply()
                    cacheDir.resolve("clips").deleteRecursively()
                    ClipState.clear()
                    finish()
                }.show()
        }
        val policy = resources.openRawResource(R.raw.privacy_policy).bufferedReader().use { it.readText() }
        layout.addView(TextView(this).apply {
            text = policy
            textSize = 16f
            setTextIsSelectable(true)
        })
        val scroll = ScrollView(this).apply { addView(layout) }
        setContentView(scroll)
        ViewCompat.setOnApplyWindowInsetsListener(scroll) { view, insets ->
            val safe = insets.getInsets(WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout())
            view.setPadding(safe.left, safe.top, safe.right, safe.bottom)
            insets
        }
        ViewCompat.requestApplyInsets(scroll)
    }
}
