import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw } from 'lucide-react';

import Header from './components/Header';
import Sidebar from './components/Sidebar';
import RunTracker from './components/RunTracker';
import ConflictResolver from './components/ConflictResolver';
import ComplianceBoard from './components/ComplianceBoard';
import ReconciliationBrief from './components/ReconciliationBrief';
import SubstitutionAuditor from './components/SubstitutionAuditor';

const API_BASE = 'http://localhost:8000/api';

function App() {
  const [documents, setDocuments] = useState([]);
  const [runs, setRuns] = useState([]);
  const [activeRunId, setActiveRunId] = useState(null);
  const [activeRun, setActiveRun] = useState(null);
  const [conflicts, setConflicts] = useState([]);
  const [findings, setFindings] = useState([]);
  const [deliverable, setDeliverable] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [backendStatus, setBackendStatus] = useState('connecting');
  const [activeTab, setActiveTab] = useState('compliance');
  const [sessionId] = useState(() => {
    let sid = sessionStorage.getItem("superdocs_session_id");
    if (!sid) {
      sid = crypto.randomUUID();
      sessionStorage.setItem("superdocs_session_id", sid);
    }
    return sid;
  });
  
  const fileInputRef = useRef(null);
  const pollIntervalRef = useRef(null);

  // Check backend connection and fetch initial data
  useEffect(() => {
    fetch(`${API_BASE}/runs?session_id=${sessionId}`)
      .then(res => {
        if (res.ok) {
          setBackendStatus('connected');
          return res.json();
        }
        throw new Error();
      })
      .then(data => {
        setRuns(data);
        const runningRun = data.find(r => r.status === 'running' || r.status === 'paused');
        if (runningRun) {
          setActiveRunId(runningRun.id);
        }
      })
      .catch(() => setBackendStatus('disconnected'));

    fetchDocuments();
  }, []);

  // Poll active run details
  useEffect(() => {
    if (activeRunId) {
      fetchActiveRunDetails();
      pollIntervalRef.current = setInterval(fetchActiveRunDetails, 2000);
    } else {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      setActiveRun(null);
      setConflicts([]);
      setFindings([]);
      setDeliverable(null);
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [activeRunId]);

  const fetchDocuments = async () => {
    try {
      const res = await fetch(`${API_BASE}/documents?session_id=${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      }
    } catch (e) {
      console.error("Failed to fetch documents", e);
    }
  };

  const fetchActiveRunDetails = async () => {
    if (!activeRunId) return;
    try {
      const res = await fetch(`${API_BASE}/runs/${activeRunId}`);
      if (!res.ok) return;
      const data = await res.json();
      setActiveRun(data);

      if (data.status === 'paused') {
        fetchConflicts();
        fetchFindings();
      } else if (data.status === 'completed') {
        fetchDeliverable();
        fetchDocuments();
        fetchRunsList();
        setActiveRunId(null);
      } else if (data.status === 'failed') {
        fetchRunsList();
        setActiveRunId(null);
      }
    } catch (e) {
      console.error("Error polling run details", e);
    }
  };

  const fetchRunsList = async () => {
    try {
      const res = await fetch(`${API_BASE}/runs?session_id=${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        setRuns(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchConflicts = async () => {
    try {
      const res = await fetch(`${API_BASE}/runs/${activeRunId}/conflicts`);
      if (res.ok) {
        const data = await res.json();
        setConflicts(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchFindings = async () => {
    try {
      const res = await fetch(`${API_BASE}/runs/${activeRunId}/findings`);
      if (res.ok) {
        const data = await res.json();
        setFindings(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDeliverable = async () => {
    try {
      const res = await fetch(`${API_BASE}/runs/${activeRunId}/deliverable`);
      if (res.ok) {
        const data = await res.json();
        setDeliverable(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      uploadFile(files[0]);
    }
  };

  const handleFileChange = (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      uploadFile(files[0]);
    }
  };

  const uploadFile = async (file) => {
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`${API_BASE}/documents?session_id=${sessionId}`, {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        await fetchDocuments();
      } else {
        const err = await res.json();
        alert(`Upload failed: ${err.detail}`);
      }
    } catch (e) {
      alert("Error uploading file.");
    } finally {
      setIsUploading(false);
    }
  };

  const startAudit = async () => {
    if (documents.length === 0) {
      alert("Please upload at least one document first.");
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/runs?session_id=${sessionId}`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setActiveRunId(data.id);
        setDeliverable(null);
        fetchRunsList();
      } else {
        const err = await res.json();
        alert(`Cannot start run: ${err.detail}`);
      }
    } catch (e) {
      alert("Error starting run.");
    }
  };
  
  const deleteDocument = async (docId) => {
    try {
      const res = await fetch(`${API_BASE}/documents/${docId}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchDocuments();
      }
    } catch (e) {
      console.error("Failed to delete document", e);
    }
  };

  const clearAllDocuments = async () => {
    if (!window.confirm("Are you sure you want to clear your entire document library?")) return;
    try {
      const res = await fetch(`${API_BASE}/documents?session_id=${sessionId}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchDocuments();
      }
    } catch (e) {
      console.error("Failed to clear library", e);
    }
  };

  const resolveConflict = async (conflictId, decision) => {
    try {
      const res = await fetch(`${API_BASE}/runs/conflicts/${conflictId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision })
      });
      if (res.ok) {
        setConflicts(prev => prev.map(c => c.id === conflictId ? { ...c, decision } : c));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const resolveFinding = async (findingId, decision) => {
    try {
      const res = await fetch(`${API_BASE}/runs/findings/${findingId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision })
      });
      if (res.ok) {
        setFindings(prev => prev.map(f => f.id === findingId ? { ...f, decision } : f));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleResume = async () => {
    try {
      const res = await fetch(`${API_BASE}/runs/${activeRunId}/resume`, { method: 'POST' });
      if (res.ok) {
        fetchActiveRunDetails();
      } else {
        const err = await res.json();
        alert(`Cannot resume: ${err.detail}`);
      }
    } catch (e) {
      alert("Error resuming run.");
    }
  };

  const getStageStatus = (stageName) => {
    if (!activeRun) return 'pending';
    const stagesOrder = [
      'Document Classification',
      'Fact Extraction',
      'Conflict Auditing',
      'Compliance Audit',
      'Report Compilation'
    ];
    const currentIdx = stagesOrder.indexOf(activeRun.current_stage);
    const targetIdx = stagesOrder.indexOf(stageName);

    const sObj = activeRun.stages.find(s => s.name === stageName);
    if (sObj) return sObj.status;

    if (activeRun.status === 'failed' && currentIdx === targetIdx) return 'failed';
    if (currentIdx > targetIdx) return 'completed';
    if (currentIdx === targetIdx) return activeRun.status === 'paused' ? 'paused' : 'running';
    return 'pending';
  };

  const pendingConflictsCount = conflicts.filter(c => c.decision === 'pending').length;
  const pendingFindingsCount = findings.filter(f => f.decision === 'pending').length;
  const canResume = pendingConflictsCount === 0 && pendingFindingsCount === 0;

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header backendStatus={backendStatus} activeTab={activeTab} setActiveTab={setActiveTab} />

      {activeTab === 'compliance' ? (
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <Sidebar 
            documents={documents}
            isUploading={isUploading}
            fileInputRef={fileInputRef}
            handleDragOver={handleDragOver}
            handleDrop={handleDrop}
            handleFileChange={handleFileChange}
            startAudit={startAudit}
            activeRunId={activeRunId}
            deleteDocument={deleteDocument}
            clearAllDocuments={clearAllDocuments}
          />

          <main className="flex-1 p-8 flex flex-col gap-8 overflow-y-auto bg-primary">
            <RunTracker activeRun={activeRun} getStageStatus={getStageStatus} />

            <ConflictResolver conflicts={conflicts} resolveConflict={resolveConflict} />

            <ComplianceBoard findings={findings} resolveFinding={resolveFinding} />

            {activeRun && activeRun.status === 'paused' && (
              <button 
                className="w-full flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold cursor-pointer transition bg-emerald-600 text-white hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleResume}
                disabled={!canResume}
              >
                <RefreshCw size={14} className={canResume ? "animate-spin" : ""} />
                {canResume 
                  ? 'All Items Decided. Resume Audit Process' 
                  : `Awaiting Decisions (${pendingConflictsCount} conflicts, ${pendingFindingsCount} compliance checks pending)`
                }
              </button>
            )}

            <ReconciliationBrief deliverable={deliverable} formatMarkdown={formatMarkdown} />

            {/* Historical list */}
            {!activeRun && runs.length > 0 && (
              <div className="bg-cardbg border border-borderDark rounded-xl p-6 shadow-md">
                <h3 className="font-display text-sm font-semibold mb-4 text-white">Audit History</h3>
                <div className="flex flex-col gap-2">
                  {runs.map(run => (
                    <div key={run.id} className="flex justify-between items-center p-4 bg-secondary rounded-lg border border-borderDark">
                      <div>
                        <span className="font-semibold text-xs text-white">Run {run.id.substring(0, 8)}...</span>
                        <div className="text-[10px] text-gray-500 mt-1">{new Date(run.created_at).toLocaleString()}</div>
                      </div>
                      <div className="flex gap-4 items-center">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${
                          run.status === 'completed' ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400' : 'bg-red-950/20 border-red-500/30 text-red-400'
                        }`}>
                          {run.status}
                        </span>
                        <button 
                          className="px-3 py-1.5 rounded text-xs font-semibold bg-borderDark text-white border border-borderDark hover:border-border-hover hover:bg-cardbg transition"
                          onClick={() => {
                            setActiveRunId(run.id);
                            setDeliverable(null);
                          }}
                        >
                          Open Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </main>
        </div>
      ) : (
        <SubstitutionAuditor API_BASE={`${API_BASE}/substitution`} formatMarkdown={formatMarkdown} />
      )}
    </div>
  );
}

// Simple markdown conversion helper (handles headers, tables, lists, bold)
function formatMarkdown(markdown) {
  if (!markdown) return "";
  let html = markdown;
  
  html = html.replace(/^# (.*?)$/gm, '<h1>$1</h1>');
  html = html.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
  html = html.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
  
  html = html.replace(/\|(.+?)\|/g, (match) => {
    if (match.includes('---')) return '';
    const cols = match.split('|').filter(c => c.trim()).map(c => `<td>${c.trim()}</td>`).join('');
    return `<tr>${cols}</tr>`;
  });
  html = html.replace(/(<tr>.*?<\/tr>\s*)+/g, '<table>$&</table>');
  
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  html = html.replace(/^\- (.*?)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*?<\/li>\s*)+/g, '<ul>$&</ul>');

  html = html.replace(/\n/g, '<br/>');
  
  return html;
}

export default App;
