import uuid
from mcp.server.fastmcp import FastMCP
from sqlalchemy.orm import Session

from backend.app.database import SessionLocal
from backend.app.models import Run, Conflict, ComplianceFinding, Deliverable, Document
from backend.app.api.runs import start_run, resume_run

# Initialize FastMCP Server
mcp = FastMCP("SuperDocs Analyst")

@mcp.tool()
def list_uploaded_documents() -> str:
    """List all source documents in the watched library."""
    db: Session = SessionLocal()
    try:
        docs = db.query(Document).all()
        if not docs:
            return "No documents uploaded yet."
        
        result = "Uploaded Documents:\n"
        for doc in docs:
            result += f"- [{doc.id}] {doc.filename} (Type: {doc.file_type}, Uploaded: {doc.uploaded_at})\n"
        return result
    finally:
        db.close()

@mcp.tool()
def start_new_audit() -> str:
    """Trigger a new document classification, auditing, and reconciliation run."""
    # We mock background tasks for FastMCP standard tools execution
    class MockBackgroundTasks:
        def add_task(self, func, *args, **kwargs):
            import threading
            thread = threading.Thread(target=func, args=args, kwargs=kwargs)
            thread.start()
            
    db: Session = SessionLocal()
    try:
        bg = MockBackgroundTasks()
        res = start_run(background_tasks=bg, db=db)
        return f"Audit run successfully started. Run ID: {res['id']}. Current Status: {res['status']}"
    except Exception as e:
        return f"Failed to start audit run: {str(e)}"
    finally:
        db.close()

@mcp.tool()
def check_audit_status(run_id: str) -> str:
    """
    Get the real-time execution status of an audit run, including progress stages, cost, and logs.
    """
    db: Session = SessionLocal()
    try:
        run_uuid = uuid.UUID(run_id)
        run = db.query(Run).filter(Run.id == run_uuid).first()
        if not run:
            return f"Run {run_id} not found."
            
        logs = []
        cost = 0.0
        if run.graph_state:
            logs = run.graph_state.get("logs", [])
            cost = run.graph_state.get("cost_usd", 0.0)
            
        result = f"Run ID: {run.id}\nStatus: {run.status}\nCurrent Stage: {run.current_stage}\nTotal LLM Cost: ${cost:.5f}\n\nStages Executed:\n"
        from backend.app.models import RunStage
        stages = db.query(RunStage).filter(RunStage.run_id == run_uuid).all()
        for s in stages:
            result += f"- {s.name}: {s.status} (Latency: {s.latency_seconds:.2f}s, Cost: ${s.token_cost_usd:.5f})\n"
            
        result += "\nExecution Logs:\n"
        for log in logs[-15:]:  # show last 15 logs
            result += f"  {log}\n"
            
        return result
    except Exception as e:
        return f"Error checking run status: {str(e)}"
    finally:
        db.close()

@mcp.tool()
def list_pending_conflicts(run_id: str) -> str:
    """List all document rate or date conflicts surfaced during the run that require human approval."""
    db: Session = SessionLocal()
    try:
        run_uuid = uuid.UUID(run_id)
        confs = db.query(Conflict).filter(Conflict.run_id == run_uuid).all()
        if not confs:
            return f"No conflicts found for run {run_id}."
            
        result = f"Conflicts for Run {run_id}:\n"
        for c in confs:
            result += (
                f"- Conflict ID: {c.id}\n"
                f"  Description: {c.conflict_description}\n"
                f"  Expected (Contract): {c.expected_value}\n"
                f"  Actual (Invoice): {c.actual_value}\n"
                f"  Decision Status: {c.human_decision}\n\n"
            )
        return result
    except Exception as e:
        return f"Error listing conflicts: {str(e)}"
    finally:
        db.close()

