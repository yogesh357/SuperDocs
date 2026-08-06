import os
import uuid
import shutil
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models import Document
from backend.app.agent.utils import get_file_hash

router = APIRouter(prefix="/documents", tags=["Documents"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("")
def upload_document(file: UploadFile = File(...), db: Session = Depends(get_db)):
    # Validate extension
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".pdf", ".txt"]:
        raise HTTPException(status_code=400, detail="Only PDF and TXT files are supported.")
    
    # Save file temporarily to calculate hash
    temp_path = os.path.join(UPLOAD_DIR, f"temp_{uuid.uuid4()}{ext}")
    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        file_hash = get_file_hash(temp_path)
        
        # Check if hash already exists in DB
        existing = db.query(Document).filter(Document.file_hash == file_hash).first()
        if existing:
            # Clean up temp file
            os.remove(temp_path)
            return {
                "id": str(existing.id),
                "filename": existing.filename,
                "file_type": existing.file_type,
                "status": "already_exists"
            }
            
        # Rename temp file to permanent hash-based filename
        permanent_filename = f"{file_hash}{ext}"
        permanent_path = os.path.join(UPLOAD_DIR, permanent_filename)
        shutil.move(temp_path, permanent_path)
        
        # Create database record
        doc = Document(
            id=uuid.uuid4(),
            filename=file.filename,
            file_type="unknown",  # Will be classified by the agent loop
            file_hash=file_hash,
            file_path=permanent_path
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)
        
        return {
            "id": str(doc.id),
            "filename": doc.filename,
            "file_type": doc.file_type,
            "status": "uploaded"
        }
    except Exception as e:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@router.get("")
def list_documents(db: Session = Depends(get_db)):
    docs = db.query(Document).all()
    return [{
        "id": str(d.id),
        "filename": d.filename,
        "file_type": d.file_type,
        "uploaded_at": d.uploaded_at
    } for d in docs]

@router.delete("/{doc_id}")
def delete_document(doc_id: uuid.UUID, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Remove file from disk if exists
    if os.path.exists(doc.file_path):
        try:
            os.remove(doc.file_path)
        except Exception as e:
            print(f"Failed to delete file from disk: {e}")
            
    db.delete(doc)
    db.commit()
    return {"status": "deleted", "id": str(doc_id)}

@router.delete("")
def clear_all_documents(db: Session = Depends(get_db)):
    docs = db.query(Document).all()
    deleted_count = 0
    for doc in docs:
        if os.path.exists(doc.file_path):
            try:
                os.remove(doc.file_path)
            except Exception as e:
                print(f"Failed to delete file from disk: {e}")
        db.delete(doc)
        deleted_count += 1
    db.commit()
    return {"status": "cleared", "count": deleted_count}
