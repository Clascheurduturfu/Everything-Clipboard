param(
    [string]$SigningDirectory = (Join-Path $env:USERPROFILE 'Desktop\agent\ClipSync-private\signing'),
    [string[]]$Tasks = @('bundleRelease', 'assembleRelease', 'lintRelease')
)
$ErrorActionPreference = 'Stop'
$names = @('CLIPSYNC_STORE_FILE', 'CLIPSYNC_STORE_PASSWORD', 'CLIPSYNC_KEY_ALIAS', 'CLIPSYNC_KEY_PASSWORD')
$previous = @{}
foreach ($name in $names) { $previous[$name] = [Environment]::GetEnvironmentVariable($name, 'Process') }
try {
    $credential = Import-Clixml -LiteralPath (Join-Path $SigningDirectory 'upload-password.dpapi.xml')
    $env:CLIPSYNC_STORE_FILE = Join-Path $SigningDirectory 'clipsync-upload.jks'
    if (!(Test-Path -LiteralPath $env:CLIPSYNC_STORE_FILE)) { throw 'Upload keystore is missing.' }
    $env:CLIPSYNC_KEY_ALIAS = 'clipsync-upload'
    $env:CLIPSYNC_STORE_PASSWORD = $credential.GetNetworkCredential().Password
    $env:CLIPSYNC_KEY_PASSWORD = $env:CLIPSYNC_STORE_PASSWORD
    Push-Location $PSScriptRoot
    try {
        & .\gradlew.bat --no-daemon @Tasks
        if ($LASTEXITCODE -ne 0) { throw "Gradle failed with exit code $LASTEXITCODE" }
    } finally { Pop-Location }
} finally {
    foreach ($name in $names) { [Environment]::SetEnvironmentVariable($name, $previous[$name], 'Process') }
    $credential = $null
}
