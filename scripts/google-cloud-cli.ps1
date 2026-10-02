# Run the portable Google CLI with project-local, ignored credential storage.
$cloudRoot = Split-Path -Parent $PSScriptRoot
$cloudExe = Join-Path $cloudRoot '.cache/google-cloud-tools/cli-587/google-cloud-sdk/bin/gcloud.cmd'
if (!(Test-Path -LiteralPath $cloudExe)) { throw 'Run scripts/google-cloud-install.ps1 first.' }
$cloudPreviousConfig = $env:CLOUDSDK_CONFIG
$cloudPreviousReporting = $env:CLOUDSDK_CORE_DISABLE_USAGE_REPORTING
try {
    $env:CLOUDSDK_CONFIG = Join-Path $cloudRoot '.local/credentials/gcloud'
    $env:CLOUDSDK_CORE_DISABLE_USAGE_REPORTING = 'true'
    New-Item -ItemType Directory -Path $env:CLOUDSDK_CONFIG -Force | Out-Null
    & $cloudExe @args
    $cloudExitCode = $LASTEXITCODE
} finally {
    $env:CLOUDSDK_CONFIG = $cloudPreviousConfig
    $env:CLOUDSDK_CORE_DISABLE_USAGE_REPORTING = $cloudPreviousReporting
}
exit $cloudExitCode
