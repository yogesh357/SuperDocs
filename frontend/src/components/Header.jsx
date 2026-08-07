import React from 'react';
import { Cpu } from 'lucide-react';

export default function Header({ backendStatus, activeTab, setActiveTab }) {
  return (
    <header className="flex justify-between items-center px-8 py-5 bg-secondary border-b border-borderDark">
      <div className="flex items-center gap-3">
        <Cpu className="text-accentGold w-7 h-7" />
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight bg-gradient-to-r from-white to-accentGold bg-clip-text text-transparent">
            SuperDocs Analyst
          </h1>
          <p className="text-[10px] text-gray-500">The Analyst That Never Sleeps</p>
        </div>
      </div>
      
      {/* Navigation Tabs */}
      <div className="flex bg-cardbg p-1 rounded-xl border border-borderDark">
        <button
          onClick={() => setActiveTab('compliance')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'compliance'
              ? 'bg-accentGold text-secondary shadow-md'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Compliance Auditor
        </button>
        <button
          onClick={() => setActiveTab('substitution')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'substitution'
              ? 'bg-accentGold text-secondary shadow-md'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          AEC Substitution
        </button>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-950/30 border border-emerald-500/30 text-emerald-400">
          <span className={`w-2 h-2 rounded-full ${backendStatus === 'connected' ? 'bg-successGreen status-pulse-anim shadow-[0_0_8px_#00F090]' : 'bg-red-500'}`}></span>
          {backendStatus === 'connected' ? 'Agent Node: Connected' : 'Agent Node: Offline'}
        </div>
      </div>
    </header>
  );
}
