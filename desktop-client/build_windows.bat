@echo off
setlocal
cd /d "%~dp0"

python -m pip install -r requirements.txt
python -m PyInstaller ^
  --noconfirm ^
  --clean ^
  --windowed ^
  --name ClipSync ^
  --icon assets\clipsync.ico ^
  --version-file assets\version_info.txt ^
  --add-data "assets\clipsync.ico;assets" ^
  app.py

echo.
echo Built Windows app at dist\ClipSync\ClipSync.exe
endlocal
