@echo off
REM AGP 8.2 cannot jlink with JDK 21+; use the JetBrains JDK 17 when present.
if exist "%USERPROFILE%\.jdks\jbr-17.0.14\bin\java.exe" set "JAVA_HOME=%USERPROFILE%\.jdks\jbr-17.0.14"

echo Building signed release AAB (Play Store) and APK (Direct install)...
call gradlew.bat bundleRelease assembleRelease
if %errorlevel% neq 0 (
    echo Build failed!
    exit /b %errorlevel%
)

echo.
echo Copying production artifacts...
copy /Y app\build\outputs\bundle\release\app-release.aab ClypSync.aab
copy /Y app\build\outputs\apk\release\app-release.apk ClypSync.apk

echo.
echo Done! ClypSync.aab (Play Store) and ClypSync.apk (Direct install) are ready and signed.
