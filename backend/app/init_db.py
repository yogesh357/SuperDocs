import sys
import os
from sqlalchemy import text

# Add the parent directory to the path so we can import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.app.database import engine, Base
from backend.app.models import Run, RunStage, Document, DocumentChunk, Deliverable, Conflict, ComplianceFinding

def init_database():
    from backend.app.config import settings
    if settings.USE_PGVECTOR:
        with engine.begin() as conn:
            # Create pgvector extension if it doesn't exist
            print("Enabling pgvector extension...")
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
    else:
        print("pgvector bypass enabled (USE_PGVECTOR=false). Skipping pgvector extension creation.")
    
    print("Creating tables...")
    Base.metadata.create_all(bind=engine)
    print("Database initialization completed successfully!")

if __name__ == "__main__":
    init_database()
