$ErrorActionPreference = 'Stop'
$cloudRoot = Split-Path -Parent $PSScriptRoot
$cloudTools = Join-Path $cloudRoot '.cache/google-cloud-tools'
$cloudArchive = Join-Path $cloudTools 'gcloud-587.zip'
$cloudInstall = Join-Path $cloudTools 'cli-587'
$cloudExe = Join-Path $cloudInstall 'google-cloud-sdk/bin/gcloud.cmd'
$cloudReady = Join-Path $cloudInstall 'verified-install.txt'
$cloudExpectedHash = '1eeb072422a032eaa4aa4748ba5e954906f9bf3edede2b8f0b25837ad77fe3c5'

if (!(Test-Path -LiteralPath $cloudExe) -or !(Test-Path -LiteralPath $cloudReady)) {
    New-Item -ItemType Directory -Path $cloudTools -Force | Out-Null
    if (!(Test-Path -LiteralPath $cloudArchive) -or (Get-FileHash -LiteralPath $cloudArchive -Algorithm SHA256).Hash -ne $cloudExpectedHash) {
        & curl.exe --fail --location --continue-at - --connect-timeout 30 --max-time 600 --output $cloudArchive 'https://dl.google.com/dl/cloudsdk/channels/rapid/downloads/google-cloud-sdk-587.0.0-windows-x86_64-bundled-python.zip'
        if ($LASTEXITCODE -ne 0) { throw 'CLI download incomplete. Run this script again to resume.' }
    }
    if ((Get-FileHash -LiteralPath $cloudArchive -Algorithm SHA256).Hash -ne $cloudExpectedHash) {
        throw 'Google Cloud CLI archive checksum mismatch. Archive was not executed.'
    }
    Expand-Archive -LiteralPath $cloudArchive -DestinationPath $cloudInstall -Force
}
& (Join-Path $PSScriptRoot 'google-cloud-cli.ps1') --version
if ($LASTEXITCODE -ne 0) { throw 'Google Cloud CLI verification failed.' }
'Google Cloud CLI 587 archive verified and version command succeeded.' | Set-Content -LiteralPath $cloudReady
