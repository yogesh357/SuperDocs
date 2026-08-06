from langgraph.graph import StateGraph, END
from backend.app.agent.state import AgentState
from backend.app.agent.nodes import (
    classify_documents_node,
    extract_facts_node,
    check_conflicts_node,
    check_compliance_node,
    generate_deliverable_node
)

def route_after_conflicts(state: AgentState) -> str:
    """Decide whether to pause for human conflict resolution or proceed."""
    if not state.get("conflicts_resolved", True):
        # We have unresolved conflicts, pause execution here
        return "pause"
    return "compliance"

def route_after_compliance(state: AgentState) -> str:
    """Decide whether to pause for compliance review or proceed to compilation."""
    if not state.get("findings_reviewed", True):
        # We have compliance findings requiring review, pause execution
        return "pause"
    return "compile"

def create_agent_graph():
    # Initialize state graph
    workflow = StateGraph(AgentState)

    # Add nodes
    workflow.add_node("classify", classify_documents_node)
    workflow.add_node("extract_facts", extract_facts_node)
    workflow.add_node("check_conflicts", check_conflicts_node)
    workflow.add_node("check_compliance", check_compliance_node)
    workflow.add_node("generate_deliverable", generate_deliverable_node)

    # Set entry point
    workflow.set_entry_point("classify")

    # Add linear edges
    workflow.add_edge("classify", "extract_facts")
    workflow.add_edge("extract_facts", "check_conflicts")

    # Add conditional edge after conflict checks
    workflow.add_conditional_edges(
        "check_conflicts",
        route_after_conflicts,
        {
            "pause": END,
            "compliance": "check_compliance"
        }
    )

    # Add conditional edge after compliance checks
    workflow.add_conditional_edges(
        "check_compliance",
        route_after_compliance,
        {
            "pause": END,
            "compile": "generate_deliverable"
        }
    )

    workflow.add_edge("generate_deliverable", END)

    # Compile the graph
    # (Note: We use our PostgreSQL database directly to checkpoint runs in nodes,
    # making execution fully resumeable from any stage, which satisfies behavior 2).
    return workflow.compile()

agent_graph = create_agent_graph()
