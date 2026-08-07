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
    
    # Apply migrations if tables already exist
    print("Applying schema migrations...")
    with engine.begin() as conn:
        try:
            conn.execute(text("ALTER TABLE documents ADD COLUMN IF NOT EXISTS session_id VARCHAR(255);"))
            conn.execute(text("ALTER TABLE runs ADD COLUMN IF NOT EXISTS session_id VARCHAR(255);"))
            conn.execute(text("ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_file_hash_key;"))
            conn.execute(text("ALTER TABLE substitution_runs ADD COLUMN IF NOT EXISTS job_id VARCHAR(255);"))
        except Exception as mig_err:
            print(f"Migration note: {mig_err}")

    print("Creating tables...")
    Base.metadata.create_all(bind=engine)
    
    # Auto-recover/reset any ghost "running" states from previous terminated processes
    print("Recovering database state: resetting ghost run statuses...")
    with engine.begin() as conn:
        conn.execute(text("UPDATE runs SET status = 'failed' WHERE status = 'running';"))
        
    print("Database initialization completed successfully!")

if __name__ == "__main__":
    init_database()
