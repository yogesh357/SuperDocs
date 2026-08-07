import sys
import os
from sqlalchemy import create_engine, text
from sqlalchemy.engine import URL

# Add the parent directory to the path so we can import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app.config import settings
from backend.app.database import Base
from backend.app.models import Run, RunStage, Document, DocumentChunk, Deliverable, Conflict, ComplianceFinding

def bootstrap_database():
    print("Parsing database URL...")
    # Extract connection parameters from DATABASE_URL
    # Standard format: postgresql://username:password@host:port/dbname
    db_url = settings.DATABASE_URL
    
    # We will connect to the default 'postgres' database to check/create our target database
    # Let's replace the database name in the connection string with 'postgres'
    if "/" in db_url.split("://")[1]:
        base_url, db_name = db_url.rsplit("/", 1)
        # Handle query parameters if present
        if "?" in db_name:
            db_name, query = db_name.split("?", 1)
            postgres_url = f"{base_url}/postgres?{query}"
        else:
            postgres_url = f"{base_url}/postgres"
    else:
        db_name = "superdocs_analyst"
        postgres_url = f"{db_url}/postgres"

    print(f"Connecting to administrative database at: {postgres_url.split('@')[-1]}")
    admin_engine = create_engine(postgres_url, isolation_level="AUTOCOMMIT")
    
    try:
        with admin_engine.connect() as conn:
            # Check if database exists
            result = conn.execute(text(f"SELECT 1 FROM pg_database WHERE datname = '{db_name}'"))
            exists = result.scalar()
            
            if not exists:
                print(f"Database '{db_name}' does not exist. Creating database...")
                conn.execute(text(f"CREATE DATABASE {db_name}"))
                print(f"Database '{db_name}' successfully created.")
            else:
                print(f"Database '{db_name}' already exists.")
    except Exception as e:
        print(f"Failed checking/creating database: {str(e)}")
        print("Will attempt direct initialization on default URL...")
    finally:
        admin_engine.dispose()

    # Now connect to the actual database and create the pgvector extension + tables
    print(f"Connecting to target database: {db_name}")
    target_engine = create_engine(db_url)
    try:
        if settings.USE_PGVECTOR:
            with target_engine.begin() as conn:
                print("Enabling pgvector extension...")
                conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
        else:
            print("pgvector bypass enabled (USE_PGVECTOR=false). Skipping pgvector extension creation.")
            
        # Apply migrations if tables already exist
        print("Applying schema migrations...")
        with target_engine.begin() as conn:
            try:
                conn.execute(text("ALTER TABLE documents ADD COLUMN IF NOT EXISTS session_id VARCHAR(255);"))
                conn.execute(text("ALTER TABLE runs ADD COLUMN IF NOT EXISTS session_id VARCHAR(255);"))
                conn.execute(text("ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_file_hash_key;"))
                conn.execute(text("ALTER TABLE substitution_runs ADD COLUMN IF NOT EXISTS job_id VARCHAR(255);"))
            except Exception as mig_err:
                print(f"Migration note: {mig_err}")
                
        print("Creating all tables...")
        Base.metadata.create_all(bind=target_engine)
        print("Database bootstrap completed successfully!")
    except Exception as e:
        print(f"Error during table initialization: {str(e)}")
        sys.exit(1)
    finally:
        target_engine.dispose()

if __name__ == "__main__":
    bootstrap_database()
