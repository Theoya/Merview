# Mermaid Viewer — One-command installer for Windows
# Run: irm https://raw.githubusercontent.com/RocketAnabasis/Mermaid-Viewer/main/install.ps1 | iex
# Or:  powershell -ExecutionPolicy Bypass -File install.ps1

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=== Mermaid Viewer Setup ===" -ForegroundColor Cyan
Write-Host ""

# Check prerequisites
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Node.js is required. Install from https://nodejs.org" -ForegroundColor Red
    Write-Host "  Or: winget install OpenJS.NodeJS.LTS" -ForegroundColor Yellow
    exit 1
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Git is required. Install from https://git-scm.com" -ForegroundColor Red
    Write-Host "  Or: winget install Git.Git" -ForegroundColor Yellow
    exit 1
}

$installDir = "$env:LOCALAPPDATA\mermaid-viewer"

# Clone or update
if (Test-Path "$installDir\.git") {
    Write-Host "[1/4] Updating..." -ForegroundColor Green
    git -C $installDir pull --quiet
} else {
    Write-Host "[1/4] Downloading..." -ForegroundColor Green
    if (Test-Path $installDir) { Remove-Item $installDir -Recurse -Force }
    git clone --depth 1 https://github.com/RocketAnabasis/Mermaid-Viewer.git $installDir
}

Push-Location $installDir
try {
    # Install deps
    Write-Host "[2/4] Installing dependencies..." -ForegroundColor Green
    npm install --silent 2>$null

    # Build
    Write-Host "[3/4] Building..." -ForegroundColor Green
    npm run build:prod 2>$null

    # Install globally (adds merview to PATH)
    Write-Host "[4/4] Installing merview to PATH..." -ForegroundColor Green
    npm install -g . 2>$null
} finally {
    Pop-Location
}

# Verify
$merview = Get-Command merview -ErrorAction SilentlyContinue
if ($merview) {
    Write-Host ""
    Write-Host "Done! merview is installed." -ForegroundColor Green
    Write-Host ""
    Write-Host "  Usage:" -ForegroundColor Cyan
    Write-Host "    merview diagram.mermaid            # open in Electron"
    Write-Host "    merview diagram.mermaid --browser   # open in browser"
    Write-Host "    merview README.md                   # extract mermaid from markdown"
    Write-Host "    merview                             # standalone app"
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "Installed, but 'merview' not found on PATH." -ForegroundColor Yellow
    Write-Host "You may need to restart your terminal." -ForegroundColor Yellow
}
