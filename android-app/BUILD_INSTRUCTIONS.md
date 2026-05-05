# How to Build Your APK

## Quick Start (Easiest Method)

1. **Open Android Studio**
2. **Click**: File → Open
3. **Navigate to**: `C:\Users\jouan\Documents\GitHub\Projects\mac os clipboard\android-app`
4. **Select** the `android-app` folder and click OK
5. **Wait** for Android Studio to sync (first time may take 2-5 minutes)
6. **Click**: Build → Build Bundle(s) / APK(s) → Build APK(s)
7. **Wait** for build to complete (~1-3 minutes)
8. **Click** "locate" in the notification pop-up, or find your APK at:
   ```
   app\build\outputs\apk\debug\app-debug.apk
   ```

## Sending APK to Your Phone

### Option A: USB Transfer
1. Connect phone via USB
2. Copy `app-debug.apk` to phone's Downloads folder
3. Open file on phone and tap Install

### Option B: Email
1. Email the APK to yourself
2. Open email on phone
3. Download and install

### Option C: Cloud Storage
1. Upload to Google Drive/OneDrive
2. Download on phone
3. Install

## First Time Installation

When installing the APK on your phone:
1. You may need to enable "Install from Unknown Sources" in Settings
2. Grant all requested permissions (clipboard access, etc.)

## Project Structure Created

```
android-app/
├── app/
│   ├── src/main/
│   │   ├── java/com/clipsync/
│   │   │   ├── MainActivity.kt
│   │   │   ├── ClipSyncService.kt
│   │   │   ├── WsClient.kt
│   │   │   └── CryptoUtils.kt
│   │   ├── res/
│   │   │   ├── layout/
│   │   │   ├── values/
│   │   │   ├── drawable/
│   │   │   └── mipmap-*/
│   │   └── AndroidManifest.xml
│   ├── build.gradle.kts
│   └── proguard-rules.pro
├── gradle/
│   └── wrapper/
│       └── gradle-wrapper.properties
├── build.gradle.kts
├── settings.gradle.kts
├── gradle.properties
├── local.properties
├── gradlew.bat
└── README.md
```

## Troubleshooting

### "Gradle sync failed"
- Make sure Android Studio is fully updated
- Check that Android SDK is installed (Tools → SDK Manager)
- Run `init-gradle.bat` to download wrapper JAR

### "Cannot find JDK"
- Install JDK 17 or higher
- In Android Studio: File → Project Structure → SDK Location → JDK Location

### Build takes too long
- First build always takes longer (downloads dependencies)
- Subsequent builds will be much faster

## What's Next?

After installing on your phone:
1. Open the ClipSync app
2. Enter your server URL (e.g., `ws://192.168.1.100:8080`)
3. Tap Connect
4. Copy/paste will now sync across devices!
