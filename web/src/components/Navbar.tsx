import React from 'react';
import { Cpu, ShieldCheck, Activity, Wifi, WifiOff } from 'lucide-react';

interface NavbarProps {
  backendOnline: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ backendOnline, activeTab, setActiveTab }) => {
  const navItems = [
    { id: 'overview', label: 'Overview' },
    { id: 'problem', label: 'Problem & Gaps' },
    { id: 'architecture', label: 'Architecture' },
    { id: 'data', label: 'Data & Drift' },
    { id: 'layer1', label: 'Layer 1: Zero-Shot' },
    { id: 'layer2', label: 'Layer 2: Profiling' },
    { id: 'layer3', label: 'Layer 3: HIL Simulator' },
    { id: 'experiment-lab', label: 'Interactive Experiment Lab' },
    { id: 'stats', label: 'Statistics & Verdict' },
    { id: 'literature', label: 'Literature Review' },
    { id: 'methodology', label: 'Methodology' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#06090e]/90 backdrop-blur-md border-b border-[#1a273b]">
      {/* Top Banner Badges */}
      <div className="bg-[#0b121d] px-4 py-1.5 border-b border-[#141f30] text-xs flex flex-wrap items-center justify-between gap-2 font-mono">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
            SIMULATION — No Physical Hardware
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
            Measured on Host (time.perf_counter_ns)
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/30">
            ESP32 Analytical Projection
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-slate-400 hidden sm:inline">BCSE308L | Project Review 1</span>
          {backendOnline ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              FastAPI: Online (:8000)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse font-semibold">
              <WifiOff className="w-3.5 h-3.5" />
              FastAPI Offline
            </span>
          )}
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('overview')}>
          <div className="w-8 h-8 rounded bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-black font-bold font-mono">
            ZE
          </div>
          <div>
            <div className="font-bold tracking-tight text-white flex items-center gap-2">
              ZeroEdge-NIDS
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                v1.0
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono">ESP32 Software-Emulated Edge Platform</div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden lg:flex items-center gap-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === item.id
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_10px_rgba(0,240,255,0.2)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Mobile Horizontal Scroll Nav */}
      <div className="lg:hidden px-4 py-2 flex gap-1 overflow-x-auto border-t border-[#141f30]">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`whitespace-nowrap px-2.5 py-1 text-xs rounded transition-colors ${
              activeTab === item.id
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:bg-slate-800/40'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </header>
  );
};
