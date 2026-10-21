import React from 'react';
import { AlertTriangle, Cpu, Network, Check, X, ShieldX } from 'lucide-react';

export const ProblemSection: React.FC = () => {
  const gaps = [
    {
      id: 'gap1',
      title: 'Gap 1: Shortcut Memorization in In-Domain NIDS',
      badge: 'ML Generalization',
      icon: <Network className="w-5 h-5 text-red-400" />,
      description:
        'Standard NIDS benchmarks boast >99% in-domain accuracy by inadvertently learning spurious shortcuts: environment-specific IP ranges, server port numbers, and capture timing artifacts. When deployed to unseen networks, performance catastrophically collapses.',
    },
    {
      id: 'gap2',
      title: 'Gap 2: Unstudied Quantization Impact on Shortcut Learning',
      badge: 'Edge TinyML',
      icon: <Cpu className="w-5 h-5 text-amber-400" />,
      description:
        'Edge microcontrollers require aggressive INT8 post-training quantization. Prior literature assumes quantization only causes minor accuracy degradation. No benchmark has tested whether low-precision representations worsen or regularize shortcut reliance under cross-domain transfer.',
    },
    {
      id: 'gap3',
      title: 'Gap 3: Disconnect Between Silicon Feasibility & Robustness',
      badge: 'System Realism',
      icon: <AlertTriangle className="w-5 h-5 text-cyan-400" />,
      description:
        'Embedded security works measure microcontroller cycles and SRAM without testing real domain drift, while adversarial ML research tests domain generalization on power-hungry cloud GPUs. ZeroEdge-NIDS bridges this gap with software-simulated hardware-in-the-loop benchmarking.',
    },
  ];

  return (
    <section className="py-16 border-b border-[#141f30] bg-[#06090e]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider font-semibold">
            Motivation & Problem Statement
          </span>
          <h2 className="mt-2 text-2xl sm:text-4xl font-extrabold text-white">
            Why ZeroEdge-NIDS? The 3 Critical Research Gaps
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-400">
            Network intrusion detection on microcontrollers fails when laboratory evaluations ignore cross-domain transfer and quantization dynamics.
          </p>
        </div>

        {/* 3 Gap Cards */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          {gaps.map((gap) => (
            <div
              key={gap.id}
              className="p-6 rounded-xl bg-[#0b121d] border border-[#1a273b] hover:border-cyan-500/30 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 rounded-lg bg-[#111c2e] border border-[#1a273b]">{gap.icon}</div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300">
                    {gap.badge}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white mb-2">{gap.title}</h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">{gap.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Gap-Analysis Comparison Table */}
        <div className="mt-16">
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-white">Gap Analysis: Comparative Paradigm Matrix</h3>
            <p className="text-xs text-slate-400 mt-1">
              Comparing conventional NIDS approaches against our proposed edge simulation paradigm.
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#1a273b] bg-[#0b121d]">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-[#1a273b] bg-[#0e1726] font-mono text-slate-300">
                  <th className="p-4">Evaluation Dimension</th>
                  <th className="p-4 text-slate-400">Traditional AI Security</th>
                  <th className="p-4 text-slate-400">Edge AI Benchmarks</th>
                  <th className="p-4 text-cyan-400 bg-cyan-950/20">Proposed ZeroEdge-NIDS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#141f30] text-slate-300 font-sans">
                <tr>
                  <td className="p-4 font-semibold text-white">Deployment Target</td>
                  <td className="p-4">Cloud Server / High-End GPU</td>
                  <td className="p-4">Cortex-M / MCU (In-Domain only)</td>
                  <td className="p-4 bg-cyan-950/10 text-cyan-300 font-medium">Software-Simulated ESP32 (Xtensa LX6)</td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-white">Domain Generalization</td>
                  <td className="p-4 text-red-400 flex items-center gap-1.5">
                    <X className="w-4 h-4 shrink-0" /> Evaluated on same capture
                  </td>
                  <td className="p-4 text-red-400">
                    <span className="flex items-center gap-1.5"><X className="w-4 h-4 shrink-0" /> In-domain holdout only</span>
                  </td>
                  <td className="p-4 bg-cyan-950/10 text-emerald-400 font-medium">
                    <span className="flex items-center gap-1.5"><Check className="w-4 h-4 shrink-0" /> Zero-shot cross-dataset (UNSW)</span>
                  </td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-white">Feature Sanitization</td>
                  <td className="p-4 text-amber-400">Keeps ports & IP artifacts</td>
                  <td className="p-4 text-amber-400">Keeps dataset artifacts</td>
                  <td className="p-4 bg-cyan-950/10 text-emerald-400 font-medium">
                    <span className="flex items-center gap-1.5"><Check className="w-4 h-4 shrink-0" /> 16 harmonized flow statistics</span>
                  </td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-white">Quantization Analysis</td>
                  <td className="p-4">Ignored (FP32 precision)</td>
                  <td className="p-4">Reported only for SRAM/latency</td>
                  <td className="p-4 bg-cyan-950/10 text-emerald-400 font-medium">
                    <span className="flex items-center gap-1.5"><Check className="w-4 h-4 shrink-0" /> Integer-only PTQ vs Shortcut Collapse</span>
                  </td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-white">Empirical Profiling</td>
                  <td className="p-4">N/A</td>
                  <td className="p-4">Simulated synthetic values</td>
                  <td className="p-4 bg-cyan-950/10 text-cyan-300 font-medium">
                    Host measured (perf_counter_ns) + Analytical ESP32
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
};
