#!/usr/bin/env bash
# ZeroEdge-NIDS Startup Script (Bash)
# Launches both FastAPI backend and Vite frontend

echo "=========================================================="
echo "  Starting ZeroEdge-NIDS Full-Stack Platform"
echo "=========================================================="

# Check if pipeline data exists
if [ ! -f "backend/data/metrics.json" ]; then
    echo "Pipeline data not found. Running ML pipeline first..."
    ./venv/bin/python -m pipeline.run_all
fi

# Start Backend
echo "Starting FastAPI Backend on http://localhost:8000..."
./venv/bin/uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# Trap cleanup
trap "kill $BACKEND_PID" EXIT

# Start Frontend
echo "Starting Vite Frontend on http://localhost:5173..."
cd web && npm run dev
