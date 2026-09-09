# Start FaceMatcher API (Python 3.11 venv)
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\backend

if (-not (Test-Path .\.venv\Scripts\uvicorn.exe)) {
    Write-Host "Virtual env missing. Run setup-backend.ps1 first." -ForegroundColor Red
    exit 1
}

$env:TF_ENABLE_ONEDNN_OPTS = "0"
$env:TF_CPP_MIN_LOG_LEVEL = "2"

Write-Host "Starting FaceMatcher API on http://127.0.0.1:8000 ..." -ForegroundColor Cyan
.\.venv\Scripts\uvicorn.exe main:app --reload --host 127.0.0.1 --port 8000
