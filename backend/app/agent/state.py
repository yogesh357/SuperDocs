from typing import List, Dict, Any, TypedDict, Optional

class AgentState(TypedDict):
    run_id: str
    documents: List[Dict[str, Any]]
    new_documents: List[Dict[str, Any]]
    extracted_facts: Dict[str, Any]
    conflicts: List[Dict[str, Any]]
    findings: List[Dict[str, Any]]
    deliverable_markdown: str
    current_stage: str
    logs: List[str]
    errors: List[str]
    # For handling human input
    conflicts_resolved: bool
    findings_reviewed: bool
    # To log token usage & cost (Behavior 10)
    token_usage: Dict[str, int]
    cost_usd: float
