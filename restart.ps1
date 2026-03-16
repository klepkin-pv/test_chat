# Restart script for Windows PowerShell
#
# Usage:
#   .\restart.ps1          — build frontend, start both (frontend: start, backend: dev)
#   .\restart.ps1 -bf      — build frontend only  → frontend: start, backend: dev
#   .\restart.ps1 -bb      — build backend only   → frontend: dev,   backend: start
#   .\restart.ps1 -bfb     — build both           → frontend: start, backend: start
#   .\restart.ps1 -bbf     — same as -bfb

param(
    [switch]$bf,   # build frontend
    [switch]$bb,   # build backend
    [switch]$bfb,  # build both (frontend + backend)
    [switch]$bbf   # build both (backend + frontend, alias)
)

$ErrorActionPreference = "SilentlyContinue"
$rootDir = $PSScriptRoot

# Resolve what to build
$buildFront = $bf -or $bfb -or $bbf
$buildBack  = $bb -or $bfb -or $bbf

# Default (no flags) = build frontend
if (-not $bf -and -not $bb -and -not $bfb -and -not $bbf) {
    $buildFront = $true
}

$frontCmd = if ($buildFront) { "start" } else { "run dev" }
$backCmd  = if ($buildBack)  { "start" } else { "run dev" }

Write-Host ""
Write-Host "Build frontend : $buildFront  → npm $frontCmd" -ForegroundColor DarkCyan
Write-Host "Build backend  : $buildBack   → npm $backCmd"  -ForegroundColor DarkCyan
Write-Host ""

function Kill-Port($port) {
    $conn = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($conn) {
        $conn | ForEach-Object {
            Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
        }
        Write-Host "  Killed process on port $port" -ForegroundColor DarkYellow
    }
}

# Kill existing processes
Write-Host "=== Stopping existing processes ===" -ForegroundColor Cyan
Kill-Port 4000
Kill-Port 3000
Kill-Port 5176
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Write-Host "  Killed all node processes" -ForegroundColor DarkYellow
Start-Sleep -Seconds 1

# Build frontend
if ($buildFront) {
    Write-Host "=== Building frontend ===" -ForegroundColor Cyan
    Push-Location "$rootDir\frontend"
    & npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Frontend build failed!" -ForegroundColor Red
        Pop-Location
        exit 1
    }
    Pop-Location
}

# Build backend
if ($buildBack) {
    Write-Host "=== Building backend ===" -ForegroundColor Cyan
    Push-Location "$rootDir\backend"
    & npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Backend build failed!" -ForegroundColor Red
        Pop-Location
        exit 1
    }
    Pop-Location
}

# Start frontend
Write-Host "=== Starting frontend (npm $frontCmd) ===" -ForegroundColor Cyan
$frontend = Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm $frontCmd" -WorkingDirectory "$rootDir\frontend" -PassThru -NoNewWindow

# Start backend
Write-Host "=== Starting backend (npm $backCmd) ===" -ForegroundColor Cyan
$backend = Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm $backCmd" -WorkingDirectory "$rootDir\backend" -PassThru -NoNewWindow

Start-Sleep -Seconds 2

Write-Host ""
Write-Host "Frontend PID: $($frontend.Id)" -ForegroundColor Green
Write-Host "Backend PID:  $($backend.Id)"  -ForegroundColor Green
Write-Host ""
Write-Host "Frontend: http://localhost:5176" -ForegroundColor Yellow
Write-Host "Backend:  http://localhost:4000" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press any key to stop both processes..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

Stop-Process -Id $frontend.Id -Force -ErrorAction SilentlyContinue
Stop-Process -Id $backend.Id  -Force -ErrorAction SilentlyContinue
Write-Host "Stopped." -ForegroundColor Red
