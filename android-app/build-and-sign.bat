@echo off
REM AGP 8.2 cannot jlink with JDK 21+; use the JetBrains JDK 17 when present.
if exist "%USERPROFILE%\.jdks\jbr-17.0.14\bin\java.exe" set "JAVA_HOME=%USERPROFILE%\.jdks\jbr-17.0.14"
echo Building release APK...
call gradlew.bat assembleRelease
if %errorlevel% neq 0 (
    echo Build failed!
    exit /b %errorlevel%
)

echo.
echo Signing APK...
java -jar uber-apk-signer-1.3.0.jar -a app/build/outputs/apk/release/app-release-unsigned.apk --ks clipsync.jks --ksAlias clipsync --ksPass "qsdfghjklM1*" --ksKeyPass "qsdfghjklM1*" -o .
if %errorlevel% neq 0 (
    echo Signing failed!
    exit /b %errorlevel%
)

echo.
echo Replacing old APK...
move /Y app-release-aligned-signed.apk ClypSync.apk

echo.
echo Done! ClypSync.apk is ready.
