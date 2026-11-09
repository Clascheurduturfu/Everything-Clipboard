@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

set "PYTHON=python"
if exist .venv\Scripts\python.exe set "PYTHON=.venv\Scripts\python.exe"

REM ---------------------------------------------------------------------------
REM Builds ClipSync.exe AND packages build-output\windows\ClipSync.zip.
REM
REM The zip step used to be done by hand, so the file could go missing while the
REM build still "succeeded" - and website\scripts\upload-downloads.mjs reads
REM exactly that path, so publishing then died on a missing file. Packaging is
REM part of the build now.
REM ---------------------------------------------------------------------------

 powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$root=(Resolve-Path 'build-output\windows' -ErrorAction SilentlyContinue).Path; if ($root) { $root=$root.TrimEnd('\')+'\'; $p=Get-CimInstance Win32_Process -Filter \"name='ClipSync.exe'\" | Where-Object { $_.ExecutablePath -and $_.ExecutablePath.StartsWith($root,[StringComparison]::OrdinalIgnoreCase) }; if ($p) { exit 1 } }"
if errorlevel 1 (
  echo ClipSync.exe is currently running and holds a lock on the output folder.
  echo Quit it from the system tray ^(or run: taskkill /IM ClipSync.exe /F^) and try again.
  exit /b 1
)

"%PYTHON%" -m pip install -r requirements.txt
if exist build-output\windows rmdir /s /q build-output\windows
if exist build-output\windows (
  echo Could not clean build-output\windows. Close any running ClipSync app and any Explorer windows inside that folder, then run this script again.
  exit /b 1
)
if exist ClipSync.spec del /f /q ClipSync.spec

"%PYTHON%" -m PyInstaller ^
  --noconfirm ^
  --clean ^
  --windowed ^
  --name ClipSync ^
  --workpath build-output\windows\_pyinstaller ^
  --distpath build-output\windows ^
  --specpath . ^
  --icon assets\clipsync.ico ^
  --version-file assets\version_info.txt ^
  --add-data "assets\clipsync.ico;assets" ^
  --collect-data customtkinter ^
  --collect-data certifi ^
  app.py
if errorlevel 1 exit /b %errorlevel%

if exist build-output\windows\_pyinstaller rmdir /s /q build-output\windows\_pyinstaller
if exist build-output\windows\_pyinstaller (
  echo Warning: build-output\windows\_pyinstaller could not be removed. Do not run executables from that folder.
)

if not exist build-output\windows\ClipSync\ClipSync.exe (
  echo BUILD FAILED: ClipSync.exe was not produced.
  exit /b 1
)

REM --- package the distributable zip the upload script expects ---------------
if exist build-output\windows\ClipSync.zip del /f /q build-output\windows\ClipSync.zip
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "Get-ChildItem 'build-output\windows\ClipSync' | Compress-Archive -DestinationPath 'build-output\windows\ClipSync.zip' -CompressionLevel Optimal -Force"
if errorlevel 1 (
  echo BUILD FAILED: could not create ClipSync.zip
  exit /b 1
)

REM --- tell the in-app updater about this package (commit latest.json with it)
"%PYTHON%" update_manifest.py windows build-output\windows\ClipSync.zip
if errorlevel 1 (
  echo BUILD FAILED: could not update build-output\latest.json
  exit /b 1
)

REM --- report what was actually produced, so a stale artifact is obvious -----
echo.
echo ---------------------------------------------------------------------
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$e=Get-Item 'build-output\windows\ClipSync\ClipSync.exe'; $z=Get-Item 'build-output\windows\ClipSync.zip';" ^
  "$v=(Get-Item $e.FullName).VersionInfo.FileVersion;" ^
  "Write-Host ('  exe      : {0}  ({1:N2} MB)  v{2}' -f $e.Name, ($e.Length/1MB), $v);" ^
  "Write-Host ('  zip      : {0}  ({1:N2} MB)' -f $z.Name, ($z.Length/1MB));" ^
  "Write-Host ('  built at : {0}' -f $z.LastWriteTime)"
echo ---------------------------------------------------------------------
echo Built Windows app at build-output\windows\ClipSync\ClipSync.exe
echo Publish with: cd ..\website ^&^& npm run upload:downloads windows
echo.

if exist ClipSync.spec del /f /q ClipSync.spec
endlocal
