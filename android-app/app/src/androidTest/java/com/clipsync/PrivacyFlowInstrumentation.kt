package com.clipsync

import android.app.Activity
import android.app.AlertDialog
import android.app.Instrumentation
import android.content.Context
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Intent
import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
import android.widget.Switch
import android.widget.TextView

/** Real app consent/transfer/deletion checks against an isolated local review relay. */
class PrivacyFlowInstrumentation : Instrumentation() {
    private var relaySuite = false
    override fun onCreate(arguments: Bundle?) {
        relaySuite = arguments?.getString("suite") == "relay"
        super.onCreate(arguments)
        start()
    }
    private var checks = 0
    private fun verify(condition: Boolean, message: String) {
        check(condition) { message }
        checks++
        sendStatus(0, Bundle().apply { putString("check", message) })
    }
    private fun ui(action: () -> Unit) { runOnMainSync(action); waitForIdleSync() }
    private fun pause() { Thread.sleep(2500) }
    private fun screenshot(name: String) {
        uiAutomation.takeScreenshot().useBitmap { bitmap ->
            targetContext.cacheDir.resolve(name).outputStream().use { bitmap.compress(android.graphics.Bitmap.CompressFormat.PNG, 100, it) }
        }
    }
    private fun android.graphics.Bitmap.useBitmap(action: (android.graphics.Bitmap) -> Unit) {
        try { action(this) } finally { recycle() }
    }
    private fun children(view: View): List<View> = listOf(view) +
        if (view is ViewGroup) (0 until view.childCount).flatMap { children(view.getChildAt(it)) } else emptyList()
    private fun clickText(activity: Activity, label: String) {
        val button = children(activity.window.decorView).filterIsInstance<Button>().first { it.text.toString() == label }
        button.performClick()
    }
    private fun dialog(activity: MainActivity): AlertDialog {
        val field = MainActivity::class.java.getDeclaredField("consentDialog").apply { isAccessible = true }
        return field.get(activity) as AlertDialog
    }
    override fun onStart() {
        if (relaySuite) { RelayRegressionChecks.runWith(this); return }
        try {
            val prefs = targetContext.getSharedPreferences("clipsync_prefs", Context.MODE_PRIVATE)
            prefs.edit().clear().commit()
            val main = startActivitySync(Intent(targetContext, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) as MainActivity
            pause()
            verify(main.findViewById<Switch>(R.id.switchCustomServer).isChecked, "Custom server is enabled on a fresh install")
            prefs.edit().putString("server_url", "wss://custom.example").commit()
            ui { main.findViewById<Switch>(R.id.switchCustomServer).isChecked = false }
            verify(main.findViewById<EditText>(R.id.editServerUrl).visibility == View.GONE && RelayAddress.effective(prefs) == RelayAddress.DEFAULT,
                "Disabling custom server hides the field and uses the default relay")
            verify(prefs.getString("server_url", "") == "wss://custom.example", "Default mode preserves the custom URL")
            ui { main.findViewById<Switch>(R.id.switchCustomServer).isChecked = true }
            verify(main.findViewById<EditText>(R.id.editServerUrl).visibility == View.VISIBLE, "Custom server field can be restored")
            ui { main.findViewById<Button>(R.id.btnGenerateKey).performClick() }
            val generated = main.findViewById<EditText>(R.id.editSecretKey).text.toString()
            verify(generated.matches(Regex("[A-Za-z0-9_-]{64}")), "Generate creates a 64-character secure key")
            ui { main.findViewById<android.widget.ImageButton>(R.id.btnRevealKey).performClick() }
            verify(main.findViewById<EditText>(R.id.editSecretKey).transformationMethod == null, "Eye reveals the key")
            ui { main.findViewById<android.widget.ImageButton>(R.id.btnRevealKey).performClick() }
            verify(main.findViewById<EditText>(R.id.editSecretKey).transformationMethod is android.text.method.PasswordTransformationMethod, "Eye hides the key again")
            val chooser = addMonitor(android.content.IntentFilter(Intent.ACTION_CHOOSER), ActivityResult(Activity.RESULT_CANCELED, null), true)
            ui { main.findViewById<Button>(R.id.btnShareKey).performClick() }
            pause()
            verify(chooser.hits == 1, "Share opens the system chooser without sending automatically")
            removeMonitor(chooser)
            screenshot("rc4-key-controls.png")
            ui {
                main.findViewById<EditText>(R.id.editDeviceName).setText("Review Android")
                main.findViewById<EditText>(R.id.editServerUrl).setText("ws://10.0.2.2:8769")
                main.findViewById<EditText>(R.id.editSecretKey).setText("play-review-only-20261029")
                main.findViewById<Button>(R.id.btnSave).performClick()
            }
            pause()
            verify(!PrivacyConsent.isGranted(targetContext), "Save requires explicit clipboard consent")
            screenshot("rc4-consent.png")
            ui { dialog(main).findViewById<Button>(R.id.btnDeclineSync).performClick() }
            pause()
            verify(!PrivacyConsent.isGranted(targetContext), "Not now does not grant consent")
            ui { targetContext.startService(Intent(targetContext, ClipSyncService::class.java)) }
            pause()
            verify(ClipState.connection == ClipState.Connection.IDLE, "Service entry cannot bypass declined consent")
            ui { main.findViewById<Button>(R.id.btnSave).performClick() }
            pause()
            ui { dialog(main).findViewById<Button>(R.id.btnAllowSync).performClick() }
            pause()
            verify(PrivacyConsent.isGranted(targetContext), "Allow grants versioned consent")
            repeat(12) { if (ClipState.connection != ClipState.Connection.CONNECTED) Thread.sleep(500) }
            verify(ClipState.connection == ClipState.Connection.CONNECTED, "Accepted session connects to review relay")
            ui {
                (targetContext.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager)
                    .setPrimaryClip(ClipData.newPlainText("Review", "Android to desktop review"))
                main.findViewById<Button>(R.id.btnSendClipboard).performClick()
            }
            Thread.sleep(3500)
            verify(ClipState.lastText == "Desktop to Android review", "Encrypted desktop reply is received")
            if (android.os.Build.VERSION.SDK_INT >= 33) uiAutomation.grantRuntimePermission("com.clipsync", android.Manifest.permission.POST_NOTIFICATIONS)
            ui { main.findViewById<Switch>(R.id.switchSendNotificationAction).isChecked = true }
            pause()
            val notifications = targetContext.getSystemService(android.app.NotificationManager::class.java)
            verify(notifications.activeNotifications.any { notification -> notification.notification.actions?.any { it.title.toString() == "Send Clipboard" } == true },
                "Enabled notification setting creates a real Send Clipboard action")
            ui { main.findViewById<Switch>(R.id.switchSendNotificationAction).isChecked = false }
            pause()
            verify(notifications.activeNotifications.none { notification -> notification.notification.actions?.any { it.title.toString() == "Send Clipboard" } == true },
                "Disabling the notification setting removes its send action")
            ui { main.findViewById<Switch>(R.id.switchService).isChecked = true }
            pause()
            ui { main.moveTaskToBack(true) }
            Thread.sleep(6500)
            verify(ClipState.lastText == "Background receipt review", "Foreground session receives while app is backgrounded")
            uiAutomation.performGlobalAction(android.accessibilityservice.AccessibilityService.GLOBAL_ACTION_NOTIFICATIONS)
            pause()
            uiAutomation.performGlobalAction(android.accessibilityservice.AccessibilityService.GLOBAL_ACTION_BACK)
            val monitor = addMonitor(PrivacyActivity::class.java.name, null, false)
            // NEW_TASK resumes the existing task; startActivitySync would wait for
            // a new Activity creation that doesn't occur in this case.
            ui { targetContext.startActivity(Intent(targetContext, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) }
            pause()
            ui {
                val privacyButton = main.findViewById<Button>(R.id.btnPrivacy)
                privacyButton.requestRectangleOnScreen(android.graphics.Rect(0, 0, privacyButton.width, privacyButton.height), true)
            }
            pause()
            ui { main.findViewById<Button>(R.id.btnPrivacy).performClick() }
            val privacy = waitForMonitorWithTimeout(monitor, 5000) ?: error("Privacy screen did not open")
            pause()
            verify(children(privacy.window.decorView).filterIsInstance<TextView>().any {
                it.text.toString().contains("ClipSync Privacy Policy")
            }, "Offline policy is available inside the app")
            ui { clickText(privacy, "Withdraw consent and stop sync") }
            pause()
            verify(!PrivacyConsent.isGranted(targetContext), "Withdrawal revokes consent")
            verify(ClipState.connection == ClipState.Connection.IDLE, "Withdrawal stops the sync connection")
            val monitor2 = addMonitor(PrivacyActivity::class.java.name, null, false)
            ui { main.findViewById<Button>(R.id.btnPrivacy).performClick() }
            val privacy2 = waitForMonitorWithTimeout(monitor2, 5000) ?: error("Privacy screen did not reopen")
            // Confirm the app's own data-erasure dialog through its visible window.
            ui { clickText(privacy2, "Erase local data") }
            pause()
            // Use a UI-owned dialog handle, avoiding any exported test-only app endpoint.
            val erase = PrivacyActivity::class.java.getDeclaredField("eraseDialog").apply { isAccessible = true }
                .get(privacy2) as AlertDialog
            ui { erase.getButton(AlertDialog.BUTTON_POSITIVE).performClick() }
            pause()
            verify(prefs.all.isEmpty(), "Erase removes saved secret and connection preferences")
            verify(!targetContext.cacheDir.resolve("clips").exists(), "Erase removes the clipboard image cache")
            verify(!PrivacyConsent.isGranted(targetContext), "Erased app remains disconnected without consent")
            finish(Activity.RESULT_OK, Bundle().apply { putInt("passed", checks) })
        } catch (failure: Throwable) {
            finish(Activity.RESULT_CANCELED, Bundle().apply { putString("failure", failure.stackTraceToString()) })
        }
    }
}
