@echo off
setlocal
rem Project-local Google CLI launcher; does not change PowerShell execution policy.
set "EWA_CLOUDSDK_ROOT=%~dp0..\.cache\google-cloud-tools\cli-587\google-cloud-sdk"
if not exist "%EWA_CLOUDSDK_ROOT%\bin\gcloud.cmd" (
  echo Google Cloud CLI is missing. See docs/google-cloud-setup.md.
  exit /b 1
)
set "CLOUDSDK_CONFIG=%~dp0..\.local\credentials\gcloud"
set "CLOUDSDK_CORE_DISABLE_USAGE_REPORTING=true"
if not exist "%CLOUDSDK_CONFIG%" mkdir "%CLOUDSDK_CONFIG%"
if not exist "%CLOUDSDK_CONFIG%" (
  echo Could not create the local credential directory.
  exit /b 1
)
call "%EWA_CLOUDSDK_ROOT%\bin\gcloud.cmd" %*
exit /b %errorlevel%
