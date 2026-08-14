# SuperDocs Engineering Tasks: Unified Workspace

This repository contains the complete implementation for the SuperDocs Round 2 Engineering Task, containing both **Task 1 (Agentic Document Analysis System)** and **Task 2.1 (Substitution Request and Response Packet)**.

The system is delivered as a unified, stateful full-stack application with a multi-tab dashboard allowing seamless switching between both task flows.

---

## 🏗️ Project Architecture

### 📊 Task 1: Agentic Document Analysis System
* **Purpose**: Ingests, classifies, and reconciles vendor contracts, SOWs, and invoices. Extracts rates/dates, pauses at a human-in-the-loop gate for discrepancies, runs compliance audits, and compiles a grounded report.
* **Tech Stack**: Python 3.11+ / FastAPI + LangGraph state machine with PostgreSQL checkpoint persistence.
* **AI Engine**: Gemini 1.5 (Pro/Flash) via Google AI Studio (or fallback to OpenRouter free models).

### 🛠️ Task 2.1: Substitution Request and Response Packet
* **Purpose**: Compares proposed manufacturer product cutsheets against project specifications and finish schedules. Stages parallel edits to specifications and schedule cell values, pauses for architect review, and exports updated documents.
* **Tech Stack**: FastAPI backend integration + React (Vite) frontend.
* **AI Engine**: SuperDocs REST API (`/v1/sessions/init`, `/v1/chat/async`, `/v1/jobs/commit`, `/v1/documents/export`).

---

## ⚡ Quick Start: One Command Setup

To spin up the database, initialize the schemas, install all dependencies, and run both systems, simply run the bootstrap script:

### Windows Powershell:
```powershell
# Run the verification and startup script
python bootstrap.py
```

This script will automatically:
1. Verify Python & Node.js environments.
2. Read your `.env` configuration file.
3. Create the database `superdocs_analyst` if it doesn't exist on your local Postgres server.
4. Enable the `pgvector` extension.
5. Create all required tables (`runs`, `conflicts`, `findings`, `documents`, `substitution_runs`).
6. Install backend python packages and frontend npm dependencies.
7. Start both the FastAPI backend (`http://localhost:8000`) and React frontend (`http://localhost:5173`).

---

## 🔑 Environment Configuration

Create a `.env` file in the root directory (ignored in `.gitignore`) containing:

```bash
# Task 1: LLM Keys (Configure either Gemini or OpenRouter)
GEMINI_API_KEY="your-gemini-api-key"
OPENROUTER_API_KEY="your-openrouter-api-key" # fallback gateway
OPENROUTER_MODEL="google/gemini-2.0-flash-exp:free" # active free model

# Task 1: Database URL
DATABASE_URL="postgresql://postgres:password@localhost:5432/superdocs_analyst"

# Task 2.1: SuperDocs Credentials
SUPERDOCS_API_KEY="your-superdocs-api-key"

# Port Configuration
PORT=8000
HOST="127.0.0.1"
```

---

## 🧪 Running Automated Tests

To verify Task 1's resilience behaviors (process interrupt & resume, concurrent run safety, and prompt injection guards) fully offline without hitting live APIs:

```bash
# Run pytest in the backend virtual environment
backend\.venv\Scripts\pytest
```

---

## 🛠️ Manual CLI & MCP Interface (Task 1)

To start the Analyst system as an **MCP (Model Context Protocol) Server** so external agent clients (like Cursor or Claude Desktop) can drive the audit loop:

```bash
# Run the MCP server over stdio
backend\.venv\Scripts\python backend\app\mcp_server.py
```

### Exposed MCP Tools:
* `start_new_audit`: Triggers a new document ingestion and classification run.
* `check_audit_status`: Returns current logs, stages, and token costs.
* `list_pending_conflicts`: Fetches invoice/rate discrepancies awaiting decision.
* `resolve_conflict_item`: Approves or rejects a billing override.
* `list_pending_compliance_findings`: Fetches rule flags requiring human gating.
* `resolve_compliance_item`: Overrides or rejects compliance flags.
* `resume_paused_audit`: Continues run execution once approvals are complete.
* `get_audit_deliverable`: Returns the final compiled markdown reconciliation brief.

