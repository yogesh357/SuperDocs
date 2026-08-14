# TASK

This project implements two core integration tasks built on top of the SuperDocs API and LangGraph workflow orchestrator.

---

## 📂 Project Architecture

```
SuperDocs-Task/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── documents.py      # Session-scoped document library APIs (Task 1)
│   │   │   ├── runs.py           # LangGraph audit execution & details APIs (Task 1)
│   │   │   └── substitution.py   # SuperDocs REST API substitution router (Task 2)
│   │   ├── agent/
│   │   │   ├── graph.py          # LangGraph state machine config (Task 1)
│   │   │   └── nodes.py          # Real-time state persistence node logic (Task 1)
│   │   ├── models.py             # SQLAlchemy models (Document, Run, SubstitutionRun)
│   │   ├── main.py               # FastAPI server entrypoint
│   │   └── init_db.py            # Self-healing database schema migrations
│   ├── tests/
│   │   ├── mock_task_1/          # Mock Contract/Invoice Files (Task 1)
│   │   ├── mock_substitution/    # Mock Set 1: Ceramic Tiling Files (Task 2)
│   │   ├── mock_substitution_2/  # Mock Set 2: Carpet Tiling Files (Task 2)
│   │   ├── mock_substitution_3/  # Mock Set 3: LED Downlights Files (Task 2)
│   │   ├── test_resilience.py    # Resilience & concurrency test suite (Task 1)
│   │   └── test_substitution.py  # SuperDocs REST offline test suite (Task 2)
│   └── verify_db.py              # Bootstrapper database verification tool
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.jsx               # Navigation bar matching tab states
│   │   │   ├── Sidebar.jsx              # Document list & auditing triggers (Task 1)
│   │   │   └── SubstitutionAuditor.jsx  # Premium dashboard for AEC substitution (Task 2)
│   │   └── App.jsx               # Conditional routing core app layout
```

---

## 🚀 How to Run and Work with the Project

### 1. Prerequisites
Ensure you have Python 3.10+ and Node.js 18+ installed on your system.

### 2. Backend Setup
1. Navigate to the backend directory and activate the virtual environment:
   ```bash
   cd backend
   .venv\Scripts\activate
   ```
2. Populate your `.env` file with either Google AI Studio or OpenRouter credentials:

   **Option A: Google AI Studio (100% Free)**
   ```env
   GEMINI_API_KEY="AIzaSyYourFreeKeyHere"
   SUPERDOCS_API_KEY="sk_your_key_here"
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/superdocs"
   ```

   **Option B: OpenRouter (100% Free Models)**
   Create a free API key at [openrouter.ai](https://openrouter.ai/) (no credit card required) and configure:
   ```env
   OPENROUTER_API_KEY="sk-or-v1-your-openrouter-key-here"
   OPENROUTER_MODEL="google/gemini-2.5-flash:free"
   SUPERDOCS_API_KEY="sk_your_key_here"
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/superdocs"
   ```

### 3. Concurrently Run Backend & Frontend
From the root workspace folder, boot both environments using the bootstrapper:
```bash
python bootstrap.py
```
This launches:
* **FastAPI Backend**: [http://localhost:8000](http://localhost:8000)
* **Vite React Frontend**: [http://localhost:5173](http://localhost:5173)

---

## 🧪 Testing and Verification

### 1. Automated Offline Tests
Verify the resiliency of the database and substitution API integrations completely offline (uses purely in-memory SQLite):
```bash
cd backend
.venv\Scripts\python -m pytest
```

### 2. Manual Testing (Task 1)
1. Navigate to the main Analyst dashboard (**http://localhost:5173/**).
2. Click **Add Document** and upload the mock files found in [backend/tests/mock_task_1/](file:///c:/My-Projects/My-Assignments/SuperDocs-Task/backend/tests/mock_task_1/):
   * `contract_acme_software.txt`
   * `sow_101_acme.txt`
   * `invoice_acme_august.txt`
3. Click **Start Audit Run**. 
4. Watch the agent classify each document, extract metadata facts in real-time, and automatically pause in the `"paused"` state because of the rate discrepancy conflict ($210 invoice rate vs $150 SOW rate).
5. Interactively resolve the conflict in the UI by choosing either the contract or invoice rate, and submit the decision.
6. The agent will resume, evaluate the $200/hr corporate max rate compliance violation, and output the final audit markdown report!

### 3. Manual Testing (Task 2)
1. Switch to the **AEC Substitution** tab in the header.
2. In the left panel, upload any of the three mock test folders located in `backend/tests/`:
   * **Ceramic Tiling** (`mock_substitution/`)
   * **Carpet Tiling** (`mock_substitution_2/`)
   * **LED Downlights** (`mock_substitution_3/`)
3. Click **Analyze Substitution** to watch the SuperDocs AI engine ingest the files, run a line-by-line compliance comparison, draft the architect's response letter, and stage the concurrent edits! Approve to download the Word (.docx) files!
