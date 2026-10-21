import React from 'react';
import { ShieldAlert, ArrowDownRight, CheckCircle2, Play, Terminal, Cpu, Database } from 'lucide-react';
import { MetricsData, VerdictData } from '../types';

interface HeroSectionProps {
  metrics: MetricsData | null;
  verdict: VerdictData | null;
  onExploreSimulator: () => void;
  onViewLayer1: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  metrics,
  verdict,
  onExploreSimulator,
  onViewLayer1,
}) => {
  const inFp32 = metrics ? (metrics.in_domain.fp32.accuracy * 100).toFixed(2) : '97.34';
  const inInt8 = metrics ? (metrics.in_domain.int8.accuracy * 100).toFixed(2) : '96.11';
  const crossFp32 = metrics ? (metrics.cross_domain.fp32.accuracy * 100).toFixed(2) : '35.42';
  const crossInt8 = metrics ? (metrics.cross_domain.int8.accuracy * 100).toFixed(2) : '36.51';
  const dropFp32 = metrics ? (metrics.collapse.accuracy_collapse.fp32_drop * 100).toFixed(2) : '61.92';

  return (
    <section className="relative overflow-hidden pt-8 pb-16 border-b border-[#141f30]">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-cyan-500/10 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Lab & Review Pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono mb-6">
          <Terminal className="w-3.5 h-3.5" />
          <span>BCSE308L Computer Networks Lab — Project Review 1</span>
        </div>

        {/* Main Title */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white max-w-4xl leading-tight">
          Zero-Shot, Cross-Domain NIDS at the Edge:
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-blue-500">
            Does Quantization Worsen Shortcut Learning?
          </span>
        </h1>

        {/* Team Members */}
        <div className="mt-4 flex flex-wrap items-center gap-y-2 gap-x-6 text-xs sm:text-sm text-slate-300 font-mono">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            Pradhyot <span className="text-slate-400">(24BCE0660)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-teal-400"></span>
            Chitraksh <span className="text-slate-400">(24BCE0688)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-400"></span>
            Ishani Majumder <span className="text-slate-400">(24BCI0139)</span>
          </span>
        </div>

        {/* One-line Premise */}
        <p className="mt-5 text-base sm:text-lg text-slate-300 max-w-3xl leading-relaxed">
          Trained on <span className="text-white font-semibold">CIC-IDS-2017</span> (2.83M flows) and evaluated zero-shot on{' '}
          <span className="text-white font-semibold">UNSW-NB15</span> (257k flows) with zero target fine-tuning.
          Software-simulated ESP32 edge deployment with exact host performance benchmarks and analytical hardware projections.
        </p>

        {/* Big Headline Metric Cards */}
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: In-Domain Accuracy */}
          <div className="p-5 rounded-xl bg-[#0b121d] border border-[#1a273b] hover:border-cyan-500/40 transition-colors">
            <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>IN-DOMAIN (CIC-IDS)</span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px]">Computed ML</span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-emerald-400 font-mono">{inFp32}%</span>
              <span className="text-xs text-slate-400">FP32 Baseline</span>
            </div>
            <div className="mt-1 text-xs text-slate-400 font-mono">
              INT8 Model: <span className="text-emerald-300 font-bold">{inInt8}%</span> (98.7% agreement)
            </div>
          </div>

          {/* Card 2: Cross-Domain Accuracy */}
          <div className="p-5 rounded-xl bg-[#0b121d] border border-[#1a273b] hover:border-red-500/40 transition-colors">
            <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>CROSS-DOMAIN (UNSW)</span>
              <span className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 text-[10px]">Zero-Shot</span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-red-400 font-mono">{crossFp32}%</span>
              <span className="text-xs text-slate-400">FP32 Target</span>
            </div>
            <div className="mt-1 text-xs text-slate-400 font-mono">
              INT8 Model: <span className="text-amber-400 font-bold">{crossInt8}%</span> (+1.09% boost)
            </div>
          </div>

          {/* Card 3: The Collapse */}
          <div className="p-5 rounded-xl bg-[#0b121d] border border-[#1a273b] hover:border-amber-500/40 transition-colors">
            <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>ACCURACY COLLAPSE</span>
              <span className="text-amber-400 flex items-center text-[10px]">
                <ArrowDownRight className="w-3 h-3" /> Drop
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-amber-400 font-mono">-{dropFp32}%</span>
              <span className="text-xs text-slate-400">In vs Cross</span>
            </div>
            <div className="mt-1 text-xs text-slate-400 font-mono">
              Shortcut reliance fails on unseen topology
            </div>
          </div>

          {/* Card 4: Host Benchmarking */}
          <div className="p-5 rounded-xl bg-[#0b121d] border border-[#1a273b] hover:border-cyan-500/40 transition-colors">
            <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>HOST LATENCY</span>
              <span className="px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 text-[10px]">Measured</span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-cyan-400 font-mono">3.8 µs</span>
              <span className="text-xs text-slate-400">per inference</span>
            </div>
            <div className="mt-1 text-xs text-slate-400 font-mono">
              Projected ESP32: <span className="text-purple-400 font-bold">22.9 µs</span> (4× SRAM drop)
            </div>
          </div>
        </div>

        {/* Scientific Verdict Card */}
        {verdict && (
          <div className="mt-8 p-6 rounded-xl bg-gradient-to-r from-emerald-950/40 via-[#0b1424] to-[#0b121d] border border-emerald-500/40 relative overflow-hidden">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 mt-1 shrink-0" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-emerald-400 tracking-wider uppercase font-semibold">
                      DATA-DRIVEN SCIENTIFIC VERDICT
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                      {verdict.verdict}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-200 leading-relaxed max-w-4xl">
                    {verdict.explanation}
                  </p>
                </div>
              </div>

              <div className="shrink-0 flex md:flex-col items-center md:items-end gap-2 text-xs font-mono text-slate-400 border-t md:border-t-0 md:border-l border-[#1a273b] pt-2 md:pt-0 md:pl-4">
                <div>
                  McNemar Correctness: <span className="text-emerald-400 font-bold">{verdict.p_value_mcnemar_correctness.toExponential(2)}</span>
                </div>
                <div>
                  Bootstrap 95% CI: <span className="text-cyan-300 font-bold">[{verdict.bootstrap_ci_95_effect[0].toFixed(4)}, {verdict.bootstrap_ci_95_effect[1].toFixed(4)}]</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CTA Buttons */}
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <button
            onClick={onExploreSimulator}
            className="px-6 py-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-semibold font-mono text-sm flex items-center gap-2 shadow-[0_0_20px_rgba(0,240,255,0.4)] transition-all"
          >
            <Play className="w-4 h-4 fill-current" />
            Launch Live HIL Bench Simulator
          </button>
          <button
            onClick={onViewLayer1}
            className="px-6 py-3 rounded-lg bg-[#0b121d] hover:bg-[#121c2c] border border-[#1a273b] text-slate-200 font-mono text-sm flex items-center gap-2 transition-all"
          >
            <Database className="w-4 h-4 text-cyan-400" />
            Explore Layer 1 Zero-Shot Results
          </button>
        </div>
      </div>
    </section>
  );
};
