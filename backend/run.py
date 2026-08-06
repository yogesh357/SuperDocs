import sys
import os
import uvicorn

# Add the parent directory of backend (workspace root) to the python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app.config import settings

if __name__ == "__main__":
    print(f"Starting SuperDocs Analyst Agent Server on {settings.HOST}:{settings.PORT}...")
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True
    )
