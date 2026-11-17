<#
  Packages the PyInstaller output (run build_windows.bat first) as an MSIX.

    .\build_msix.ps1              -> build-output\msix\EverythingClipboard-<ver>-x64.msix (unsigned, for Store upload)
    .\build_msix.ps1 -Register    -> also registers the unpacked layout for a local test (needs Developer Mode)

  The Store signs the package itself, so the Store upload stays unsigned.
  A copy for the website must be signed with a publicly trusted code-signing
  certificate (see msix\README.md); a self-signed one won't install for users.
#>
param([switch]$Register)
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$app = "build-output\windows\ClipSync"
if (-not (Test-Path "$app\ClipSync.exe")) { throw "Run build_windows.bat first: $app\ClipSync.exe is missing." }

# 2.0-rc.7 -> 2.0.7.0 (the Store requires the fourth part to be 0)
$appVersion = (Select-String -Path app.py -Pattern '^APP_VERSION = "(.+)"').Matches[0].Groups[1].Value
if ($appVersion -notmatch '^(\d+)\.(\d+)(?:-rc\.(\d+))?$') { throw "Unexpected APP_VERSION '$appVersion'" }
$build = if ($Matches[3]) { $Matches[3] } else { 0 }
$msixVersion = "$($Matches[1]).$($Matches[2]).$build.0"

$sdk = Get-ChildItem "${env:ProgramFiles(x86)}\Windows Kits\10\bin\10.*\x64\makeappx.exe" | Sort-Object FullName | Select-Object -Last 1
if (-not $sdk) { throw "makeappx.exe not found; install the Windows 10/11 SDK." }

$layout = "build-output\msix\layout"
if (Test-Path $layout) { Remove-Item $layout -Recurse -Force }
New-Item -ItemType Directory -Force $layout | Out-Null
Copy-Item $app "$layout\ClipSync" -Recurse
python msix\make_assets.py "$layout\Assets"
if ($LASTEXITCODE) { throw "Asset generation failed." }
(Get-Content msix\AppxManifest.template.xml -Raw).Replace("__VERSION__", $msixVersion) |
  Set-Content "$layout\AppxManifest.xml" -Encoding utf8

$out = "build-output\msix\EverythingClipboard-$msixVersion-x64.msix"
& $sdk.FullName pack /o /d $layout /p $out
if ($LASTEXITCODE) { throw "makeappx pack failed." }
Write-Host "Built $out ($appVersion -> $msixVersion)"

if ($Register) {
  Add-AppxPackage -Register (Resolve-Path "$layout\AppxManifest.xml")
  Write-Host "Registered the unpacked layout. Remove with: Get-AppxPackage XinolabCorp.EverythingClipboard | Remove-AppxPackage"
}
