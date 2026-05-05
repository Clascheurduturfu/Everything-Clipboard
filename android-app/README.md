# ClipSync Android App

Android client for clipboard synchronization across devices.

## Prerequisites

- Android Studio (Arctic Fox or newer recommended)
- Android SDK (API 26+)
- JDK 17 or higher

## Building the APK

### Method 1: Using Android Studio (Recommended)

1. Open Android Studio
2. Click **File > Open** and select this `android-app` folder
3. Wait for Gradle sync to complete
4. Click **Build > Build Bundle(s) / APK(s) > Build APK(s)**
5. Once complete, click "locate" in the notification, or find the APK at:
   ```
   app/build/outputs/apk/debug/app-debug.apk
   ```

### Method 2: Using Command Line

```bash
# Windows
gradlew.bat assembleDebug

# The APK will be at: app\build\outputs\apk\debug\app-debug.apk
```

## Installing on Your Phone

1. Transfer the APK to your phone via USB, email, or cloud storage
2. On your phone, enable **Settings > Security > Install from Unknown Sources**
3. Open the APK file and tap **Install**

## Configuration

After installation, open the app and:
1. Enter your server URL (e.g., `ws://192.168.1.100:8080`)
2. Tap **Connect**
3. Grant clipboard access permissions when prompted

## Permissions Required

- **Clipboard Access**: To read and write clipboard content
- **Foreground Service**: To keep the sync service running
- **Internet**: To connect to the sync server

## Troubleshooting

- **Gradle sync fails**: Check that `local.properties` has the correct SDK path
- **Build fails**: Ensure you have JDK 17+ installed and JAVA_HOME is set
- **Connection issues**: Verify server URL and network connectivity