@mcp.tool()
def resolve_conflict_item(conflict_id: str, decision: str) -> str:
    """
    Resolve a specific conflict.
    decision: Must be either 'approved' (accept the invoice value override) or 'rejected' (keep contract value).
    """
    db: Session = SessionLocal()
    try:
        conflict_uuid = uuid.UUID(conflict_id)
        if decision not in ["approved", "rejected"]:
            return "Error: decision must be 'approved' or 'rejected'."
            
        conf = db.query(Conflict).filter(Conflict.id == conflict_uuid).first()
        if not conf:
            return f"Conflict {conflict_id} not found."
            
        conf.human_decision = decision
        db.add(conf)
        db.commit()
        return f"Conflict {conflict_id} resolved with decision: {decision}."
    except Exception as e:
        return f"Error resolving conflict: {str(e)}"
    finally:
        db.close()

@mcp.tool()
def list_pending_compliance_findings(run_id: str) -> str:
    """List all compliance playbook rules flags that require review."""
    db: Session = SessionLocal()
    try:
        run_uuid = uuid.UUID(run_id)
        finds = db.query(ComplianceFinding).filter(ComplianceFinding.run_id == run_uuid).all()
        if not finds:
            return f"No compliance findings found for run {run_id}."
            
        result = f"Compliance Findings for Run {run_id}:\n"
        for f in finds:
            result += (
                f"- Finding ID: {f.id}\n"
                f"  Rule: {f.rule_name}\n"
                f"  Description: {f.rule_description}\n"
                f"  Status: {f.status}\n"
                f"  Details: {f.details}\n"
                f"  Citation: {f.citation_reference}\n"
                f"  Review Decision: {f.human_decision}\n\n"
            )
        return result
    except Exception as e:
        return f"Error listing compliance findings: {str(e)}"
    finally:
        db.close()

@mcp.tool()
def resolve_compliance_item(finding_id: str, decision: str) -> str:
    """
    Approve or reject a compliance flag.
    decision: 'approved' (grant exception/override) or 'rejected' (block/require correction).
    """
    db: Session = SessionLocal()
    try:
        finding_uuid = uuid.UUID(finding_id)
        if decision not in ["approved", "rejected"]:
            return "Error: decision must be 'approved' or 'rejected'."
            
        find = db.query(ComplianceFinding).filter(ComplianceFinding.id == finding_uuid).first()
        if not find:
            return f"Finding {finding_id} not found."
            
        find.human_decision = decision
        db.add(find)
        db.commit()
        return f"Compliance Finding {finding_id} reviewed with decision: {decision}."
    except Exception as e:
        return f"Error resolving finding: {str(e)}"
    finally:
        db.close()

@mcp.tool()
def resume_paused_audit(run_id: str) -> str:
    """Resume the analysis run after you have resolved all pending conflicts and compliance findings."""
    class MockBackgroundTasks:
        def add_task(self, func, *args, **kwargs):
            import threading
            thread = threading.Thread(target=func, args=args, kwargs=kwargs)
            thread.start()
            
    db: Session = SessionLocal()
    try:
        bg = MockBackgroundTasks()
        run_uuid = uuid.UUID(run_id)
        res = resume_run(run_id=run_uuid, background_tasks=bg, db=db)
        return f"Resume command successfully sent. Run ID: {res['id']}. Current Status: {res['status']}"
    except Exception as e:
        return f"Failed to resume run: {str(e)}"
    finally:
        db.close()

@mcp.tool()
def get_audit_deliverable(run_id: str) -> str:
    """Fetch the final compiled contract brief and invoice reconciliation markdown report."""
    db: Session = SessionLocal()
    try:
        run_uuid = uuid.UUID(run_id)
        deliv = db.query(Deliverable).filter(Deliverable.run_id == run_uuid).order_by(Deliverable.created_at.desc()).first()
        if not deliv:
            return f"No deliverable generated yet for run {run_id}. The run may be active or paused."
            
        result = f"=== AUDIT REPORT (Run ID: {run_id}) ===\n\n{deliv.content_markdown}\n\n=== END OF REPORT ==="
        return result
    except Exception as e:
        return f"Error fetching deliverable: {str(e)}"
    finally:
        db.close()

if __name__ == "__main__":
    mcp.run()
