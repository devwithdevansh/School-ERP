<#
.SYNOPSIS
  Automated white-label build factory to produce release Android App Bundles (.aab)
  for Google Play Store from a single Flutter codebase.

.EXAMPLE
  .\build-app.ps1 -App school_connect
  .\build-app.ps1 -App educonnect -AppId "com.schoolerp.educonnect" -Name "EduConnect"
#>

param (
    [Parameter(Mandatory = $true)]
    [string]$App,

    [string]$AppId = "",
    [string]$Name = ""
)

$ErrorActionPreference = "Stop"

$AppDir = Join-Path $PSScriptRoot "apps\$App"
if (-not (Test-Path $AppDir)) {
    Write-Error "App configuration directory not found at: $AppDir"
    exit 1
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  School ERP White-Label AAB Build Factory" -ForegroundColor Cyan
Write-Host "  Target App: $App" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Determine Application ID and App Name
if ($App -eq "school_connect") {
    if (-not $AppId) { $AppId = "com.schoolerp.school_connect" }
    if (-not $Name) { $Name = "School Connect" }
} elseif ($App -eq "educonnect") {
    if (-not $AppId) { $AppId = "com.schoolerp.educonnect" }
    if (-not $Name) { $Name = "EduConnect" }
} else {
    if (-not $AppId) { $AppId = "com.schoolerp.$App" }
    if (-not $Name) { $Name = $App }
}

Write-Host "Configuring package: $AppId" -ForegroundColor Yellow
Write-Host "Configuring title:   $Name" -ForegroundColor Yellow

# 2. Copy App Environment Configuration
$EnvSource = Join-Path $AppDir "app.env"
$EnvDest = Join-Path $PSScriptRoot "assets\config\app.env"
if (Test-Path $EnvSource) {
    Copy-Item $EnvSource $EnvDest -Force
    Write-Host "  ✓ Applied $EnvSource -> assets/config/app.env" -ForegroundColor Green
}

# 3. Copy Google Services if present
$GServices = Join-Path $AppDir "google-services.json"
if (Test-Path $GServices) {
    Copy-Item $GServices (Join-Path $PSScriptRoot "android\app\google-services.json") -Force
    Write-Host "  ✓ Applied google-services.json" -ForegroundColor Green
}

# 4. Generate Launcher Icons if app_icon.png exists
$IconSource = Join-Path $AppDir "app_icon.png"
if (Test-Path $IconSource) {
    Copy-Item $IconSource (Join-Path $PSScriptRoot "assets\images\app_icon.png") -Force
    $IconFgSource = Join-Path $AppDir "app_icon_fg.png"
    if (Test-Path $IconFgSource) {
        Copy-Item $IconFgSource (Join-Path $PSScriptRoot "assets\images\app_icon_fg.png") -Force
    }
    Write-Host "  ✓ Generating launcher icon mipmaps with flutter_launcher_icons..." -ForegroundColor Yellow
    dart run flutter_launcher_icons:main
}

# 5. Build Release AAB Bundle
Write-Host "  ✓ Running flutter build appbundle..." -ForegroundColor Cyan
flutter build appbundle --release `
    "-PschoolAppId=$AppId" `
    "-PschoolAppName=$Name"

# 6. Copy output to dist/
$DistDir = Join-Path $PSScriptRoot "dist"
if (-not (Test-Path $DistDir)) {
    New-Item -ItemType Directory -Force -Path $DistDir | Out-Null
}

$AabSource = Join-Path $PSScriptRoot "build\app\outputs\bundle\release\app-release.aab"
$AabDest = Join-Path $DistDir "$App-release.aab"

if (Test-Path $AabSource) {
    Copy-Item $AabSource $AabDest -Force
    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host "  BUILD SUCCESSFUL!" -ForegroundColor Green
    Write-Host "  Output AAB: $AabDest" -ForegroundColor Green
    Write-Host "  Ready for Google Play Store upload!" -ForegroundColor Green
    Write-Host "==========================================================" -ForegroundColor Green
} else {
    Write-Error "AAB output not found at $AabSource"
    exit 1
}
