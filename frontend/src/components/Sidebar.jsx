import React from 'react';
import { Upload, FileText, Play, FileCheck } from 'lucide-react';

export default function Sidebar({
  documents,
  isUploading,
  fileInputRef,
  handleDragOver,
  handleDrop,
  handleFileChange,
  startAudit,
  activeRunId
}) {
  return (
    <aside className="w-80 bg-secondary border-r border-borderDark p-6 flex flex-col gap-6 overflow-y-auto">
      {/* Document Upload */}
      <div className="bg-cardbg border border-borderDark rounded-xl p-6 shadow-md transition hover:border-border-hover">
        <h3 className="font-display text-sm font-semibold mb-4 text-white flex items-center gap-2">
          <Upload size={16} /> Ingest Pile
        </h3>
        <div 
          className="border-2 border-dashed border-borderDark rounded-lg p-6 text-center cursor-pointer transition bg-cardbg/30 hover:border-accentGold hover:bg-cardbg/50"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current.click()}
        >
          <FileText className="text-gray-500 w-8 h-8 mx-auto mb-3" />
          <p className="text-xs font-semibold">Drag files here</p>
          <p className="text-[10px] text-gray-500 mt-1">or click to browse</p>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={handleFileChange}
            accept=".pdf,.txt"
          />
        </div>
        {isUploading && (
          <p className="text-xs text-accentGold mt-2 text-center animate-pulse">
            Ingesting and calculating hash...
          </p>
        )}
      </div>

      {/* Ingested Documents List */}
      <div className="bg-cardbg border border-borderDark rounded-xl p-6 shadow-md flex-1 flex flex-col min-h-0">
        <h3 className="font-display text-sm font-semibold mb-4 text-white flex items-center gap-2">
          <FileText size={16} /> Document Library
        </h3>
        <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3">
          {documents.length === 0 ? (
            <p className="text-xs text-gray-500 text-center mt-4">
              No documents ingested. Upload contracts or invoices.
            </p>
          ) : (
            documents.map(doc => (
              <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg bg-borderDark/20 border border-borderDark/40">
                <div className="flex items-center gap-2 min-w-0">
                  <FileCheck size={14} className={doc.file_type !== 'unknown' ? 'text-accentGold' : 'text-gray-500'} />
                  <span className="text-xs font-medium truncate" title={doc.filename}>{doc.filename}</span>
                </div>
                <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-bold border ${
                  doc.file_type === 'contract' ? 'bg-indigo-950/20 border-indigo-500/30 text-indigo-400' :
                  doc.file_type === 'invoice' ? 'bg-sky-950/20 border-sky-500/30 text-sky-400' :
                  doc.file_type === 'amendment' ? 'bg-amber-950/20 border-amber-500/30 text-amber-400' :
                  'bg-gray-800 border-gray-700 text-gray-400'
                }`}>
                  {doc.file_type}
                </span>
              </div>
            ))
          )}
        </div>
        
        <button 
          className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold cursor-pointer transition bg-gradient-to-r from-accentGold to-accentGoldHover hover:scale-[1.01] hover:brightness-110 shadow-glow text-black disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          onClick={startAudit}
          disabled={documents.length === 0 || activeRunId !== null}
        >
          <Play size={14} /> Run Audit
        </button>
      </div>
    </aside>
  );
}
