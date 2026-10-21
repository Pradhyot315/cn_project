"""
FastAPI application entrypoint for ZeroEdge-NIDS.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routes import router
from backend.experiment_routes import experiment_router

app = FastAPI(
    title="ZeroEdge-NIDS API",
    description="Backend API and Telemetry Service for ZeroEdge-NIDS edge simulation platform",
    version="1.0.0"
)

# Enable CORS for Vite frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
app.include_router(experiment_router)

@app.get("/")
def read_root():
    return {
        "project": "ZeroEdge-NIDS",
        "role": "Edge NIDS Simulation & Profiling Backend",
        "docs_url": "/docs",
        "status": "online"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
