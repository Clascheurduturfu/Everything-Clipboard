@echo off
echo Downloading Gradle Wrapper...
echo.

if not exist gradle\wrapper mkdir gradle\wrapper

powershell -Command "& {[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/gradle/gradle/master/gradle/wrapper/gradle-wrapper.jar' -OutFile 'gradle\wrapper\gradle-wrapper.jar'}"

if exist gradle\wrapper\gradle-wrapper.jar (
    echo.
    echo Gradle wrapper downloaded successfully!
    echo You can now open this project in Android Studio.
) else (
    echo.
    echo Failed to download gradle-wrapper.jar
    echo Please download it manually or open the project in Android Studio to auto-generate it.
)

pause
