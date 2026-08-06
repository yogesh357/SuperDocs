# SuperDocs Analyst Agent - Task 1 (The Analyst That Never Sleeps)

This repository contains the implementation of **Task 1: Build an Agentic System** for the SuperDocs Full-Stack AI Engineer assignment.

It is a stateful agentic system designed to ingest, classify, and audit vendor contracts, amendments, and invoices. It extracts facts, surfaces rate/date conflicts, performs compliance checks, and generates a unified markdown deliverable with precise document citations.

---

## 🏗️ System Architecture

- **Backend**: Python 3.11+ / FastAPI + LangGraph state machine with persistent DB checkpoints.
- **Frontend**: React (Vite) + Tailwind CSS dashboard providing a premium human-in-the-loop review interface.
- **Database**: PostgreSQL with the `pgvector` extension for vector chunk search.
- **Model Interface**: Exposes a standard **FastAPI REST API** and a **Model Context Protocol (MCP)** server.
- **AI Core**: Gemini 1.5 (Pro/Flash) via Google AI Studio's $0 free tier.

---

## ⚡ Quick Start: One Command Setup

To spin up the database, initialize the schemas, install all dependencies, and run the system, simply run the bootstrap script:

### Windows Powershell:
```powershell
# Run the verification and startup script
python bootstrap.py
```

This script will:
1. Verify Python & Node.js environments.
2. Read your `.env` configuration file.
3. Automatically create the database `superdocs_analyst` if it doesn't exist on your Postgres server.
4. Enable the `pgvector` extension.
5. Create all required tables (`runs`, `conflicts`, `findings`, `documents`, etc.).
6. Install backend python packages and frontend npm dependencies.
7. Start both the FastAPI backend and React frontend.

---

## 🔑 Environment Configuration

Create a `.env` file in the root directory (already ignored in `.gitignore`) containing:

```bash
# LLM Provider Keys
GEMINI_API_KEY="your-gemini-api-key"
ANTHROPIC_API_KEY="your-anthropic-api-key" # optional

# Database Connection (with URL-encoded password if special characters exist)
DATABASE_URL="postgresql://postgres:password@localhost:5432/superdocs_analyst"

# SuperDocs Credentials (for Task 2)
SUPERDOCS_API_KEY="your-superdocs-api-key"

# Port Configuration
PORT=8000
HOST="127.0.0.1"
```

---

## 🧪 Running Automated Tests

To verify resilience behaviors (process interrupt & resume, concurrent run safety, and prompt injection guards) without hitting any live API endpoints or spending money, run:

```bash
# Run pytest in the backend virtual environment
backend\.venv\Scripts\pytest backend\tests\test_resilience.py
```

---

## 🛠️ Manual CLI & MCP Interface

To start the system as an **MCP (Model Context Protocol) Server** so external agent clients (like Cursor or Claude Desktop) can drive the audit loop:

```bash
# Run the MCP server over stdio
backend\.venv\Scripts\python backend\app\mcp_server.py
```

### Exposed MCP Tools:
- `start_new_audit`: Triggers a new document ingestion and classification run.
- `check_audit_status`: Returns current logs, stages, and token costs.
- `list_pending_conflicts`: Fetches invoice/rate discrepancies awaiting decision.
- `resolve_conflict_item`: Approves or rejects a billing override.
- `list_pending_compliance_findings`: Fetches rule flags requiring human gating.
- `resolve_compliance_item`: Overrides or rejects compliance flags.
- `resume_paused_audit`: Continues run execution once approvals are complete.
- `get_audit_deliverable`: Returns the final compiled markdown reconciliation brief.
