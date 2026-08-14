import React, { useState, useEffect, useRef } from 'react';
import { Upload, CheckCircle2, AlertTriangle, HelpCircle, FileText, ArrowRight, Download, RefreshCw, X } from 'lucide-react';

export default function SubstitutionAuditor({ API_BASE, formatMarkdown }) {
  const [specFile, setSpecFile] = useState(null);
  const [cutsheetFile, setCutsheetFile] = useState(null);
  const [scheduleFile, setScheduleFile] = useState(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [runs, setRuns] = useState([]);
  const [activeRunId, setActiveRunId] = useState(null);
  const [activeRun, setActiveRun] = useState(null);
  const [downloadUrls, setDownloadUrls] = useState(null);
  
  const pollIntervalRef = useRef(null);

  // Fetch runs list on mount
  useEffect(() => {
    fetchRunsList();
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  // Poll details of active run
  useEffect(() => {
    if (activeRunId) {
      fetchRunDetails();
      pollIntervalRef.current = setInterval(fetchRunDetails, 2000);
    } else {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      setActiveRun(null);
      setDownloadUrls(null);
    }
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [activeRunId]);

  const fetchRunsList = async () => {
    try {
      const res = await fetch(`${API_BASE}/runs`);
      if (res.ok) {
        const data = await res.json();
        setRuns(data);
      }
    } catch (e) {
      console.error("Failed to fetch runs list", e);
    }
  };

  const fetchRunDetails = async () => {
    if (!activeRunId) return;
    try {
      const res = await fetch(`${API_BASE}/runs/${activeRunId}`);
      if (res.ok) {
        const data = await res.json();
        setActiveRun(data);
        if (['awaiting_approval', 'approved', 'rejected', 'failed'].includes(data.status)) {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
          }
        }
      }
    } catch (e) {
      console.error("Error polling substitution run details", e);
    }
  };

  const handleStartAnalysis = async () => {
    if (!specFile || !cutsheetFile || !scheduleFile) {
      alert("Please select all three required documents first.");
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('spec', specFile);
    formData.append('cutsheet', cutsheetFile);
    formData.append('schedule', scheduleFile);

    try {
      const res = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setActiveRunId(data.id);
        fetchRunsList();
      } else {
        const err = await res.json();
        alert(`Analysis failed to start: ${err.detail}`);
      }
    } catch (e) {
      alert("Error uploading files to backend.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleApprove = async () => {
    if (!activeRunId) return;
    setIsCommitting(true);
    try {
      const res = await fetch(`${API_BASE}/approve/${activeRunId}`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setDownloadUrls({
          spec: data.spec_download_url,
          schedule: data.schedule_download_url
        });
        fetchRunDetails();
        fetchRunsList();
      } else {
        const err = await res.json();
        alert(`Approval failed: ${err.detail}`);
      }
    } catch (e) {
      alert("Error sending approval request.");
    } finally {
      setIsCommitting(false);
    }
  };

  const handleReject = async () => {
    if (!activeRunId) return;
    if (!window.confirm("Are you sure you want to reject this substitution? This will discard all staged changes.")) return;
    setIsCommitting(true);
    try {
      const res = await fetch(`${API_BASE}/reject/${activeRunId}`, { method: 'POST' });
      if (res.ok) {
        fetchRunDetails();
        fetchRunsList();
      } else {
        const err = await res.json();
        alert(`Rejection failed: ${err.detail}`);
      }
    } catch (e) {
      alert("Error sending rejection request.");
    } finally {
      setIsCommitting(false);
    }
  };

  const renderStatusBadge = (status) => {
    const styles = {
      uploading: 'bg-blue-950/30 border border-blue-500/30 text-blue-400',
      analyzing: 'bg-amber-950/30 border border-amber-500/30 text-amber-400 animate-pulse',
      awaiting_approval: 'bg-purple-950/30 border border-purple-500/30 text-purple-400 status-pulse-anim',
      approved: 'bg-emerald-950/30 border border-emerald-500/30 text-emerald-400',
      rejected: 'bg-rose-950/30 border border-rose-500/30 text-rose-400',
      failed: 'bg-red-950/30 border border-red-500/30 text-red-400'
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${styles[status] || 'bg-gray-800 text-gray-400'}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* Sidebar: Files Upload & Audit History */}
      <aside className="w-80 bg-secondary border-r border-borderDark p-6 flex flex-col gap-6 h-full overflow-hidden">
        {/* Upload Form */}
        <div className="bg-cardbg border border-borderDark rounded-xl p-6 shadow-md">
          <h3 className="font-display text-sm font-semibold mb-4 text-white flex items-center gap-2">
            <Upload size={16} className="text-accentGold" /> Ingest Documents
          </h3>
          
          <div className="flex flex-col gap-4">
            {/* Specification Upload */}
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-gray-500 mb-1.5">1. Specification Section</label>
              <div className="flex items-center gap-2">
                <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-secondary border border-borderDark rounded-lg text-xs font-medium text-gray-400 hover:text-white cursor-pointer hover:border-border-hover transition">
                  <FileText size={14} />
                  <span className="truncate max-w-[120px]">{specFile ? specFile.name : 'Select File'}</span>
                  <input type="file" onChange={(e) => setSpecFile(e.target.files[0])} className="hidden" />
                </label>
                {specFile && <button onClick={() => setSpecFile(null)} className="text-gray-500 hover:text-white"><X size={14} /></button>}
              </div>
            </div>

            {/* Proposed Cutsheet Upload */}
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-gray-500 mb-1.5">2. Proposed Cutsheet</label>
              <div className="flex items-center gap-2">
                <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-secondary border border-borderDark rounded-lg text-xs font-medium text-gray-400 hover:text-white cursor-pointer hover:border-border-hover transition">
                  <FileText size={14} />
                  <span className="truncate max-w-[120px]">{cutsheetFile ? cutsheetFile.name : 'Select File'}</span>
                  <input type="file" onChange={(e) => setCutsheetFile(e.target.files[0])} className="hidden" />
                </label>
                {cutsheetFile && <button onClick={() => setCutsheetFile(null)} className="text-gray-500 hover:text-white"><X size={14} /></button>}
              </div>
            </div>

            {/* Finish Schedule Upload */}
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-gray-500 mb-1.5">3. Finish Schedule</label>
              <div className="flex items-center gap-2">
                <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-secondary border border-borderDark rounded-lg text-xs font-medium text-gray-400 hover:text-white cursor-pointer hover:border-border-hover transition">
                  <FileText size={14} />
                  <span className="truncate max-w-[120px]">{scheduleFile ? scheduleFile.name : 'Select File'}</span>
                  <input type="file" onChange={(e) => setScheduleFile(e.target.files[0])} className="hidden" />
                </label>
                {scheduleFile && <button onClick={() => setScheduleFile(null)} className="text-gray-500 hover:text-white"><X size={14} /></button>}
              </div>
            </div>

            <button
              onClick={handleStartAnalysis}
              disabled={isUploading || !specFile || !cutsheetFile || !scheduleFile || activeRunId}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-lg text-xs font-semibold cursor-pointer transition bg-accentGold text-secondary hover:brightness-110 disabled:opacity-30 disabled:cursor-not-allowed mt-2"
            >
              {isUploading ? <RefreshCw size={14} className="animate-spin" /> : 'Analyze Substitution'}
            </button>
          </div>
        </div>

        {/* Prior Audits History */}
        <div className="flex-1 flex flex-col min-h-0 bg-cardbg border border-borderDark rounded-xl p-6 shadow-md overflow-hidden">
          <h3 className="font-display text-sm font-semibold mb-4 text-white">Audits History</h3>
          <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-1">
            {runs.length === 0 ? (
              <div className="text-center text-xs text-gray-500 py-8">No audits recorded yet.</div>
            ) : (
              runs.map((r) => (
                <div key={r.id} className="p-3 bg-secondary border border-borderDark rounded-lg flex flex-col gap-2 transition hover:border-border-hover">
                  <div className="flex justify-between items-start gap-1">
                    <span className="text-[10px] font-mono text-gray-400 truncate max-w-[100px]">ID: {r.id.substring(0, 8)}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-bold border border-borderDark bg-cardbg text-gray-400 uppercase">{r.status}</span>
                  </div>
                  <div className="text-[10px] text-gray-400 truncate"><b>Spec:</b> {r.spec_filename}</div>
                  <div className="text-[10px] text-gray-400 truncate"><b>Sheet:</b> {r.cutsheet_filename}</div>
                  <button
                    onClick={() => setActiveRunId(r.id)}
                    className="w-full text-center py-1.5 bg-cardbg hover:bg-borderDark border border-borderDark rounded text-[10px] text-gray-300 transition"
                  >
                    Open Details
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </aside>

      {/* Main Panel */}
      <main className="flex-1 p-8 flex flex-col gap-8 overflow-y-auto bg-primary">
        {!activeRun ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-cardbg border border-borderDark rounded-2xl max-w-4xl mx-auto my-12 shadow-xl">
            <FileText size={64} className="text-gray-500 mb-6" />
            <h2 className="font-display text-2xl font-bold text-white mb-2">AEC Product Substitution Auditor</h2>
            <p className="text-sm text-gray-400 max-w-md mb-8">
              Analyze contractor product substitutions by comparing alternative manufacturer cut sheets against master specification sections. Update schedules and specs together upon architect approval.
            </p>
            <div className="flex items-center gap-4 bg-secondary border border-borderDark rounded-xl p-4 text-xs text-gray-400 text-left max-w-md">
              <Upload className="text-accentGold w-6 h-6 shrink-0" />
              <span>To get started, select your Specification Section, Contractor Cutsheet, and project Finish Schedule in the sidebar and click <b>Analyze Substitution</b>.</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {/* Header / Active Run Status Banner */}
            <div className="bg-cardbg border border-borderDark rounded-2xl p-6 shadow-md flex justify-between items-center">
              <div>
                <span className="text-[10px] font-mono text-gray-500">RUN: {activeRun.id}</span>
                <h2 className="font-display text-xl font-bold text-white mt-1">Substitution Audit Process</h2>
              </div>
              <div className="flex items-center gap-4">
                {renderStatusBadge(activeRun.status)}
                {activeRunId && (
                  <button 
                    onClick={() => setActiveRunId(null)} 
                    className="px-3 py-1.5 border border-borderDark bg-secondary rounded-lg text-xs font-semibold text-gray-400 hover:text-white cursor-pointer transition"
                  >
                    Close Run
                  </button>
                )}
              </div>
            </div>

            {/* Stages Tracker */}
            <div className="bg-cardbg border border-borderDark rounded-2xl p-6 shadow-md">
              <h3 className="font-display text-sm font-semibold mb-4 text-white">Process Tracker</h3>
              
              <div className="grid grid-cols-5 gap-4">
                {[
                  { name: '1. File Upload', status: activeRun.status === 'uploading' ? 'active' : 'completed' },
                  { name: '2. Ingest & Parse', status: activeRun.status === 'uploading' ? 'pending' : (activeRun.status === 'analyzing' ? 'active' : 'completed') },
                  { name: '3. Technical Compare', status: ['uploading', 'analyzing'].includes(activeRun.status) ? 'pending' : (activeRun.status === 'awaiting_approval' ? 'active' : 'completed') },
                  { name: '4. Decision Gate', status: ['approved', 'rejected', 'failed'].includes(activeRun.status) ? 'completed' : (activeRun.status === 'awaiting_approval' ? 'active' : 'pending') },
                  { name: '5. Document Export', status: activeRun.status === 'approved' ? 'completed' : 'pending' }
                ].map((st, i) => (
                  <div key={i} className={`p-4 rounded-xl border flex flex-col gap-1 transition ${
                    st.status === 'completed' 
                      ? 'bg-emerald-950/10 border-emerald-500/20 text-emerald-400' 
                      : (st.status === 'active' 
                        ? 'bg-accentGold/10 border-accentGold/40 text-accentGold status-pulse-anim' 
                        : 'bg-secondary border-borderDark text-gray-500')
                  }`}>
                    <span className="text-[10px] uppercase font-bold tracking-wider opacity-60">{st.status}</span>
                    <span className="text-xs font-semibold">{st.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Stage: Loading/Analyzing Spinner */}
            {activeRun.status === 'analyzing' && (
              <div className="flex flex-col items-center justify-center p-16 bg-cardbg border border-borderDark rounded-2xl text-center">
                <RefreshCw className="animate-spin text-accentGold w-12 h-12 mb-4" />
                <h3 className="text-white font-semibold text-sm">SuperDocs Agent Engine is comparing specifications...</h3>
                <p className="text-xs text-gray-500 mt-2 max-w-sm">Comparing requirements line-by-line against cut-sheet specs. Please wait, this may take up to 30-60 seconds.</p>
              </div>
            )}

            {/* Stage: Review Dashboard (Awaiting Approval / Completed) */}
            {['awaiting_approval', 'approved', 'rejected'].includes(activeRun.status) && (
              <>
                {/* Comparison Report Table */}
                {activeRun.comparison_report && (
                  <div className="bg-cardbg border border-borderDark rounded-2xl p-6 shadow-md">
                    <h3 className="font-display text-sm font-semibold mb-4 text-white">Line-By-Line Technical Comparison</h3>
                    <div 
                      className="markdown-body text-sm text-gray-300 table-autostyle-class"
                      dangerouslySetInnerHTML={{ __html: formatMarkdown(activeRun.comparison_report) }}
                    />
                  </div>
                )}

                {/* Letter Draft & Actions */}
                <div className="grid grid-cols-2 gap-8">
                  {/* Response Letter Draft */}
                  {activeRun.response_letter && (
                    <div className="bg-cardbg border border-borderDark rounded-2xl p-6 shadow-md flex flex-col">
                      <h3 className="font-display text-sm font-semibold mb-4 text-white">Architect's Draft Response</h3>
                      <div className="flex-1 bg-secondary border border-borderDark rounded-xl p-5 font-serif text-xs leading-relaxed text-gray-400 max-h-[350px] overflow-y-auto whitespace-pre-line">
                        {activeRun.response_letter}
                      </div>
                    </div>
                  )}

                  {/* Decision Box */}
                  <div className="bg-cardbg border border-borderDark rounded-2xl p-6 shadow-md flex flex-col justify-center gap-6">
                    <h3 className="font-display text-sm font-semibold text-white">Audit Decision Gate</h3>
                    
                    {activeRun.status === 'awaiting_approval' ? (
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-3 bg-secondary border border-borderDark rounded-xl p-4 text-xs text-gray-400">
                          <AlertTriangle className="text-purple-400 w-5 h-5 shrink-0" />
                          <span>Review the technical comparison table. If requirements are met and you accept the substitution, click <b>Approve & Apply Edits</b> to update files.</span>
                        </div>
                        <div className="flex gap-4">
                          <button
                            onClick={handleApprove}
                            disabled={isCommitting}
                            className="flex-1 py-3 bg-emerald-600 hover:brightness-110 text-white rounded-lg text-sm font-semibold cursor-pointer transition disabled:opacity-50"
                          >
                            {isCommitting ? 'Applying Edits...' : 'Approve & Apply Edits'}
                          </button>
                          <button
                            onClick={handleReject}
                            disabled={isCommitting}
                            className="flex-1 py-3 bg-rose-600 hover:brightness-110 text-white rounded-lg text-sm font-semibold cursor-pointer transition disabled:opacity-50"
                          >
                            Reject & Discard
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-4 items-center text-center">
                        {activeRun.status === 'approved' ? (
                          <>
                            <CheckCircle2 className="text-emerald-400 w-16 h-16 mb-2" />
                            <h4 className="text-white font-bold text-base">Substitution Request Accepted</h4>
                            <p className="text-xs text-gray-500 max-w-xs">The spec sheets and finish schedule have been updated in parallel in the active session.</p>
                            
                            {downloadUrls ? (
                              <div className="flex flex-col gap-3 w-full mt-4">
                                <a 
                                  href={downloadUrls.spec}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:brightness-110 text-white rounded-lg text-xs font-semibold transition"
                                >
                                  <Download size={14} /> Download Updated Specification (.docx)
                                </a>
                                <a 
                                  href={downloadUrls.schedule}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="w-full flex items-center justify-center gap-2 py-3 bg-secondary hover:bg-borderDark border border-borderDark text-gray-300 rounded-lg text-xs font-semibold transition"
                                >
                                  <Download size={14} /> Download Updated Finish Schedule (.docx)
                                </a>
                              </div>
                            ) : (
                              <p className="text-xs text-gray-500 mt-2">Generating download packages...</p>
                            )}
                          </>
                        ) : (
                          <>
                            <X className="text-rose-400 w-16 h-16 border border-rose-500/20 bg-rose-950/20 rounded-full p-2 mb-2" />
                            <h4 className="text-white font-bold text-base">Substitution Request Rejected</h4>
                            <p className="text-xs text-gray-400 max-w-xs">Staged changes discarded. The Specification Section and Finish Schedule remain unchanged.</p>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Staged Document Diffs */}
                {activeRun.pending_changes && activeRun.pending_changes.length > 0 && (
                  <div className="bg-cardbg border border-borderDark rounded-2xl p-6 shadow-md">
                    <h3 className="font-display text-sm font-semibold mb-4 text-white">Staged Document Changes</h3>
                    <div className="flex flex-col gap-4">
                      {activeRun.pending_changes.map((ch, i) => (
                        <div key={i} className="bg-secondary border border-borderDark rounded-xl p-4 flex flex-col gap-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-semibold text-accentGold flex items-center gap-2">
                              <FileText size={14} /> Document slot: {ch.document_id || 'Primary Spec'}
                            </span>
                            <span className="text-[10px] font-mono text-gray-500">Chunk: {ch.chunk_id}</span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 mt-2">
                            {/* Original */}
                            <div className="bg-cardbg/50 border border-borderDark p-3 rounded-lg flex flex-col">
                              <span className="text-[9px] uppercase font-bold tracking-wider text-gray-500 mb-1">Original Text</span>
                              <div 
                                className="text-xs text-gray-500 line-through leading-relaxed whitespace-pre-wrap"
                                dangerouslySetInnerHTML={{ __html: ch.original_html || ch.original || ch.old_html || ch.old }}
                              />
                            </div>
                            {/* Proposed / Changed */}
                            <div className="bg-emerald-950/10 border border-emerald-500/10 p-3 rounded-lg flex flex-col">
                              <span className="text-[9px] uppercase font-bold tracking-wider text-emerald-500 mb-1">Staged Change</span>
                              <div 
                                className="text-xs text-emerald-400 font-semibold leading-relaxed whitespace-pre-wrap"
                                dangerouslySetInnerHTML={{ __html: ch.proposed_html || ch.proposed || ch.new_html || ch.new }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
