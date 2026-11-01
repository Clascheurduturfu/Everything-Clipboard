@echo off
setlocal
if exist "C:\Program Files\Eclipse Adoptium\jdk-21.0.10.7-hotspot\bin\java.exe" set "JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-21.0.10.7-hotspot"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0build-release.ps1"
exit /b %errorlevel%
