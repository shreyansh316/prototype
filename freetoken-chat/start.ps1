# Non-Docker Windows start script
# Run this if you don't have Docker installed.
# Requires: Python 3.10+, Node 18+

Write-Host "=== FreeToken Chat — Windows Start ===" -ForegroundColor Cyan

# ── Copy .env if it doesn't exist ─────────────────────────────────────────────
if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "Created .env from .env.example — edit FREETOKEN_BASE_URL if needed" -ForegroundColor Yellow
}

# ── Load env vars ─────────────────────────────────────────────────────────────
Get-Content ".env" | ForEach-Object {
    if ($_ -match "^([^#][^=]*)=(.*)$") {
        [System.Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim(), "Process")
    }
}

# ── Bridge: create venv + install deps ───────────────────────────────────────
$bridgeDir = "bridge"
$venvDir = "$bridgeDir\.venv"

if (-not (Test-Path $venvDir)) {
    Write-Host "`nSetting up Python virtual environment..." -ForegroundColor Green
    python -m venv $venvDir
}

& "$venvDir\Scripts\pip" install -r "$bridgeDir\requirements.txt" --quiet

# ── Start bridge in background ────────────────────────────────────────────────
Write-Host "`nStarting FastAPI bridge on http://localhost:8080 ..." -ForegroundColor Green
$bridge = Start-Process powershell -ArgumentList @(
    "-NoProfile", "-Command",
    "Set-Location '$bridgeDir'; ..\.venv\Scripts\uvicorn main:app --host 127.0.0.1 --port 8080 --reload"
) -PassThru -WorkingDirectory (Resolve-Path $bridgeDir)

# Wait for bridge to be ready
Write-Host "Waiting for bridge..." -ForegroundColor Gray
$ready = $false
for ($i = 0; $i -lt 20; $i++) {
    Start-Sleep -Milliseconds 500
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:8080/health" -UseBasicParsing -ErrorAction Stop
        if ($r.StatusCode -eq 200) { $ready = $true; break }
    } catch {}
}
if (-not $ready) { Write-Host "Bridge didn't start in time — check bridge logs" -ForegroundColor Red }

# ── Start frontend ────────────────────────────────────────────────────────────
Write-Host "`nStarting Next.js frontend on http://localhost:3000 ..." -ForegroundColor Green
Set-Location frontend
$env:NEXT_PUBLIC_BRIDGE_URL = "http://localhost:8080"
npm run dev

# ── Cleanup on exit ───────────────────────────────────────────────────────────
Stop-Process -Id $bridge.Id -ErrorAction SilentlyContinue
