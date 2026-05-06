@echo off
setlocal
cd /d "%~dp0"

python -m pip install -r requirements.txt
if exist build-output\windows rmdir /s /q build-output\windows
if exist build-output\windows (
  echo Could not clean build-output\windows. Close any running ClipSync app and any Explorer windows inside that folder, then run this script again.
  exit /b 1
)
if exist ClipSync.spec del /f /q ClipSync.spec

python -m PyInstaller ^
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
  app.py
if errorlevel 1 exit /b %errorlevel%

if exist build-output\windows\_pyinstaller rmdir /s /q build-output\windows\_pyinstaller
if exist build-output\windows\_pyinstaller (
  echo Warning: build-output\windows\_pyinstaller could not be removed. Do not run executables from that folder.
)

echo.
echo Built Windows app at build-output\windows\ClipSync\ClipSync.exe
if exist ClipSync.spec del /f /q ClipSync.spec
endlocal
