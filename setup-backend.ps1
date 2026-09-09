# One-time backend setup for Windows (Python 3.11 + dlib wheel)
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\backend

$pyCandidates = @(
    "$env:LOCALAPPDATA\Programs\Python\Python311\python.exe",
    "C:\Program Files\Python311\python.exe",
    "python"
)

$py = $null
foreach ($c in $pyCandidates) {
    if ($c -eq "python") {
        try {
            $ver = & python -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')" 2>$null
            if ($ver -eq "3.11") { $py = "python"; break }
        } catch {}
    } elseif (Test-Path $c) {
        $py = $c
        break
    }
}

if (-not $py) {
    Write-Host "Python 3.11 not found. Install it from https://www.python.org/downloads/release/python-3119/" -ForegroundColor Red
    Write-Host "Then re-run this script." -ForegroundColor Red
    exit 1
}

Write-Host "Using: $py" -ForegroundColor Cyan
& $py -m venv .venv
& .\.venv\Scripts\python.exe -m pip install --upgrade pip
if (Test-Path .\dlib-19.24.1-cp311-cp311-win_amd64.whl) {
    & .\.venv\Scripts\python.exe -m pip install .\dlib-19.24.1-cp311-cp311-win_amd64.whl
}
& .\.venv\Scripts\python.exe -m pip install -r requirements.txt

Write-Host ""
Write-Host "Backend ready. Start with: .\start-backend.ps1" -ForegroundColor Green
