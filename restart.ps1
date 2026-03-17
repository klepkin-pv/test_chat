# Restart script for Windows PowerShell
#
# Usage:
#   .\restart.ps1          - build frontend, start both (frontend: start, backend: dev)
#   .\restart.ps1 -bf      - build frontend only  -> frontend: start, backend: dev
#   .\restart.ps1 -bb      - build backend only   -> frontend: dev,   backend: start
#   .\restart.ps1 -bfb     - build both           -> frontend: start, backend: start
#   .\restart.ps1 -bbf     - same as -bfb

param(
    [switch]$bf,
    [switch]$bb,
    [switch]$bfb,
    [switch]$bbf
)

$ErrorActionPreference = "SilentlyContinue"
$rootDir = $PSScriptRoot
$envFile = Join-Path $rootDir ".env"
$envMap = @{}

if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        $line = $_.Trim()
        if (-not $line -or $line.StartsWith("#") -or -not $line.Contains("=")) {
            return
        }

        $parts = $line.Split("=", 2)
        $key = $parts[0].Trim()
        $value = $parts[1].Trim().Trim('"')
        $envMap[$key] = $value
    }
}

function Get-ConfigValue([string]$Key, [string]$DefaultValue) {
    if ($envMap.ContainsKey($Key) -and $envMap[$Key]) {
        return $envMap[$Key]
    }

    $envValue = [Environment]::GetEnvironmentVariable($Key)
    if ($envValue) {
        return $envValue
    }

    return $DefaultValue
}

$appProtocol = Get-ConfigValue "APP_PROTOCOL" "http"
$appHost = Get-ConfigValue "APP_HOST" "localhost"
$frontendPort = Get-ConfigValue "FRONTEND_PORT" "5176"
$backendPort = Get-ConfigValue "PORT" "4000"
$nginxPort = Get-ConfigValue "NGINX_PORT" "5175"
$publicOrigin = Get-ConfigValue "PUBLIC_ORIGIN" ""

$buildFront = $bf -or $bfb -or $bbf
$buildBack  = $bb -or $bfb -or $bbf

if (-not $bf -and -not $bb -and -not $bfb -and -not $bbf) {
    $buildFront = $true
}

$frontCmd = if ($buildFront) { "start" } else { "run dev" }
$backCmd  = if ($buildBack)  { "start" } else { "run dev" }
$frontendUrl = "${appProtocol}://${appHost}:${frontendPort}/chat"
$backendUrl = "${appProtocol}://${appHost}:${backendPort}"
$proxyUrl = if ($publicOrigin) { "$publicOrigin/chat" } else { "${appProtocol}://${appHost}:${nginxPort}/chat" }

Write-Host ""
Write-Host "Build frontend : $buildFront  -> npm $frontCmd" -ForegroundColor DarkCyan
Write-Host "Build backend  : $buildBack   -> npm $backCmd" -ForegroundColor DarkCyan
Write-Host ""

function Kill-Port([string]$Port) {
    $connection = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    if ($connection) {
        $connection | ForEach-Object {
            Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
        }
        Write-Host "  Killed process on port $Port" -ForegroundColor DarkYellow
    }
}

Write-Host "=== Stopping existing processes ===" -ForegroundColor Cyan
Kill-Port $backendPort
Kill-Port $frontendPort
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Write-Host "  Killed all node processes" -ForegroundColor DarkYellow
Start-Sleep -Seconds 1

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

Write-Host "=== Starting frontend (npm $frontCmd) ===" -ForegroundColor Cyan
$frontend = Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm $frontCmd" -WorkingDirectory "$rootDir\frontend" -PassThru -NoNewWindow

Write-Host "=== Starting backend (npm $backCmd) ===" -ForegroundColor Cyan
$backend = Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm $backCmd" -WorkingDirectory "$rootDir\backend" -PassThru -NoNewWindow

Start-Sleep -Seconds 2

Write-Host ""
Write-Host "Frontend PID: $($frontend.Id)" -ForegroundColor Green
Write-Host "Backend PID:  $($backend.Id)" -ForegroundColor Green
Write-Host ""
Write-Host "Frontend: $frontendUrl" -ForegroundColor Yellow
Write-Host "Backend:  $backendUrl" -ForegroundColor Yellow
Write-Host "Proxy:    $proxyUrl" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press any key to stop both processes..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

Stop-Process -Id $frontend.Id -Force -ErrorAction SilentlyContinue
Stop-Process -Id $backend.Id -Force -ErrorAction SilentlyContinue
Write-Host "Stopped." -ForegroundColor Red
