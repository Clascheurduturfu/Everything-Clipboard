# ClipSync Android App

To build this app, open **Android Studio**, select **New Project > Empty Views Activity** (Kotlin), and replace the generated files with these ones!

## Required Dependencies
Add this to your `app/build.gradle.kts` dependencies block:
```kotlin
implementation("com.squareup.okhttp3:okhttp:4.12.0")
```

## Manifest Permissions
Add these to your `AndroidManifest.xml` above the `<application>` tag:
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_DATA_SYNC" />
```

Also, register the service inside the `<application>` tag:
```xml
<service
    android:name=".ClipSyncService"
    android:foregroundServiceType="dataSync"
    android:exported="false" />
```

## How the UI works (`MainActivity.kt`)
You can build a simple UI with 3 `EditText` fields (Device Name, Server URL, Secret Key) and a `Button` to save.

```kotlin
// Example snippet for your MainActivity.kt Save Button
val prefs = getSharedPreferences("clipsync_prefs", Context.MODE_PRIVATE)
prefs.edit()
    .putString("server_url", "wss://your-digitalocean-app.ondigitalocean.app")
    .putString("secret_key", "my_secret_123")
    .putString("device_name", "My Android")
    .apply()

// Start the background service
val intent = Intent(this, ClipSyncService::class.java)
if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
    startForegroundService(intent)
} else {
    startService(intent)
}
```
