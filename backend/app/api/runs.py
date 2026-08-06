import uuid
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from backend.app.database import get_db, SessionLocal
from backend.app.models import Run, RunStage, Conflict, ComplianceFinding, Deliverable, Document
from backend.app.agent.graph import agent_graph

router = APIRouter(prefix="/runs", tags=["Runs"])

def run_agent_graph(run_id: str):
    db: Session = SessionLocal()
    try:
        run = db.query(Run).filter(Run.id == uuid.UUID(run_id)).first()
        if not run:
            return
        
        # Load all documents
        docs = db.query(Document).all()
        doc_list = [{
            "id": str(d.id),
            "filename": d.filename,
            "file_type": d.file_type,
            "file_path": d.file_path
        } for d in docs]
        
        # Load active state
        initial_state = run.graph_state if run.graph_state else {
            "run_id": run_id,
            "documents": doc_list,
            "new_documents": [],
            "extracted_facts": {},
            "conflicts": [],
            "findings": [],
            "deliverable_markdown": "",
            "current_stage": "Document Classification",
            "logs": [f"Run {run_id} started."],
            "errors": [],
            "conflicts_resolved": False,
            "findings_reviewed": False,
            "token_usage": {},
            "cost_usd": 0.0
        }
        
        # Run graph
        final_state = agent_graph.invoke(initial_state)
        
        # Reload run and update details
        run = db.query(Run).filter(Run.id == uuid.UUID(run_id)).first()
        if run:
            run.graph_state = final_state
            
            # Read database to see if we have pending conflicts/findings
            pending_confs = db.query(Conflict).filter(
                Conflict.run_id == uuid.UUID(run_id), 
                Conflict.human_decision == "pending"
            ).count()
            
            pending_finds = db.query(ComplianceFinding).filter(
                ComplianceFinding.run_id == uuid.UUID(run_id), 
                ComplianceFinding.human_decision == "pending"
            ).count()
            
            if pending_confs > 0 or pending_finds > 0:
                run.status = "paused"
            else:
                run.status = "completed"
                
            db.add(run)
            db.commit()
            
    except Exception as e:
        print(f"Agent graph execution failed: {str(e)}")
        run = db.query(Run).filter(Run.id == uuid.UUID(run_id)).first()
        if run:
            run.status = "failed"
            db.add(run)
            db.commit()
    finally:
        db.close()

