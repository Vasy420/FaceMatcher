# Start FaceMatcher frontend (Vite)
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\frontend

if (-not (Test-Path .\node_modules)) {
    Write-Host "Installing npm packages..." -ForegroundColor Yellow
    npm install
}

Write-Host "Starting FaceMatcher UI on http://127.0.0.1:5173 ..." -ForegroundColor Cyan
npm run dev -- --host 127.0.0.1 --port 5173
