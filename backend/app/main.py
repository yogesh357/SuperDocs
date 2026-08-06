import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.api import documents, runs
from backend.app.init_db import init_database
from backend.app.config import settings

# Initialize database on app startup
try:
    init_database()
except Exception as e:
    print(f"Warning: Database initialization failed: {str(e)}")

app = FastAPI(
    title="SuperDocs Analyst Agent - Task 1",
    description="Backend service running stateful LangGraph workflows with human-in-the-loop gates.",
    version="1.0.0"
)

# Set up CORS middleware to allow connections from Vite/React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For local development, allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Register routes
app.include_router(documents.router, prefix="/api")
app.include_router(runs.router, prefix="/api")

@app.get("/")
def read_root():
    return {
        "name": "SuperDocs Analyst Agent API",
        "status": "online",
        "description": "FastAPI + LangGraph backend for document auditing and reconciliation."
    }

if __name__ == "__main__":
    uvicorn.run(
        "backend.app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True
    )
