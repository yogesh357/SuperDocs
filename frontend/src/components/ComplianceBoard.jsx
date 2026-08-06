import React from 'react';
import { ShieldAlert } from 'lucide-react';

export default function ComplianceBoard({ findings, resolveFinding }) {
  if (findings.length === 0) return null;

  return (
    <div className="bg-cardbg border border-accentPurple/40 rounded-xl p-6 shadow-md">
      <h3 className="font-display text-sm font-semibold flex items-center gap-2 text-accentPurple mb-2">
        <ShieldAlert size={18} /> Human Gate Required: Compliance Flag Approvals
      </h3>
      <p className="text-xs text-gray-400 mb-5">
        The playbooks rules checks flagged the following non-compliance items. Review and decide to approve exceptions or reject:
      </p>

      <div className="flex flex-col gap-3">
        {findings.map(find => (
          <div key={find.id} className="flex flex-col md:flex-row md:items-start justify-between p-4 rounded-lg bg-secondary border border-borderDark gap-4">
            <div className="flex-1 flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-white">{find.rule_name}</span>
                <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-bold border ${
                  find.status === 'passed' ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400' :
                  'bg-red-950/20 border-red-500/30 text-red-400'
                }`}>
                  {find.status}
                </span>
              </div>
              <p className="text-xs text-gray-500">{find.rule_description}</p>
              <p className="text-xs text-red-400 font-medium mt-1">{find.details}</p>
              {find.citation && (
                <div className="text-[10px] text-accentPurple font-medium mt-1">Source Reference: {find.citation}</div>
              )}
            </div>
            
            {find.status === 'flagged' && (
              <div className="flex gap-2 self-end md:self-start">
                <button 
                  className="px-3 py-1.5 rounded text-xs font-semibold bg-red-600 text-white hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => resolveFinding(find.id, 'rejected')}
                  disabled={find.decision !== 'pending'}
                >
                  Reject Exemption
                </button>
                <button 
                  className="px-3 py-1.5 rounded text-xs font-semibold bg-accentPurple text-white hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => resolveFinding(find.id, 'approved')}
                  disabled={find.decision !== 'pending'}
                >
                  Approve Exception
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
