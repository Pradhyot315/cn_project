# ZeroEdge-NIDS Startup Script (PowerShell)
# Launches both FastAPI backend and Vite frontend

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Starting ZeroEdge-NIDS Full-Stack Platform" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Verify venv
if (-not (Test-Path "venv\Scripts\uvicorn.exe")) {
    Write-Host "Virtual environment not detected! Run setup first." -ForegroundColor Red
    exit 1
}

# 2. Check if pipeline artifacts exist
if (-not (Test-Path "backend\data\metrics.json")) {
    Write-Host "Pipeline data not found. Running ML pipeline first..." -ForegroundColor Yellow
    .\venv\Scripts\python -m pipeline.run_all
}

# 3. Start Backend in background process
Write-Host "Starting FastAPI Backend on http://localhost:8000..." -ForegroundColor Green
$backendProc = Start-Process -FilePath ".\venv\Scripts\uvicorn.exe" -ArgumentList "backend.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload" -PassThru

# 4. Start Frontend
Write-Host "Starting Vite Frontend on http://localhost:5173..." -ForegroundColor Green
Set-Location "web"
try {
    npm run dev
} finally {
    Set-Location ".."
    if ($backendProc -and -not $backendProc.HasExited) {
        Write-Host "Stopping backend process (PID: $($backendProc.Id))..." -ForegroundColor Yellow
        Stop-Process -Id $backendProc.Id -Force
    }
}
