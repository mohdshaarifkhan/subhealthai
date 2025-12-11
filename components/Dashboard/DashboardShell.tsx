"use client";

import React, { useState } from 'react';
import { 
  LayoutGrid, TrendingUp, GitCommit, Database, Settings, 
  LogOut, MessageSquare, FileDown
} from 'lucide-react';

type DashboardShellProps = {
  activePage: string;
  setActivePage: (page: string) => void;
  isLoggingOut: boolean;
  isRealUser: boolean;
  serverEmail?: string | null;
  onLogout: () => void;
  onToggleCopilot: () => void;
  userId?: string | null;
  userMode?: 'healthy' | 'risk' | 'demo-healthy' | 'demo-risk' | null;
  version?: string;
  children: React.ReactNode;
};

const ENGINE_VERSION = "phase3-v1-wes";

export function DashboardShell({
  activePage,
  setActivePage,
  isLoggingOut,
  isRealUser,
  serverEmail,
  onLogout,
  onToggleCopilot,
  userId,
  userMode,
  version = ENGINE_VERSION,
  children,
}: DashboardShellProps) {
  const navItems = [
    { id: 'dashboard', icon: LayoutGrid, label: 'Dashboard' },
    { id: 'insights', icon: TrendingUp, label: 'Insights' },
    { id: 'shap', icon: GitCommit, label: 'Causal Drivers' },
    { id: 'evidence', icon: Database, label: 'Evidence' },
    { id: 'settings', icon: Settings, label: 'Data Sources' },
  ];

  const displayEmail = serverEmail || (userMode === 'demo-healthy' ? 'Healthy User' : userMode === 'demo-risk' ? 'Volatile User' : 'User');

  return (
    <div className="h-screen w-full bg-[#02040a] text-slate-300 flex overflow-hidden font-sans">
      <div className="fixed inset-0 pointer-events-none z-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5"></div>
      
      {/* Sidebar - Narrow icon-only */}
      <div className="w-20 h-full border-r border-white/5 bg-[#02040a]/80 backdrop-blur-xl flex flex-col items-center py-8 z-50 hidden md:flex">
        <div className="mb-10">
          <div className="w-10 h-10 rounded bg-slate-900 border border-white/10 flex items-center justify-center">
            <span className="font-['Unbounded'] font-bold text-cyan-400">S</span>
          </div>
        </div>
        <div className="flex flex-col gap-6 flex-1 w-full items-center">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={`p-3 rounded-xl transition-all duration-300 group relative ${activePage === item.id ? 'bg-slate-900 text-cyan-400 border border-white/10 shadow-[0_0_15px_rgba(34,211,238,0.15)]' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900/50'}`}
            >
              <item.icon size={20} strokeWidth={1.5} />
              <div className="absolute left-16 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-900 border border-white/10 text-slate-300 text-[10px] font-['Unbounded'] uppercase rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                {item.label}
              </div>
            </button>
          ))}
        </div>
        <div className="mt-auto">
          <button 
            onClick={onLogout} 
            disabled={isLoggingOut}
            className="p-3 rounded hover:bg-slate-900 text-slate-600 hover:text-rose-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative z-10">
        {/* Top Bar */}
        <div className="w-full border-b border-white/5 bg-[#02040a]/80 backdrop-blur-md flex items-center justify-between px-8" style={{ paddingTop: '24px', paddingBottom: '16px' }}>
          <div className="flex flex-col text-left">
            <h1 className="text-[26px] font-['Unbounded'] font-bold text-[#F5F7FA] tracking-[0.03em] uppercase leading-none mb-0.5">
              {navItems.find(i => i.id === activePage)?.label}
            </h1>
            <div className="flex flex-col gap-0">
              <span className="text-[11px] font-mono font-medium text-slate-400 tracking-[0.08em] uppercase leading-tight">
                SUBCLINICAL INTELLIGENCE ENGINE V1.0
              </span>
              {!isRealUser ? (
                <span className="text-[11px] font-mono font-medium text-amber-400/80 tracking-[0.08em] uppercase leading-tight">
                  DEMO ENVIRONMENT · SYNTHETIC DATA · NON-DIAGNOSTIC PROTOTYPE
                </span>
              ) : (
                <span className="text-[11px] font-mono font-medium text-cyan-400/80 tracking-[0.08em] uppercase leading-tight">
                  EARLY ACCESS · YOUR OWN DATA · NON-DIAGNOSTIC PROTOTYPE
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-6">
            {userId && (userId === 'demo-healthy' || userId === 'demo-risk' || /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)) && (
              <a
                href={`/api/report?user=${userId}&version=${version}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  // Prevent uncaught errors if the link fails
                  e.preventDefault();
                  const url = `/api/report?user=${userId}&version=${version}`;
                  const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
                  if (!newWindow) {
                    // Popup was blocked or failed to open
                    console.warn('Failed to open PDF export window');
                  }
                }}
                className="px-4 py-2 bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 text-xs font-semibold rounded flex items-center gap-2 hover:bg-cyan-500/30 hover:border-cyan-500/60 hover:text-cyan-300 transition-all font-mono"
              >
                <FileDown size={14} className="text-cyan-400" />
                Export PDF
              </a>
            )}
            <button 
              onClick={onToggleCopilot} 
              className="px-4 py-2 bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 text-xs font-semibold rounded flex items-center gap-2 hover:bg-cyan-500/30 hover:border-cyan-500/60 hover:text-cyan-300 transition-all font-mono"
            >
              <MessageSquare size={14} className="text-cyan-400" />
              Ask Copilot
            </button>
          </div>
        </div>

        {/* Page Content Scrollable */}
        <div className="flex-1 overflow-y-auto px-6 lg:px-8 pt-8 pb-24" style={{ paddingTop: '32px' }}>
          {children}
        </div>
      </main>
    </div>
  );
}
