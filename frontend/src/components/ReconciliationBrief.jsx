import React from 'react';
import { FileCheck } from 'lucide-react';

export default function ReconciliationBrief({ deliverable, formatMarkdown }) {
  if (!deliverable) return null;

  return (
    <div className="bg-cardbg border border-borderDark border-l-4 border-l-accentGold rounded-xl p-6 shadow-md">
      <h3 className="font-display text-sm font-semibold flex items-center gap-2 text-white mb-4">
        <FileCheck size={18} className="text-accentGold" />
        Unified Reconciliation Brief (Grounded Report)
      </h3>
      
      <div 
        className="deliverable-preview bg-secondary border border-borderDark rounded-lg p-6 text-sm leading-relaxed text-gray-200 max-h-[500px] overflow-y-auto"
        dangerouslySetInnerHTML={{ __html: formatMarkdown(deliverable.content_markdown) }} 
      />
      
      <div className="mt-4 flex justify-between items-center gap-4">
        <span className="text-xs text-gray-500">
          Traced with {deliverable.citations?.length || 0} precise citations to contract sources
        </span>
        <button 
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded text-xs font-semibold bg-borderDark text-white border border-borderDark hover:border-border-hover hover:bg-cardbg transition"
          onClick={() => {
            navigator.clipboard.writeText(deliverable.content_markdown);
            alert("Markdown copied to clipboard!");
          }}
        >
          Copy Markdown
        </button>
      </div>
    </div>
  );
}