@router.post("")
def start_run(background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    run = Run(
        id=uuid.uuid4(),
        status="running",
        current_stage="Document Classification",
        graph_state=None
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    
    # Start graph execution in background thread
    background_tasks.add_task(run_agent_graph, str(run.id))
    
    return {
        "id": str(run.id),
        "status": run.status,
        "current_stage": run.current_stage
    }

@router.get("")
def list_runs(db: Session = Depends(get_db)):
    runs = db.query(Run).order_by(Run.created_at.desc()).all()
    return [{
        "id": str(r.id),
        "status": r.status,
        "current_stage": r.current_stage,
        "created_at": r.created_at
    } for r in runs]

@router.get("/{run_id}")
def get_run_details(run_id: uuid.UUID, db: Session = Depends(get_db)):
    run = db.query(Run).filter(Run.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found.")
        
    stages = db.query(RunStage).filter(RunStage.run_id == run_id).order_by(RunStage.completed_at.asc()).all()
    
    # Extract logs and cost from state
    logs = []
    cost_usd = 0.0
    if run.graph_state:
        logs = run.graph_state.get("logs", [])
        cost_usd = run.graph_state.get("cost_usd", 0.0)
        
    return {
        "id": str(run.id),
        "status": run.status,
        "current_stage": run.current_stage,
        "cost_usd": cost_usd,
        "stages": [{
            "name": s.name,
            "status": s.status,
            "latency": s.latency_seconds,
            "cost": s.token_cost_usd
        } for s in stages],
        "logs": logs,
        "created_at": run.created_at
    }

@router.post("/{run_id}/resume")
def resume_run(run_id: uuid.UUID, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    run = db.query(Run).filter(Run.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found.")
        
    if run.status != "paused":
        raise HTTPException(status_code=400, detail="Only paused runs can be resumed.")
        
    # Check if there are any remaining pending approvals
    pending_confs = db.query(Conflict).filter(
        Conflict.run_id == run_id, 
        Conflict.human_decision == "pending"
    ).count()
    
    pending_finds = db.query(ComplianceFinding).filter(
        ComplianceFinding.run_id == run_id, 
        ComplianceFinding.human_decision == "pending"
    ).count()
    
    if pending_confs > 0 or pending_finds > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot resume. Still have {pending_confs} pending conflicts and {pending_finds} pending compliance checks."
        )
        
    # Update run status to running
    run.status = "running"
    db.add(run)
    db.commit()
    
    # Start graph execution in background thread to resume
    background_tasks.add_task(run_agent_graph, str(run.id))
    
    return {
        "id": str(run.id),
        "status": run.status,
        "current_stage": run.current_stage
    }

# --- Conflicts endpoints ---

@router.get("/{run_id}/conflicts")
def get_run_conflicts(run_id: uuid.UUID, db: Session = Depends(get_db)):
    confs = db.query(Conflict).filter(Conflict.run_id == run_id).all()
    return [{
        "id": str(c.id),
        "conflict_description": c.conflict_description,
        "expected_value": c.expected_value,
        "actual_value": c.actual_value,
        "decision": c.human_decision
    } for c in confs]

@router.post("/conflicts/{conflict_id}/resolve")
def resolve_conflict(conflict_id: uuid.UUID, body: dict, db: Session = Depends(get_db)):
    decision = body.get("decision")
    if decision not in ["approved", "rejected"]:
        raise HTTPException(status_code=400, detail="Decision must be 'approved' or 'rejected'.")
        
    conf = db.query(Conflict).filter(Conflict.id == conflict_id).first()
    if not conf:
        raise HTTPException(status_code=404, detail="Conflict not found.")
        
    conf.human_decision = decision
    db.add(conf)
    db.commit()
    
    return {"id": str(conf.id), "status": conf.human_decision}

# --- Findings endpoints ---

@router.get("/{run_id}/findings")
def get_run_findings(run_id: uuid.UUID, db: Session = Depends(get_db)):
    finds = db.query(ComplianceFinding).filter(ComplianceFinding.run_id == run_id).all()
    return [{
        "id": str(f.id),
        "rule_name": f.rule_name,
        "rule_description": f.rule_description,
        "status": f.status,
        "details": f.details,
        "citation": f.citation_reference,
        "decision": f.human_decision
    } for f in finds]

@router.post("/findings/{finding_id}/resolve")
def resolve_finding(finding_id: uuid.UUID, body: dict, db: Session = Depends(get_db)):
    decision = body.get("decision")
    if decision not in ["approved", "rejected"]:
        raise HTTPException(status_code=400, detail="Decision must be 'approved' or 'rejected'.")
        
    find = db.query(ComplianceFinding).filter(ComplianceFinding.id == finding_id).first()
    if not find:
        raise HTTPException(status_code=404, detail="Finding not found.")
        
    find.human_decision = decision
    db.add(find)
    db.commit()
    
    return {"id": str(find.id), "status": find.human_decision}

# --- Deliverables endpoints ---

@router.get("/{run_id}/deliverable")
def get_run_deliverable(run_id: uuid.UUID, db: Session = Depends(get_db)):
    deliv = db.query(Deliverable).filter(Deliverable.run_id == run_id).order_by(Deliverable.created_at.desc()).first()
    if not deliv:
        raise HTTPException(status_code=404, detail="Deliverable not found.")
        
    return {
        "id": str(deliv.id),
        "content_markdown": deliv.content_markdown,
        "citations": deliv.citations,
        "is_committed": deliv.is_committed
    }
