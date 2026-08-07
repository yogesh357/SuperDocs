import os
import uuid
import json
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.app.database import Base, get_db
from backend.app.main import app
from backend.app.models import SubstitutionRun

# Setup SQLite test DB in-memory
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="module", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def db_session():
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    yield session
    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()


@patch("backend.app.api.substitution.upload_document_to_superdocs")
@patch("backend.app.api.substitution.upload_attachment_to_superdocs")
@patch("backend.app.api.substitution.initialize_superdocs_session")
def test_substitution_upload_endpoint(mock_init, mock_upload_attach, mock_upload_doc, client, db_session):
    mock_upload_doc.side_effect = ["spec-durable-id", "schedule-durable-id"]
    mock_upload_attach.return_value = "attachment-job-id"
    
    # Mock files to upload
    files = {
        "spec": ("spec.txt", b"Mock specification section 093000 content", "text/plain"),
        "cutsheet": ("cutsheet.txt", b"Mock proposed cutsheet tech data", "text/plain"),
        "schedule": ("schedule.txt", b"Mock finish schedule table", "text/plain")
    }
    
    response = client.post("/api/substitution/upload", files=files)
    assert response.status_code == 200
    data = response.json()
    assert "id" in data
    assert data["status"] == "processing"
    
    # Verify run record in DB
    run_id = data["id"]
    run = db_session.query(SubstitutionRun).filter(SubstitutionRun.id == uuid.UUID(run_id)).first()
    assert run is not None
    assert run.spec_doc_id == "spec-durable-id"
    assert run.schedule_doc_id == "schedule-durable-id"
    assert run.cutsheet_filename == "cutsheet.txt"


@patch("backend.app.api.substitution.requests.post")
@patch("backend.app.api.substitution.requests.get")
def test_execute_analysis_background_task(mock_get, mock_post, db_session):
    # Create an active substitution run in DB
    run = SubstitutionRun(
        id=uuid.uuid4(),
        session_id="mock-session-id",
        status="uploading",
        spec_doc_id="spec-doc-id",
        schedule_doc_id="schedule-doc-id"
    )
    db_session.add(run)
    db_session.commit()
    
    # Mock SuperDocs Chat Async response (returns job_id)
    mock_post_res = MagicMock()
    mock_post_res.ok = True
    mock_post_res.json.return_value = {"job_id": "chat-job-id"}
    mock_post.return_value = mock_post_res
    
    # Mock SuperDocs Job Polling response
    mock_get_res = MagicMock()
    mock_get_res.ok = True
    mock_get_res.json.return_value = {
        "status": "awaiting_approval",
        "reply_text": "Comparison Report text\n\nResponse Letter\nDear Contractor, Substitution Accepted.",
        "metadata": {
            "pending_changes": [
                {
                    "document_id": "spec-doc-id",
                    "chunk_id": "chunk_1",
                    "original": "SpecTile Inc.",
                    "proposed": "TileTech Industries"
                }
            ]
        }
    }
    mock_get.return_value = mock_get_res
    
    # Import and run execution function
    from backend.app.api.substitution import execute_substitution_analysis
    execute_substitution_analysis(str(run.id), db_session)
    
    # Verify updated DB states
    db_session.refresh(run)
    assert run.status == "awaiting_approval"
    assert "Comparison Report text" in run.comparison_report
    assert "Dear Contractor" in run.response_letter
    assert len(run.pending_changes) == 1
    assert run.pending_changes[0]["proposed"] == "TileTech Industries"


@patch("backend.app.api.substitution.requests.post")
@patch("backend.app.api.substitution.requests.get")
def test_substitution_approve_endpoint(mock_get, mock_post, client, db_session):
    # Create run awaiting approval in DB
    run = SubstitutionRun(
        id=uuid.uuid4(),
        session_id="mock-session-id",
        status="awaiting_approval",
        spec_doc_id="spec-doc-id",
        schedule_doc_id="schedule-doc-id"
    )
    db_session.add(run)
    db_session.commit()
    
    # Mock SuperDocs Approve response
    mock_post_res1 = MagicMock()
    mock_post_res1.ok = True
    
    # Mock SuperDocs Export calls (returns binary content)
    mock_post_res2 = MagicMock()
    mock_post_res2.ok = True
    mock_post_res2.content = b"mock-spec-docx-bytes"
    
    mock_post_res3 = MagicMock()
    mock_post_res3.ok = True
    mock_post_res3.content = b"mock-schedule-docx-bytes"
    
    mock_post.side_effect = [mock_post_res1, mock_post_res2, mock_post_res3]
    
    # Mock SuperDocs Job Polling response
    mock_get_res = MagicMock()
    mock_get_res.ok = True
    mock_get_res.json.return_value = {
        "status": "completed",
        "result": {
            "response": "Comparison Report text\n\nResponse Letter\nDear Contractor, Approved."
        }
    }
    mock_get.return_value = mock_get_res
    
    response = client.post(f"/api/substitution/approve/{run.id}")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "approved"
    assert f"/api/substitution/download/updated_spec_{run.id}.docx" in data["spec_download_url"]
    assert f"/api/substitution/download/updated_schedule_{run.id}.docx" in data["schedule_download_url"]
    
    # Verify DB state
    db_session.refresh(run)
    assert run.status == "approved"
