import React from 'react';
import { Layers, Database, Cpu, Activity, ArrowRight, ShieldCheck, HardDrive } from 'lucide-react';

export const ArchitectureSection: React.FC = () => {
  return (
    <section className="py-16 border-b border-[#141f30] bg-[#080d14]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider font-semibold">
            System Architecture
          </span>
          <h2 className="mt-2 text-2xl sm:text-4xl font-extrabold text-white">
            The 3-Layer ZeroEdge-NIDS Architecture
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-400">
            A software-simulated end-to-end pipeline connecting source data curation, integer-only TinyML quantization, and real-time hardware-in-the-loop telemetry.
          </p>
        </div>

        {/* 3 Main Layers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Layer 1 */}
          <div className="p-6 rounded-xl bg-[#0b121d] border border-[#1a273b] hover:border-cyan-500/40 transition-colors flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="px-2.5 py-1 rounded bg-cyan-500/10 text-cyan-400 font-mono text-xs font-bold border border-cyan-500/30">
                  LAYER 1
                </span>
                <Database className="w-5 h-5 text-cyan-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Zero-Shot ML Pipeline</h3>
              <p className="text-xs text-slate-300 mb-4 leading-relaxed">
                Trained on source dataset (CIC-IDS-2017) and tested cross-domain on unseen target dataset (UNSW-NB15) with zero retraining or fine-tuning.
              </p>
              <ul className="space-y-2 text-xs font-mono text-slate-400">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                  16 Harmonized Network Flow Features
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                  MinMax Scaler Fitted ONLY on Source
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                  Permutation Feature Importance Probe
                </li>
              </ul>
            </div>
            <div className="mt-6 pt-4 border-t border-[#141f30] text-[11px] font-mono text-cyan-400">
              Badge: <span className="text-slate-300">Computed from Real Data</span>
            </div>
          </div>

          {/* Layer 2 */}
          <div className="p-6 rounded-xl bg-[#0b121d] border border-[#1a273b] hover:border-purple-500/40 transition-colors flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="px-2.5 py-1 rounded bg-purple-500/10 text-purple-400 font-mono text-xs font-bold border border-purple-500/30">
                  LAYER 2
                </span>
                <Cpu className="w-5 h-5 text-purple-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">TinyML Quantized Profiling</h3>
              <p className="text-xs text-slate-300 mb-4 leading-relaxed">
                Post-Training Quantization (PTQ) to INT8 with integer-only arithmetic, evaluated on host CPU and projected onto virtual microcontroller silicon.
              </p>
              <ul className="space-y-2 text-xs font-mono text-slate-400">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                  NumPy Integer-Only INT8 PTQ
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                  Host Benchmarking (perf_counter_ns)
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                  ESP32 Cycle & SRAM Tensor Arena Model
                </li>
              </ul>
            </div>
            <div className="mt-6 pt-4 border-t border-[#141f30] text-[11px] font-mono text-purple-400">
              Badge: <span className="text-slate-300">Host Measured + ESP32 Projected</span>
            </div>
          </div>

          {/* Layer 3 */}
          <div className="p-6 rounded-xl bg-[#0b121d] border border-[#1a273b] hover:border-emerald-500/40 transition-colors flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 font-mono text-xs font-bold border border-emerald-500/30">
                  LAYER 3
                </span>
                <Activity className="w-5 h-5 text-emerald-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Live HIL Bench Simulator</h3>
              <p className="text-xs text-slate-300 mb-4 leading-relaxed">
                Full telemetry bench streaming real network flows across simulated UART to virtual ESP32 with oscilloscope power monitor and browser validation.
              </p>
              <ul className="space-y-2 text-xs font-mono text-slate-400">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  Virtual UART (921,600 baud, 8N1)
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  Virtual INA219 Current/Power Waveform
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  Browser Web Worker Bit-Exact Verification
                </li>
              </ul>
            </div>
            <div className="mt-6 pt-4 border-t border-[#141f30] text-[11px] font-mono text-emerald-400">
              Badge: <span className="text-slate-300">Simulated Edge Telemetry</span>
            </div>
          </div>
        </div>

        {/* Animated Dataflow Schematic */}
        <div className="mt-12 p-6 rounded-xl bg-[#0b121d] border border-[#1a273b]">
          <div className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-4">
            End-to-End Data & Telemetry Flow:
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-center text-center font-mono text-xs">
            {/* Box 1 */}
            <div className="p-3 rounded-lg bg-[#111a28] border border-[#1a273b]">
              <div className="text-white font-bold">FastAPI Server</div>
              <div className="text-[10px] text-slate-400">Loads UNSW stream</div>
              <div className="mt-1 text-[10px] text-cyan-400 font-semibold">Real Server Inference</div>
            </div>
            <div className="hidden sm:flex justify-center text-cyan-400">
              <ArrowRight className="w-5 h-5 animate-pulse" />
            </div>

            {/* Box 2 */}
            <div className="p-3 rounded-lg bg-[#111a28] border border-[#1a273b]">
              <div className="text-white font-bold">Virtual UART</div>
              <div className="text-[10px] text-slate-400">921,600 baud, 8N1</div>
              <div className="mt-1 text-[10px] text-amber-400 font-semibold">Simulated Link</div>
            </div>
            <div className="hidden sm:flex justify-center text-cyan-400">
              <ArrowRight className="w-5 h-5 animate-pulse" />
            </div>

            {/* Box 3 */}
            <div className="p-3 rounded-lg bg-[#111a28] border border-[#1a273b]">
              <div className="text-white font-bold">Virtual ESP32</div>
              <div className="text-[10px] text-slate-400">Xtensa LX6 @ 240 MHz</div>
              <div className="mt-1 text-[10px] text-purple-400 font-semibold">Simulated MCU</div>
            </div>
            <div className="hidden sm:flex justify-center text-cyan-400">
              <ArrowRight className="w-5 h-5 animate-pulse" />
            </div>

            {/* Box 4 */}
            <div className="p-3 rounded-lg bg-[#111a28] border border-[#1a273b]">
              <div className="text-white font-bold">Virtual INA219</div>
              <div className="text-[10px] text-slate-400">3.3V, 45mA baseline</div>
              <div className="mt-1 text-[10px] text-emerald-400 font-semibold">Simulated Sensor</div>
            </div>
            <div className="hidden sm:flex justify-center text-cyan-400">
              <ArrowRight className="w-5 h-5 animate-pulse" />
            </div>

            {/* Box 5 */}
            <div className="p-3 rounded-lg bg-[#111a28] border border-[#1a273b]">
              <div className="text-white font-bold">Browser Worker</div>
              <div className="text-[10px] text-slate-400">Client-side INT8 engine</div>
              <div className="mt-1 text-[10px] text-cyan-400 font-semibold">Bit-Exact Check</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
