import React from 'react';
import { AlertTriangle, Check, X } from 'lucide-react';

export default function ConflictResolver({ conflicts, resolveConflict }) {
  if (conflicts.length === 0) return null;

  return (
    <div className="bg-cardbg border border-accentGold/40 rounded-xl p-6 shadow-md">
      <h3 className="font-display text-sm font-semibold flex items-center gap-2 text-accentGold mb-2">
        <AlertTriangle size={18} /> Human Gate Required: Resolve Billing Conflicts
      </h3>
      <p className="text-xs text-gray-400 mb-5">
        The AI has detected billing or rate mismatches between incoming invoices and agreed contract terms. 
        You must approve or reject these override requests before execution can proceed.
      </p>

      <div className="flex flex-col gap-4">
        {conflicts.map(conf => (
          <div key={conf.id} className="border border-borderDark rounded-lg bg-secondary overflow-hidden">
            <div className="px-4 py-3 bg-borderDark/20 border-b border-borderDark flex justify-between items-center text-xs font-semibold">
              <span>{conf.conflict_description}</span>
              <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-bold border ${
                conf.decision === 'pending' ? 'bg-amber-950/20 border-amber-500/30 text-amber-400' :
                conf.decision === 'approved' ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400' :
                'bg-red-950/20 border-red-500/30 text-red-400'
              }`}>
                {conf.decision}
              </span>
            </div>
            
            <div className="grid grid-cols-2 p-4 gap-4 border-b border-borderDark">
              <div className="p-3 rounded border border-emerald-500/20 bg-emerald-950/5">
                <div className="text-[10px] text-gray-500 font-bold uppercase mb-1">Agreed (Contract)</div>
                <div className="text-base font-bold text-emerald-400 font-mono">{conf.expected_value}</div>
              </div>
              <div className="p-3 rounded border border-red-500/20 bg-red-950/5">
                <div className="text-[10px] text-gray-500 font-bold uppercase mb-1">Billed (Invoice)</div>
                <div className="text-base font-bold text-red-400 font-mono">{conf.actual_value}</div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 px-4 py-3 bg-black/20">
              <button 
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-borderDark text-white border border-borderDark hover:border-border-hover hover:bg-cardbg disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => resolveConflict(conf.id, 'rejected')}
                disabled={conf.decision !== 'pending'}
              >
                <X size={12} /> Reject Billing (Keep Contract Rate)
              </button>
              <button 
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-emerald-600 text-white hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => resolveConflict(conf.id, 'approved')}
                disabled={conf.decision !== 'pending'}
              >
                <Check size={12} /> Approve Billing (Accept Override)
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
