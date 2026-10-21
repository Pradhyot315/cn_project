import React from 'react';
import {
  Activity,
  Database,
  Layers,
  Cpu,
  BarChart3,
  Wifi,
  WifiOff,
  AlertCircle,
  Menu,
  X,
  ShieldCheck,
  Sliders
} from 'lucide-react';

export type NavTabId =
  | 'dashboard'
  | 'dataset-processing'
  | 'model-eval'
  | 'quant-compare'
  | 'edge-simulation'
  | 'results';

interface SidebarProps {
  activeTab: NavTabId;
  setActiveTab: (tab: NavTabId) => void;
  backendOnline: boolean;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  backendOnline,
  mobileOpen,
  setMobileOpen
}) => {
  const navItems: { id: NavTabId; label: string; sub: string; icon: React.ReactNode; badge?: string }[] = [
    {
      id: 'dashboard',
      label: 'Implementation Overview',
      sub: 'Active Pipeline & Status',
      icon: <Activity className="w-4 h-4" />
    },
    {
      id: 'dataset-processing',
      label: '1. Dataset Processing',
      sub: 'CIC-IDS & UNSW Alignment',
      icon: <Database className="w-4 h-4" />
    },
    {
      id: 'model-eval',
      label: '2. Model Evaluation',
      sub: 'Zero-Shot & Class Recall',
      icon: <ShieldCheck className="w-4 h-4" />
    },
    {
      id: 'quant-compare',
      label: '3 & 4. FP32 vs INT8',
      sub: 'Generalization & Shortcuts',
      icon: <Layers className="w-4 h-4" />
    },
    {
      id: 'edge-simulation',
      label: '5. Online Edge Simulation',
      sub: 'Software Edge Inference',
      icon: <Cpu className="w-4 h-4" />,
      badge: 'Software'
    },
    {
      id: 'results',
      label: '6. Final Results',
      sub: 'Significance & CSV Report',
      icon: <BarChart3 className="w-4 h-4" />
    }
  ];

  return (
    <>
      {/* Mobile Top Header */}
      <div className="lg:hidden sticky top-0 z-50 bg-[#06090e] border-b border-[#1a273b] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-black font-bold font-mono text-xs">
            ZE
          </div>
          <div>
            <div className="font-bold text-white text-sm tracking-tight flex items-center gap-1.5">
              ZeroEdge-NIDS
              <span className="text-[10px] px-1 py-0.2 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono">
                Software
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-1.5 rounded-lg bg-[#0d1624] text-slate-300 hover:text-white border border-[#1a273b]"
          aria-label="Toggle Navigation"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Backdrop for Mobile */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main Sidebar (Desktop fixed left, Mobile drawer) */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-[#070c14] border-r border-[#1a273b] flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand / Logo Header */}
        <div className="p-5 border-b border-[#141f30]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-black font-bold font-mono text-sm shadow-[0_0_12px_rgba(0,240,255,0.3)]">
              ZE
            </div>
            <div>
              <div className="font-bold text-white tracking-tight text-sm flex items-center gap-1.5">
                ZeroEdge-NIDS
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 font-mono">
                  v1.0
                </span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                Software-Only Implementation
              </div>
            </div>
          </div>
        </div>

        {/* System Status Indicators (Strictly Software Only) */}
        <div className="px-4 py-3 bg-[#0a101b] border-b border-[#141f30] space-y-2 text-[11px] font-mono">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">FastAPI Engine:</span>
            {backendOnline ? (
              <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                <Wifi className="w-3 h-3 text-emerald-400" />
                Online (:8000)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-amber-400 font-medium">
                <WifiOff className="w-3 h-3 text-amber-400" />
                Offline
              </span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Protocol:</span>
            <span className="text-cyan-300 font-medium">
              Zero-Shot Cross-Domain
            </span>
          </div>
        </div>

        {/* Minimal Navigation Links */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-400">
            Experimental Workflow
          </div>
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileOpen(false);
                }}
                className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all flex items-center justify-between gap-2.5 ${
                  isActive
                    ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 shadow-[0_0_12px_rgba(0,240,255,0.15)] font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#0d1624] border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 truncate">
                  <span className={isActive ? 'text-cyan-400' : 'text-slate-400'}>
                    {item.icon}
                  </span>
                  <div className="truncate">
                    <span className="truncate block">{item.label}</span>
                    <span className="text-[10px] text-slate-400 font-mono block truncate font-normal">
                      {item.sub}
                    </span>
                  </div>
                </div>
                {item.badge && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#101b2b] text-cyan-400 border border-cyan-900 shrink-0">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer Meta */}
        <div className="p-4 border-t border-[#141f30] text-[11px] font-mono text-slate-400 space-y-1 bg-[#06090e]">
          <div className="flex items-center justify-between">
            <span>Model:</span>
            <span className="text-slate-300 font-semibold">16→32→16→1 MLP</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Quantization:</span>
            <span className="text-cyan-400 font-semibold">INT8 Integer-Only</span>
          </div>
          <div className="pt-2 text-[10px] text-slate-400 flex items-center gap-1 border-t border-[#141f30]/60">
            <AlertCircle className="w-3 h-3 text-cyan-500 shrink-0" />
            <span>Software Implementation Only</span>
          </div>
        </div>
      </aside>
    </>
  );
};
