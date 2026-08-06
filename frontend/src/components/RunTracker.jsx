import React from 'react';
import { Activity, Coins, Cpu, Clock, Check } from 'lucide-react';

export default function RunTracker({ activeRun, getStageStatus }) {
  if (!activeRun) return null;

  return (
    <div className="bg-cardbg border border-borderDark rounded-xl p-6 shadow-md">
      <div className="flex justify-between items-center">
        <h3 className="font-display text-sm font-semibold flex items-center gap-2 text-white">
          <Activity size={16} className="text-accentGold" /> 
          Active Audit Run
        </h3>
        <span className={`text-xs px-2 py-0.5 rounded font-bold border ${
          activeRun.status === 'paused' ? 'bg-amber-950/20 border-amber-500/30 text-amber-400' :
          activeRun.status === 'running' ? 'bg-sky-950/20 border-sky-500/30 text-sky-400' :
          activeRun.status === 'failed' ? 'bg-red-950/20 border-red-500/30 text-red-400' :
          'bg-emerald-950/20 border-emerald-500/30 text-emerald-400'
        }`}>
          Status: {activeRun.status.toUpperCase()}
        </span>
      </div>

      {/* Progress steps */}
      <div className="flex items-center justify-between mt-6 py-4 relative">
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-borderDark z-0 -translate-y-1/2"></div>
        {[
          { name: 'Document Classification', label: '1. Classify' },
          { name: 'Fact Extraction', label: '2. Extract' },
          { name: 'Conflict Auditing', label: '3. Conflicts' },
          { name: 'Compliance Audit', label: '4. Rules' },
          { name: 'Report Compilation', label: '5. Compile' }
        ].map((step, idx) => {
          const status = getStageStatus(step.name);
          const isActive = status === 'running' || status === 'paused';
          const isCompleted = status === 'completed';
          const isFailed = status === 'failed';
          
          return (
            <div key={idx} className="flex flex-col items-center gap-2 relative z-10 w-1/5">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition border-2 ${
                isCompleted ? 'bg-successGreen border-successGreen text-black' :
                isFailed ? 'bg-red-500 border-red-500 text-white' :
                isActive ? 'bg-accentGold border-accentGold text-black shadow-[0_0_10px_rgba(255,184,0,0.5)]' :
                'bg-cardbg border-borderDark text-gray-500'
              }`}>
                {isCompleted ? <Check size={12} /> : idx + 1}
              </div>
              <span className={`text-[10px] font-semibold ${
                isActive ? 'text-accentGold' :
                isCompleted ? 'text-white' :
                'text-gray-400'
              }`}>{step.label}</span>
            </div>
          );
        })}
      </div>

      {/* Cost & Analytics */}
      <div className="grid grid-cols-3 gap-4 mt-6">
        <div className="bg-borderDark/20 border border-borderDark/40 rounded-lg p-3 text-center">
          <div className="text-xl font-bold text-accentGold font-display">${activeRun.cost_usd.toFixed(5)}</div>
          <div className="text-[10px] text-gray-500 uppercase mt-1 flex items-center justify-center gap-1">
            <Coins size={10} /> Token Cost
          </div>
        </div>
        <div className="bg-borderDark/20 border border-borderDark/40 rounded-lg p-3 text-center">
          <div className="text-xl font-bold text-accentGold font-display">{activeRun.stages.length} / 5</div>
          <div className="text-[10px] text-gray-500 uppercase mt-1 flex items-center justify-center gap-1">
            <Cpu size={10} /> Stages
          </div>
        </div>
        <div className="bg-borderDark/20 border border-borderDark/40 rounded-lg p-3 text-center">
          <div className="text-xl font-bold text-accentGold font-display">
            {activeRun.stages.reduce((acc, s) => acc + s.latency, 0).toFixed(1)}s
          </div>
          <div className="text-[10px] text-gray-500 uppercase mt-1 flex items-center justify-center gap-1">
            <Clock size={10} /> Duration
          </div>
        </div>
      </div>

      {/* Console Logs */}
      <div className="mt-6">
        <h4 className="text-xs text-gray-400 mb-2 font-semibold">Real-time Audit Logs</h4>
        <div className="bg-black/80 border border-borderDark rounded-lg p-4 font-mono text-xs text-sky-400 h-44 overflow-y-auto flex flex-col gap-1.5">
          {activeRun.logs.map((log, idx) => (
            <div key={idx} className="border-b border-borderDark/20 pb-1">&gt; {log}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
