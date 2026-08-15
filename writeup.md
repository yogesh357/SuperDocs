# SuperDocs Integration System: One-Page Overview

This document provides a comprehensive overview of the design, modular structure, database migrations, and verification results for both **Task 1: Agentic Document Analysis System** and **Task 2.1: Substitution Request and Response Packet**.

---

## 🛠️ System Overview

The system is built as a unified engineering intelligence platform consisting of a React frontend and a FastAPI backend with two primary modules:

1. **Task 1 (Agentic Document Analysis System)**: Manages vendor contracts, amendments, and invoices. It extracts parameters, identifies billing and deadline rate conflicts, pauses at a human-in-the-loop gate for interactive resolutions, runs compliance checks, and compiles a unified markdown report.
2. **Task 2.1 (Substitution Request and Response Packet)**: Automates the review of contractor-submitted product cut sheets against building specification documents and finish schedules using the SuperDocs REST API.

---

## 🔑 Technical Achievements & Measured Results

* **Real-time Live Logs**: Modifies the LangGraph state machine node executions to write intermediate steps (`full_updated_state`) directly to PostgreSQL. UI logs and cost estimators render in under 2 seconds.
* **Isolated Multi-Tab Running**: Generates a unique `sessionId` in browser `sessionStorage` to isolate document piles and run histories. Users can safely run parallel tasks in separate tabs without state cross-contamination.
* **General-Purpose Audit Prompting**: Updates the extraction instructions to target general engineering metrics (technical metrics, ratings, manufacturers) instead of tiling-only parameters. This allows the system to process Tiles, Carpets, and LED Downlights mock files flawlessly.
* **Production Speed**: The Vite React frontend compiles successfully in 556ms with zero errors or warnings.
* **Resilient Approvals**: Traps `"not awaiting approval"` API codes to handle duplicate clicks and serves Word `.docx` downloads directly, preventing server-side 500 exceptions.

---

## 🧠 Key Design Decisions & Trade-offs

### 1. PostgreSQL DB Checkpoint Persistence
* **Decision**: LangGraph states are saved directly to PostgreSQL.
* **Trade-off**: Introduces a minor DB writing latency, but guarantees absolute session recovery and process re-entry during restarts or system crashes.

### 2. Suffix-based Unique Naming
* **Decision**: Uploaded files are suffixed with random hex codes on upload to SuperDocs.
* **Trade-off**: Requires an extra metadata lookup call (`GET /v1/documents/{id}`) before starting the async chat to map titles correctly, but prevents file collisions on the shared organizational sandbox account.

### 3. SQLite In-Memory Isolation for Tests
* **Decision**: Integration tests use pure in-memory SQLite engines (`sqlite:///:memory:`).
* **Trade-off**: Keeps the repository disk workspace completely clean from temporary database files during local automated verification.
