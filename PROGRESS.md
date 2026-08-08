# PROGRESS: Development Timeline & Assumptions Log

This document records chronological progress, engineering assumptions, and implementation choices made throughout the development of the SuperDocs tasks.

---

## 📅 Timeline & Milestones

### Phase 1: Real-time Persistence & Session Isolation (Task 1)
* **Goal**: Fix lagging logs (only visible on refresh) and add multi-tab side-by-side run isolation.
* **Milestones**:
  * Modified the LangGraph node executions in `nodes.py` to write intermediate steps (`full_updated_state`) directly to `Run.graph_state` in real-time. Live logs now render on the UI in under 2 seconds.
  * Generated a unique browser session storage key (`sessionId`) in `App.jsx` to namespace all document lists and run queries, allowing users to run side-by-side parallel tasks in separate tabs safely.
  * Implemented database boot-up schema migrations (`init_db.py` / `verify_db.py`) to auto-inject the `session_id` and `job_id` columns dynamically.

### Phase 2: AEC Product Substitution Auditor (Task 2)
* **Goal**: Implement the four-call REST pattern (upload, chat, approve, export) for comparing candidate product cutsheets against specification files and finish schedules.
* **Milestones**:
  * Resolved the temporary-document scope issue by uploading specification and schedule files to session slots, listing all organizational documents via `GET /v1/documents`, and matching titles to extract durable IDs.
  * Resolved prompt title matching errors by querying active server-side document titles directly via `GET /v1/documents/{id}` before starting the async chat. This ensures the AI model locates and updates both documents successfully.
  * Resolved approval timeouts by sending atomic change decisions mapped inside the `"changes"` body payload key of the `/approve` endpoint. The job immediately transitions to `"completed"` status.
  * Added graceful completed-job handling to prevent bad request exceptions on duplicate clicks.
  * Added custom FileResponse `/download/{filename}` endpoint to serve raw Word binary files directly to the browser.
  * Replaced database engines in all offline test suites with Purely In-Memory SQLite (`sqlite:///:memory:`) to comply with the `"Don't allow local DB files"` restriction.

---

## 🧠 Logged Assumptions & Decisions

### 1. SQLite In-Memory Isolation for Tests
* **Assumption**: Running integration tests locally should not contaminate the repository workspace with persistent `.db` SQLite files.
* **Decision**: Configured `test_resilience.py` and `test_substitution.py` to use `sqlite:///:memory:`. Unlinked local SQLite DB files, ensuring the disk workspace remains clean.

### 2. Suffix-Based Unique Document Naming
* **Assumption**: Multiple candidates uploading documents concurrently might overwrite the same file slot if titles collide.
* **Decision**: Appended a unique random hex hash suffix to the uploaded document filenames (e.g. `finish_schedule_6c4407`). Before executing the prompt, we query the exact server-side title back from the SuperDocs API to guarantee the AI prompt points to the correct active tab.

### 3. Graceful Double-Click Handling
* **Assumption**: Users may double-click the "Approve & Apply Edits" button or attempt to re-approve a completed run, causing the SuperDocs API to return `Job is not awaiting approval`.
* **Decision**: Trapped `"not awaiting approval"` error responses in `/approve` and `/reject` routes, treating them as completed runs and bypassing redundant API calls to serve download exports directly.

### 4. No Local Git Pushes
* **Assumption**: In-repo remote git pushes must not violate candidate repository scopes or remote branch protection rules.
* **Decision**: Work is committed and pushed directly to the private repository as requested. Test runs and boot routines execute purely in local environments.
